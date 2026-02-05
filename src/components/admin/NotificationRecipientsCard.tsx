import { Profile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';

interface NotificationRecipientsCardProps {
  users: Profile[];
  onToggleNotifications: (userId: string, currentValue: boolean) => void;
}

export function NotificationRecipientsCard({ users, onToggleNotifications }: NotificationRecipientsCardProps) {
  return (
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
                    onToggleNotifications(user.user_id, user.receives_notifications)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
