import { Profile, AppRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';

interface UserRolesCardProps {
  users: Profile[];
  userRoles: { user_id: string; role: string }[];
  onRoleChange: (userId: string, role: AppRole | null) => void;
}

const ROLE_OPTIONS: { value: AppRole | 'none'; label: string; description: string }[] = [
  { value: 'none', label: 'No Role', description: 'No special access' },
  { value: 'admin', label: 'Admin', description: 'Access to all rooms and user roles' },
  { value: 'operator', label: 'Operator', description: 'Access to rooms defined by Admin' },
  { value: 'operation_team', label: 'Operation Team', description: 'Access to all rooms' },
];

export function UserRolesCard({ users, userRoles, onRoleChange }: UserRolesCardProps) {
  const getUserRole = (userId: string): AppRole | 'none' => {
    const role = userRoles.find(r => r.user_id === userId);
    return (role?.role as AppRole) || 'none';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          User Roles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Assign roles to control user access levels.
        </p>
        <div className="space-y-3">
          {users.map((user) => {
            const currentRole = getUserRole(user.user_id);
            return (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{user.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <Select
                  value={currentRole}
                  onValueChange={(value) => 
                    onRoleChange(user.user_id, value === 'none' ? null : value as AppRole)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium mb-2">Role Descriptions:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li><strong>Admin:</strong> Access to all rooms and can manage user roles</li>
            <li><strong>Operator:</strong> Access only to rooms assigned by Admin</li>
            <li><strong>Operation Team:</strong> Access to all rooms</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
