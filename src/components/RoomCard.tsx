import { useState } from 'react';
import { Room, RoomStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { IncubatorDialog } from './IncubatorDialog';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  canAccess: boolean;
  onUpdateStatus: (roomId: string, status: RoomStatus, incubator?: string | null) => Promise<{ error: string | null }>;
}

export function RoomCard({ room, canAccess, onUpdateStatus }: RoomCardProps) {
  const [showIncubatorDialog, setShowIncubatorDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStartWorking = () => {
    setShowIncubatorDialog(true);
  };

  const handleConfirmStart = async (incubator: string | null) => {
    setIsUpdating(true);
    await onUpdateStatus(room.id, 'occupied', incubator);
    setIsUpdating(false);
  };

  const handleFinishWork = async () => {
    setIsUpdating(true);
    await onUpdateStatus(room.id, 'awaiting_cleaning', room.incubator_number);
    setIsUpdating(false);
  };

  const handleFinishCleaning = async () => {
    setIsUpdating(true);
    await onUpdateStatus(room.id, 'ready', null);
    setIsUpdating(false);
  };

  const cardClassName = cn(
    'relative flex flex-col items-center justify-between p-6 rounded-3xl min-h-[200px] transition-all duration-300 cursor-pointer select-none',
    room.status === 'ready' && 'bg-[#9BE8C0]',
    room.status === 'awaiting_cleaning' && 'bg-[#F5C95C]',
    room.status === 'occupied' && 'bg-[#F88B8B]',
    !canAccess && 'opacity-60 cursor-not-allowed',
    isUpdating && 'opacity-70 pointer-events-none'
  );

  const getActionText = () => {
    if (!canAccess) return null;
    switch (room.status) {
      case 'ready':
        return 'Press to Start';
      case 'awaiting_cleaning':
        return 'Press to Finish Cleaning';
      case 'occupied':
        return 'Press to Finish Work';
      default:
        return null;
    }
  };

  const handleCardClick = () => {
    if (!canAccess || isUpdating) return;
    
    switch (room.status) {
      case 'ready':
        handleStartWorking();
        break;
      case 'awaiting_cleaning':
        handleFinishCleaning();
        break;
      case 'occupied':
        handleFinishWork();
        break;
    }
  };

  return (
    <>
      <div className={cardClassName} onClick={handleCardClick}>
        {/* Status Badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <StatusBadge status={room.status} />
        </div>

        {/* Room Number */}
        <div className="flex-1 flex flex-col items-center justify-center pt-8">
          <h2 className="text-4xl font-bold text-white mb-2">Room {room.room_number}</h2>
          <div className="w-24 h-0.5 bg-white/60" />
        </div>

        {/* Action Text */}
        {canAccess ? (
          <p className="text-white/90 text-sm font-medium mt-4">
            {getActionText()}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-white/80 mt-4">
            <Lock className="h-4 w-4" />
            <span className="text-sm">No access</span>
          </div>
        )}
      </div>

      <IncubatorDialog
        open={showIncubatorDialog}
        onOpenChange={setShowIncubatorDialog}
        onConfirm={handleConfirmStart}
        roomNumber={room.room_number}
      />
    </>
  );
}
