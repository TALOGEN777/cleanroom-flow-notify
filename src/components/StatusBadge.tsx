import { RoomStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RoomStatus;
  className?: string;
  animated?: boolean;
}

const statusConfig: Record<RoomStatus, { label: string; className: string; indicatorColor: string }> = {
  occupied: {
    label: 'Occupied',
    className: 'bg-white text-red-700 shadow-md font-bold',
    indicatorColor: 'bg-red-500',
  },
  awaiting_cleaning: {
    label: 'Awaiting Cleaning',
    className: 'bg-white text-orange-700 shadow-md font-bold',
    indicatorColor: 'bg-orange-500',
  },
  ready: {
    label: 'Ready',
    className: 'bg-white text-emerald-700 shadow-md font-bold',
    indicatorColor: 'bg-emerald-500',
  },
};

export function StatusBadge({ status, className, animated }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold',
        config.className,
        className
      )}
    >
      <span 
        className={cn(
          'mr-1.5 h-2 w-2 rounded-full',
          config.indicatorColor,
          animated && 'animate-pulse'
        )} 
      />
      {config.label}
    </span>
  );
}
