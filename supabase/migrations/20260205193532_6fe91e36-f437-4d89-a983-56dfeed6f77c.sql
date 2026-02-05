-- Create a trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username text;
  _display_name text;
  _is_admin boolean;
BEGIN
  -- Extract username and display_name from user metadata
  _username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  _display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', _username);
  _is_admin := lower(_username) = 'admin';
  
  -- Create profile
  INSERT INTO public.profiles (user_id, username, display_name, receives_notifications)
  VALUES (NEW.id, lower(_username), _display_name, _is_admin)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- If admin user, add admin role
  IF _is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();