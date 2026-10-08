import { Fragment, type ReactNode } from 'react';
import { cn } from '~/lib/utils';
import { Link, useLocation } from 'react-router';
import { Card, CardContent } from '~/components/ui/card';
import { PageHeader } from '~/components/ui/PageHeader';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { appModules, shellMenu } from 'workers/kernel/modules';
import { crumbsForPath, type PageCrumb } from 'workers/kernel/page-breadcrumb';
import { useLanguage, type TranslationKey } from '~/lib/i18n';

export function PageBreadcrumb({ trail }: { trail?: PageCrumb[] }) {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const generated = crumbsForPath(pathname, (key) => t(key as TranslationKey), appModules, shellMenu);
  const crumbs = trail ? [{ label: t('dashboard'), to: '/' }, ...trail] : generated;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {isCurrent ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : crumb.to ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function PageFrame({
  title,
  description,
  badge,
  actions,
  trail,
  contain = true,
  className,
  children,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  trail?: PageCrumb[];
  contain?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      <PageBreadcrumb trail={trail} />
      <PageHeader title={title} description={description} badge={badge} actions={actions} className="mb-0" />
      {contain ? (
        <Card className="hover:bg-card">
          <CardContent className="space-y-6">{children}</CardContent>
        </Card>
      ) : (
        children
      )}
    </div>
  );
}
