import { useState } from 'react';
import { Room, RoomStatus, AppRole } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { IncubatorDialog } from './IncubatorDialog';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  canAccess: boolean;
  userRole: AppRole | null;
  isAdmin: boolean;
  onUpdateStatus: (roomId: string, status: RoomStatus, incubator?: string | null) => Promise<{ error: string | null }>;
}

export function RoomCard({ room, canAccess, userRole, isAdmin, onUpdateStatus }: RoomCardProps) {
  const [showIncubatorDialog, setShowIncubatorDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Role-based action permissions
  // Admin and Operators can "Press to Start" and "Press to Finish Work"
  const canStartOrFinishWork = isAdmin || userRole === 'operator';
  // Admin and Operation Team can "Press to Finish Cleaning"
  const canFinishCleaning = isAdmin || userRole === 'operation_team';

  const handleStartWorking = () => {
    if (!canStartOrFinishWork) return;
    if (room.room_number === '26') {
      handleConfirmStart(null);
      return;
    }
    setShowIncubatorDialog(true);
  };

  const handleConfirmStart = async (incubator: string | null) => {
    setIsUpdating(true);
    await onUpdateStatus(room.id, 'occupied', incubator);
    setIsUpdating(false);
  };

  const handleFinishWork = async () => {
    if (!canStartOrFinishWork) return;
    setIsUpdating(true);
    await onUpdateStatus(room.id, 'awaiting_cleaning', room.incubator_number);
    setIsUpdating(false);
  };

  const handleFinishCleaning = async () => {
    if (!canFinishCleaning) return;
    setIsUpdating(true);
    await onUpdateStatus(room.id, 'ready', null);
    setIsUpdating(false);
  };

  // Determine if user can perform the current action based on room status
  const canPerformAction = () => {
    if (!canAccess) return false;
    switch (room.status) {
      case 'ready':
        return canStartOrFinishWork;
      case 'occupied':
        return canStartOrFinishWork;
      case 'awaiting_cleaning':
        return canFinishCleaning;
      default:
        return false;
    }
  };

  const cardClassName = cn(
    'relative flex flex-col items-center justify-between p-6 rounded-3xl min-h-[200px] transition-all duration-300 select-none',
    room.status === 'ready' && 'bg-[#9BE8C0]',
    room.status === 'awaiting_cleaning' && 'bg-[#F5C95C]',
    room.status === 'occupied' && 'bg-[#F88B8B]',
    canPerformAction() ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
    isUpdating && 'opacity-70 pointer-events-none'
  );

  const getActionText = () => {
    if (!canAccess) return null;
    switch (room.status) {
      case 'ready':
        return canStartOrFinishWork ? 'Press to Start' : null;
      case 'awaiting_cleaning':
        return canFinishCleaning ? 'Press to Finish Cleaning' : null;
      case 'occupied':
        return canStartOrFinishWork ? 'Press to Finish Work' : null;
      default:
        return null;
    }
  };

  const handleCardClick = () => {
    if (!canAccess || isUpdating) return;

    switch (room.status) {
      case 'ready':
        if (canStartOrFinishWork) handleStartWorking();
        break;
      case 'awaiting_cleaning':
        if (canFinishCleaning) handleFinishCleaning();
        break;
      case 'occupied':
        if (canStartOrFinishWork) handleFinishWork();
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
          <div className="w-24 h-0.5 bg-white/60 mb-2" />
          {room.status === 'awaiting_cleaning' && room.room_number !== '26' && (
            <p className="text-gray-700 text-sm font-medium">
              {room.incubator_number ? `Incubator ${room.incubator_number} to clean` : 'No incubator to clean'}
            </p>
          )}
        </div>

        {/* Action Text */}
        {canAccess && getActionText() ? (
          <p className="text-white/90 text-sm font-medium mt-4">
            {getActionText()}
          </p>
        ) : canAccess ? (
          <p className="text-white/70 text-sm font-medium mt-4">
            View only
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
