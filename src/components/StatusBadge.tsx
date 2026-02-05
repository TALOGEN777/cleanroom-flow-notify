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
    className: 'bg-red-950 text-red-100 border-2 border-red-400 shadow-lg',
    indicatorColor: 'bg-red-400',
  },
  awaiting_cleaning: {
    label: 'Awaiting Cleaning',
    className: 'bg-amber-900 text-amber-100 border-2 border-amber-400 shadow-lg',
    indicatorColor: 'bg-amber-400',
  },
  ready: {
    label: 'Ready',
    className: 'bg-emerald-900 text-emerald-100 border-2 border-emerald-400 shadow-lg',
    indicatorColor: 'bg-emerald-400',
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
