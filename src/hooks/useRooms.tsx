import { useState, useEffect, useRef, useCallback } from 'react';
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

  // Refs for cleanup
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const clearRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const fetchRooms = useCallback(async () => {
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
  }, []);

  const fetchRoomAccess = useCallback(async () => {
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
  }, [user]);

  const startPolling = useCallback(() => {
    clearPolling();
    console.log('[Realtime] Starting fallback polling (every 10s)');
    pollingIntervalRef.current = setInterval(() => {
      fetchRooms();
    }, 10000); // Poll every 10 seconds as fallback
  }, [clearPolling, fetchRooms]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!user) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('[Realtime] Setting up subscription...');

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
          clearPolling(); // Stop polling when connected
          clearRetry();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false);
          startPolling(); // Start polling as fallback

          // Retry with exponential backoff
          const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          retryCountRef.current++;
          
          console.log(`[Realtime] Will retry in ${retryDelay / 1000}s (attempt ${retryCountRef.current})`);
          
          clearRetry();
          retryTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscription();
          }, retryDelay);
        }
      });

    channelRef.current = channel;
  }, [user, clearPolling, clearRetry, startPolling]);

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setLoading(false);
      return;
    }

    fetchRooms();
    fetchRoomAccess();
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      clearPolling();
      clearRetry();
    };
  }, [user, fetchRooms, fetchRoomAccess, setupRealtimeSubscription, clearPolling, clearRetry]);

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
    isConnected,
    updateRoomStatus,
    canAccessRoom,
    refetch: fetchRooms,
  };
}
