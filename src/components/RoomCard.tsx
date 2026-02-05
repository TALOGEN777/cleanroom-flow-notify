import { useState, useEffect } from 'react';
import { Room, RoomStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Loader2, Lock, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface RoomCardProps {
  room: Room;
  canAccess: boolean;
  onUpdateStatus: (roomId: string, status: RoomStatus, incubator?: string | null) => Promise<{ error: string | null }>;
}

const incubatorOptions = ['1', '2', '3', '4', '5', 'No Incubator'];

export function RoomCard({ room, canAccess, onUpdateStatus }: RoomCardProps) {
  const [selectedIncubator, setSelectedIncubator] = useState<string>('No Incubator');
  const [isUpdating, setIsUpdating] = useState(false);
  const [changedByName, setChangedByName] = useState<string | null>(null);

  useEffect(() => {
    if (room.last_changed_by) {
      fetchChangedByName(room.last_changed_by);
    }
  }, [room.last_changed_by]);

  const fetchChangedByName = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .single();
    
    if (data) {
      setChangedByName(data.display_name);
    }
  };

  const handleWorkFinished = async () => {
    setIsUpdating(true);
    const incubator = selectedIncubator === 'No Incubator' ? null : selectedIncubator;
    await onUpdateStatus(room.id, 'awaiting_cleaning', incubator);
    setIsUpdating(false);
  };

  const handleRoomReady = async () => {
    setIsUpdating(true);
    await onUpdateStatus(room.id, 'ready', null);
    setIsUpdating(false);
  };

  const handleSetOccupied = async () => {
    setIsUpdating(true);
    await onUpdateStatus(room.id, 'occupied', null);
    setIsUpdating(false);
  };

  const cardClassName = cn(
    'room-card transition-all duration-300',
    room.status === 'occupied' && 'room-card-occupied',
    room.status === 'awaiting_cleaning' && 'room-card-awaiting',
    room.status === 'ready' && 'room-card-ready',
    !canAccess && 'opacity-60'
  );

  const getTimeAgo = () => {
    if (!room.last_status_change) return null;
    return formatDistanceToNow(new Date(room.last_status_change), { addSuffix: true });
  };

  return (
    <Card className={cardClassName}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Room {room.room_number}</h2>
          <StatusBadge status={room.status} animated={room.status === 'occupied'} />
        </div>
        {room.incubator_number && (
          <p className="text-sm opacity-80">
            Incubator: {room.incubator_number}
          </p>
        )}
        
        {/* Timestamp and user info */}
        {room.last_status_change && (
          <div className="mt-2 space-y-1 text-sm opacity-80">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{getTimeAgo()}</span>
            </div>
            {changedByName && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>by {changedByName}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!canAccess ? (
          <div className="flex items-center gap-2 opacity-80">
            <Lock className="h-4 w-4" />
            <span className="text-sm">No access to this room</span>
          </div>
        ) : (
          <>
            {room.status === 'ready' && (
              <>
                <Select value={selectedIncubator} onValueChange={setSelectedIncubator}>
                  <SelectTrigger className="touch-button bg-emerald-900/80 border-2 border-emerald-300 text-emerald-100 font-medium">
                    <SelectValue placeholder="Select incubator" />
                  </SelectTrigger>
                  <SelectContent>
                    {incubatorOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt === 'No Incubator' ? 'No Incubator (Cleaning Only)' : `Incubator ${opt}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSetOccupied}
                  disabled={isUpdating}
                  className="touch-button w-full bg-emerald-900 text-emerald-100 hover:bg-emerald-800 font-bold shadow-xl border-2 border-emerald-700"
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Clock className="mr-2 h-5 w-5" />
                  )}
                  Start Working
                </Button>
              </>
            )}

            {room.status === 'occupied' && (
              <>
                <Select value={selectedIncubator} onValueChange={setSelectedIncubator}>
                  <SelectTrigger className="touch-button bg-red-900/80 border-2 border-red-300 text-red-100 font-medium">
                    <SelectValue placeholder="Select incubator" />
                  </SelectTrigger>
                  <SelectContent>
                    {incubatorOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt === 'No Incubator' ? 'No Incubator (Cleaning Only)' : `Incubator ${opt}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleWorkFinished}
                  disabled={isUpdating}
                  className="touch-button w-full bg-red-600 text-white hover:bg-red-700 font-bold shadow-lg border-2 border-red-400"
                  size="lg"
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-5 w-5" />
                  )}
                  Work Finished
                </Button>
              </>
            )}

            {room.status === 'awaiting_cleaning' && (
              <Button
                onClick={handleRoomReady}
                disabled={isUpdating}
                className="touch-button w-full bg-amber-600 text-white hover:bg-amber-700 font-bold shadow-lg border-2 border-amber-400"
                size="lg"
              >
                {isUpdating ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-5 w-5" />
                )}
                Cleaning Complete
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
