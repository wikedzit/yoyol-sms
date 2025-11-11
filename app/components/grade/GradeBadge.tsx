import { cn } from '~/lib/utils';

interface GradeBadgeProps {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  className?: string;
}

export function GradeBadge({ grade, className }: GradeBadgeProps) {
  const variants = {
    A: 'bg-grade-a text-grade-a-foreground',
    B: 'bg-grade-b text-grade-b-foreground',
    C: 'bg-grade-c text-grade-c-foreground',
    D: 'bg-grade-d text-grade-d-foreground',
    F: 'bg-grade-f text-grade-f-foreground',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold',
        variants[grade],
        className
      )}
    >
      {grade}
    </span>
  );
}
