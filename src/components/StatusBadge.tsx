import { RoomStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RoomStatus;
  className?: string;
  animated?: boolean;
}

const statusConfig: Record<RoomStatus, { label: string; className: string }> = {
  occupied: {
    label: 'Occupied',
    className: 'bg-amber-500 text-amber-950',
  },
  awaiting_cleaning: {
    label: 'Awaiting Cleaning',
    className: 'bg-primary text-primary-foreground',
  },
  ready: {
    label: 'Ready',
    className: 'bg-emerald-500 text-white',
  },
};

export function StatusBadge({ status, className, animated }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold',
        config.className,
        animated && 'animate-pulse-status',
        className
      )}
    >
      <span className="mr-1.5 h-2 w-2 rounded-full bg-current opacity-60" />
      {config.label}
    </span>
  );
}
