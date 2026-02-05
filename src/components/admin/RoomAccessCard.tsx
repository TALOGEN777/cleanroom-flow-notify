import { Profile, Room, RoomAccess } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2 } from 'lucide-react';

interface RoomAccessCardProps {
  users: Profile[];
  rooms: Room[];
  roomAccess: RoomAccess[];
  userRoles: { user_id: string; role: string }[];
  onToggleRoomAccess: (userId: string, roomId: string, hasAccess: boolean) => void;
}

export function RoomAccessCard({ users, rooms, roomAccess, userRoles, onToggleRoomAccess }: RoomAccessCardProps) {
  const hasRoomAccess = (userId: string, roomId: string) => {
    return roomAccess.some(ra => ra.user_id === userId && ra.room_id === roomId);
  };

  const getUserRole = (userId: string) => {
    return userRoles.find(r => r.user_id === userId)?.role;
  };

  // Only show operators in room access control (admins and operation_team have full access)
  const operatorUsers = users.filter(u => getUserRole(u.user_id) === 'operator');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Room Access Control (Operators)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Control which rooms Operators can update. Admins and Operation Team have access to all rooms by default.
        </p>
        {operatorUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No users with Operator role. Assign the Operator role to users above to configure their room access.
          </p>
        ) : (
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
                {operatorUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-2">
                      <p className="font-medium">{user.display_name}</p>
                    </td>
                    {rooms.map((room) => (
                      <td key={room.id} className="p-2 text-center">
                        <Checkbox
                          checked={hasRoomAccess(user.user_id, room.id)}
                          onCheckedChange={() =>
                            onToggleRoomAccess(
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
        )}
      </CardContent>
    </Card>
  );
}
