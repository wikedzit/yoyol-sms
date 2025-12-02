import { cn } from '~/lib/utils';

interface StreamBadgeProps {
  stream: 'science' | 'arts' | 'business';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StreamBadge({
  stream,
  size = 'md',
  className,
}: StreamBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const colorClasses = {
    science: 'bg-science-light text-science',
    arts: 'bg-arts-light text-arts',
    business: 'bg-business-light text-business',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full capitalize',
        colorClasses[stream],
        sizeClasses[size],
        className
      )}
    >
      {stream}
    </span>
  );
}
