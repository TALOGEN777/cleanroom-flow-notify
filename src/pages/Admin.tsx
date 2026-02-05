import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile, Room, RoomAccess } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, Bell, Building2 } from 'lucide-react';
import { toast } from 'sonner';

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
      // Remove access
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
      // Add access
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

  const isUserAdmin = (userId: string) => {
    return userRoles.some(r => r.user_id === userId && r.role === 'admin');
  };

  const hasRoomAccess = (userId: string, roomId: string) => {
    return roomAccess.some(ra => ra.user_id === userId && ra.room_id === roomId);
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
      {/* Header */}
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

      {/* Main Content */}
      <main className="container mx-auto space-y-6 px-4 py-6">
        {/* Notification Recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Recipients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose which users receive notifications when room status changes.
            </p>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{user.display_name}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`notif-${user.id}`} className="text-sm">
                      Receives notifications
                    </Label>
                    <Switch
                      id={`notif-${user.id}`}
                      checked={user.receives_notifications}
                      onCheckedChange={() =>
                        toggleNotifications(user.user_id, user.receives_notifications)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Room Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Room Access Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Control which users can update the status of each room.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">User</th>
                    {rooms.map((room) => (
                      <th key={room.id} className="p-2 text-center font-medium">
                        Room {room.room_number}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((u) => !isUserAdmin(u.user_id))
                    .map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="p-2">
                          <p className="font-medium">{user.display_name}</p>
                        </td>
                        {rooms.map((room) => (
                          <td key={room.id} className="p-2 text-center">
                            <Checkbox
                              checked={hasRoomAccess(user.user_id, room.id)}
                              onCheckedChange={() =>
                                toggleRoomAccess(
                                  user.user_id,
                                  room.id,
                                  hasRoomAccess(user.user_id, room.id)
                                )
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Admins have access to all rooms by default.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
