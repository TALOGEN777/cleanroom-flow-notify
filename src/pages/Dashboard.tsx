import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { RoomCard } from '@/components/RoomCard';
import { NotificationPermission } from '@/components/NotificationPermission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, LogOut, Settings, Bell, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

export default function Dashboard() {
  const { profile, signOut, isAdmin, userRole } = useAuth();
  const { rooms, loading, updateRoomStatus, canAccessRoom, refetch } = useRooms();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Building2 className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Cleanrooms Status</h1>
              <p className="text-xs text-muted-foreground">
                {profile?.display_name}
                {isAdmin && ' (Admin)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={refetch}>
              <RefreshCw className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/notifications')}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>

            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <Settings className="h-5 w-5" />
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Room Status</h2>
          <p className="text-muted-foreground">Select a room to update its status</p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="mb-4 h-8 w-24" />
                <Skeleton className="mb-2 h-10 w-full" />
                <Skeleton className="h-12 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms
              .filter((room) => {
                // Admins and Operation Team can see all rooms
                if (isAdmin || userRole === 'operation_team') return true;
                // Others can only see rooms they have access to
                return canAccessRoom(room.id);
              })
              .map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  canAccess={canAccessRoom(room.id)}
                  userRole={userRole}
                  isAdmin={isAdmin}
                  onUpdateStatus={updateRoomStatus}
                />
              ))}
          </div>
        )}

      </main>

      {/* Notification Permission Prompt */}
      <NotificationPermission />
    </div>
  );
}
