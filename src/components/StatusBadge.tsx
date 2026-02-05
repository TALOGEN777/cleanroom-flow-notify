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
    className: 'bg-white/20 text-white border border-white/30',
    indicatorColor: 'bg-red-300',
  },
  awaiting_cleaning: {
    label: 'Awaiting Cleaning',
    className: 'bg-white/20 text-white border border-white/30',
    indicatorColor: 'bg-orange-300',
  },
  ready: {
    label: 'Ready',
    className: 'bg-white/20 text-white border border-white/30',
    indicatorColor: 'bg-emerald-300',
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
