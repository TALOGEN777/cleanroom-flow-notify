import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Room, RoomStatus } from '@/lib/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useRooms() {
  const { user, isAdmin, userRole } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [accessibleRoomIds, setAccessibleRoomIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for cleanup and state access in callbacks
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const roomsRef = useRef<Room[]>([]);

  // Keep roomsRef in sync
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  const fetchRooms = async () => {
    try {
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
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const fetchRoomAccess = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('room_access')
        .select('room_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching room access:', error);
        return;
      }

      setAccessibleRoomIds(data.map(ra => ra.room_id));
    } catch (err) {
      console.error('Error fetching room access:', err);
    }
  };

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchRooms();
    fetchRoomAccess(user.id);

    // Setup realtime subscription
    const channel = supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          console.log('[Realtime] Received update:', payload.eventType);
          if (payload.eventType === 'UPDATE') {
            setRooms(prev =>
              prev.map(room =>
                room.id === payload.new.id ? (payload.new as Room) : room
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setRooms(prev => [...prev, payload.new as Room].sort((a, b) =>
              a.room_number.localeCompare(b.room_number)
            ));
          } else if (payload.eventType === 'DELETE') {
            setRooms(prev => prev.filter(room => room.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);

        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          retryCountRef.current = 0;
          // Clear polling when connected
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false);
          // Start polling as fallback
          if (!pollingIntervalRef.current) {
            console.log('[Realtime] Starting fallback polling');
            pollingIntervalRef.current = setInterval(fetchRooms, 10000);
          }
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [user?.id]);

  const updateRoomStatus = async (
    roomId: string,
    newStatus: RoomStatus,
    incubatorNumber?: string | null
  ) => {
    if (!user) return { error: 'Not authenticated' };

    try {
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

      // Send notifications
      if (newStatus === 'awaiting_cleaning') {
        await sendNotifications(roomId, 'work_finished', incubatorNumber);
      } else if (newStatus === 'ready') {
        await sendNotifications(roomId, 'cleaning_complete', null);
      }

      toast.success(`Room status updated to ${newStatus.replace('_', ' ')}`);
      return { error: null };
    } catch (err) {
      console.error('Error updating room:', err);
      return { error: 'Failed to update room' };
    }
  };

  const sendNotifications = async (
    roomId: string,
    type: string,
    incubatorNumber: string | null | undefined
  ) => {
    if (!user) return;

    try {
      // Get all users with 'operation_team' role
      const { data: operationTeamRoles, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'operation_team');

      if (error || !operationTeamRoles) return;

      const room = roomsRef.current.find(r => r.id === roomId);
      if (!room) return;

      const message = type === 'work_finished'
        ? `Room ${room.room_number} is now clear${incubatorNumber ? ` (Incubator: ${incubatorNumber})` : ''}. Ready for cleaning.`
        : `Room ${room.room_number} cleaning complete. Room is ready.`;

      for (const recipient of operationTeamRoles) {
        // Send notification to all operation_team members (including the sender if they're operation_team)
        await supabase.from('notifications').insert({
          room_id: roomId,
          sender_id: user.id,
          recipient_id: recipient.user_id,
          notification_type: type,
          message,
        });
      }
    } catch (err) {
      console.error('Error sending notifications:', err);
    }
  };

  const canAccessRoom = (roomId: string) => {
    if (isAdmin || userRole === 'operation_team') return true;
    return accessibleRoomIds.includes(roomId);
  };

  return {
    rooms,
    loading,
    isConnected,
    updateRoomStatus,
    canAccessRoom,
    refetch: fetchRooms,
  };
}
