import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';
import { useLanguage, translateText } from '~/lib/i18n';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  const { language } = useLanguage();
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8',
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {translateText(title, language)}
          </h1>
          {badge}
        </div>
        {description && <p className="text-muted-foreground">{translateText(description, language)}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
