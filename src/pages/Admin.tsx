import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile, Room, RoomAccess, AppRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner';
import { UserRolesCard } from '@/components/admin/UserRolesCard';
import { NotificationRecipientsCard } from '@/components/admin/NotificationRecipientsCard';
import { RoomAccessCard } from '@/components/admin/RoomAccessCard';

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomAccess, setRoomAccess] = useState<RoomAccess[]>([]);
  const [userRoles, setUserRoles] = useState<{ user_id: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    const [usersRes, roomsRes, accessRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('username'),
      supabase.from('rooms').select('*').order('room_number'),
      supabase.from('room_access').select('*'),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    if (usersRes.data) setUsers(usersRes.data as Profile[]);
    if (roomsRes.data) setRooms(roomsRes.data as Room[]);
    if (accessRes.data) setRoomAccess(accessRes.data as RoomAccess[]);
    if (rolesRes.data) setUserRoles(rolesRes.data);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole | null) => {
    // Remove existing role first
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      toast.error('Failed to update role');
      return;
    }

    // Add new role if not 'none'
    if (newRole) {
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (insertError) {
        toast.error('Failed to update role');
        return;
      }
    }

    // Update local state
    setUserRoles(prev => {
      const filtered = prev.filter(r => r.user_id !== userId);
      if (newRole) {
        return [...filtered, { user_id: userId, role: newRole }];
      }
      return filtered;
    });
    
    toast.success('User role updated');
  };

  const toggleNotifications = async (userId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ receives_notifications: !currentValue })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to update notification settings');
      return;
    }

    setUsers(prev =>
      prev.map(u =>
        u.user_id === userId ? { ...u, receives_notifications: !currentValue } : u
      )
    );
    toast.success('Notification settings updated');
  };

  const toggleRoomAccess = async (userId: string, roomId: string, hasAccess: boolean) => {
    if (hasAccess) {
      const { error } = await supabase
        .from('room_access')
        .delete()
        .eq('user_id', userId)
        .eq('room_id', roomId);

      if (error) {
        toast.error('Failed to update room access');
        return;
      }

      setRoomAccess(prev => prev.filter(ra => !(ra.user_id === userId && ra.room_id === roomId)));
    } else {
      const { data, error } = await supabase
        .from('room_access')
        .insert({ user_id: userId, room_id: roomId })
        .select()
        .single();

      if (error) {
        toast.error('Failed to update room access');
        return;
      }

      setRoomAccess(prev => [...prev, data as RoomAccess]);
    }
    toast.success('Room access updated');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="mb-4 h-16 w-full" />
        <Skeleton className="mb-4 h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Admin Panel</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        <UserRolesCard 
          users={users} 
          userRoles={userRoles} 
          onRoleChange={handleRoleChange} 
        />
        
        <RoomAccessCard
          users={users}
          rooms={rooms}
          roomAccess={roomAccess}
          userRoles={userRoles}
          onToggleRoomAccess={toggleRoomAccess}
        />

        <NotificationRecipientsCard 
          users={users} 
          onToggleNotifications={toggleNotifications} 
        />
      </main>
    </div>
  );
}
