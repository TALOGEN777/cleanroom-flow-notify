-- Update the RLS policy for rooms to allow operation_team full access
DROP POLICY IF EXISTS "Users with access can update room status" ON public.rooms;

CREATE POLICY "Users with access can update room status" 
ON public.rooms 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operation_team') OR
  (has_role(auth.uid(), 'operator') AND EXISTS (
    SELECT 1 FROM room_access ra WHERE ra.room_id = rooms.id AND ra.user_id = auth.uid()
  ))
);