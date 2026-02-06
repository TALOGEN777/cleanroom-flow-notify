import { RoomStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RoomStatus;
  className?: string;
}

const statusConfig: Record<RoomStatus, { label: string; dotColor: string }> = {
  ready: {
    label: 'Ready For work',
    dotColor: 'bg-emerald-500',
  },
  awaiting_cleaning: {
    label: 'Awaiting Cleaning',
    dotColor: 'bg-amber-500',
  },
  occupied: {
    label: 'Occupied',
    dotColor: 'bg-red-400',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium bg-white/90 backdrop-blur-sm shadow-sm',
        className
      )}
    >
      <span 
        className={cn(
          'mr-2 h-2.5 w-2.5 rounded-full',
          config.dotColor
        )} 
      />
      <span className="text-gray-700">{config.label}</span>
    </span>
  );
}
