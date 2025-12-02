import { cn } from '~/lib/utils';
import type { LevelType } from '~/type/shools';

interface LevelBadgeProps {
  level: LevelType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        level === 'o-level'
          ? 'bg-o-level-light text-o-level'
          : 'bg-a-level-light text-a-level',
        sizeClasses[size],
        className
      )}
    >
      {level === 'o-level' ? 'O-Level' : 'A-Level'}
    </span>
  );
}
