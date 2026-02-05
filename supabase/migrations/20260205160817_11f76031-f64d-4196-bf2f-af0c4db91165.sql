-- Create enum for roles (if not exists)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing admins to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role
FROM public.profiles
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop dependent policies first
DROP POLICY IF EXISTS "Admins can manage room access" ON public.room_access;
DROP POLICY IF EXISTS "Users can view their own room access" ON public.room_access;
DROP POLICY IF EXISTS "Users with access can update room status" ON public.rooms;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Recreate policies using has_role function
CREATE POLICY "Admins can manage room access"
ON public.room_access
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own room access"
ON public.room_access
FOR SELECT
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users with access can update room status"
ON public.rooms
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM room_access ra 
    WHERE ra.room_id = rooms.id AND ra.user_id = auth.uid()
  ) 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create new restrictive policy on profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Now safely drop the is_admin column
ALTER TABLE public.profiles DROP COLUMN is_admin;