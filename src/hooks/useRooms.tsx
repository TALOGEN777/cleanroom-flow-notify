import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Room, RoomStatus, RoomAccess } from '@/lib/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useRooms() {
  const { user, isAdmin, userRole } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [accessibleRoomIds, setAccessibleRoomIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setLoading(false);
      return;
    }

    fetchRooms();
    fetchRoomAccess();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRooms(prev => 
              prev.map(room => 
                room.id === payload.new.id ? (payload.new as Room) : room
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_number');

    if (error) {
      console.error('Error fetching rooms:', error);
      return;
    }

    setRooms(data as Room[]);
    setLoading(false);
  };

  const fetchRoomAccess = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('room_access')
      .select('room_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching room access:', error);
      return;
    }

    setAccessibleRoomIds(data.map(ra => ra.room_id));
  };

  const updateRoomStatus = async (
    roomId: string, 
    newStatus: RoomStatus, 
    incubatorNumber?: string | null
  ) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('rooms')
      .update({
        status: newStatus,
        last_status_change: new Date().toISOString(),
        last_changed_by: user.id,
        incubator_number: incubatorNumber ?? null,
      })
      .eq('id', roomId);

    if (error) {
      console.error('Error updating room:', error);
      return { error: error.message };
    }

    // Send notifications to users who receive notifications
    if (newStatus === 'awaiting_cleaning') {
      await sendNotifications(roomId, 'work_finished', incubatorNumber);
    } else if (newStatus === 'ready') {
      await sendNotifications(roomId, 'cleaning_complete', null);
    }

    toast.success(`Room status updated to ${newStatus.replace('_', ' ')}`);
    return { error: null };
  };

  const sendNotifications = async (
    roomId: string, 
    type: string, 
    incubatorNumber: string | null | undefined
  ) => {
    if (!user) return;

    // Get all users who should receive notifications
    const { data: recipients, error } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('receives_notifications', true);

    if (error || !recipients) return;

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const message = type === 'work_finished'
      ? `Room ${room.room_number} is now clear${incubatorNumber ? ` (Incubator: ${incubatorNumber})` : ''}. Ready for cleaning.`
      : `Room ${room.room_number} cleaning complete. Room is ready.`;

    // Create notifications for each recipient
    for (const recipient of recipients) {
      if (recipient.user_id !== user.id) {
        await supabase.from('notifications').insert({
          room_id: roomId,
          sender_id: user.id,
          recipient_id: recipient.user_id,
          notification_type: type,
          message,
        });
      }
    }
  };

  const canAccessRoom = (roomId: string) => {
    // Admins and Operation Team have access to all rooms
    if (isAdmin || userRole === 'operation_team') return true;
    // Operators only have access to assigned rooms
    return accessibleRoomIds.includes(roomId);
  };

  return {
    rooms,
    loading,
    updateRoomStatus,
    canAccessRoom,
    refetch: fetchRooms,
  };
}
