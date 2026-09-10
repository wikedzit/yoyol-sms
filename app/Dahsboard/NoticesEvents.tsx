import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Calendar, Bell, AlertCircle, Info } from 'lucide-react';
import { useLanguage } from '~/lib/i18n';

interface Notice {
  id: number;
  title: string;
  description: string;
  date: string;
  type: string; // 'exam' | 'holiday' | 'registration' | 'meeting' | 'info'
  priority: string; // 'high' | 'normal' | 'low'
  status?: string;
}

interface NoticesEventsProps {
  notices?: Notice[];
}

const typeConfig = {
  exam: { icon: AlertCircle, color: 'destructive' },
  holiday: { icon: Calendar, color: 'default' },
  registration: { icon: Bell, color: 'default' },
  meeting: { icon: Info, color: 'secondary' },
  info: { icon: Info, color: 'default' },
};

export function NoticesEvents({ notices = [] }: NoticesEventsProps) {
  const { t } = useLanguage();
  // If no notices provided, show empty state or fallback to empty array
  const displayNotices = notices.length > 0 ? notices : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('noticesEvents')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('importantDates')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayNotices.length > 0 ? (
          displayNotices.map((notice) => {
            const noticeType = notice.type as keyof typeof typeConfig;
            const config = typeConfig[noticeType] || typeConfig.info;
            const Icon = config.icon;

            return (
              <div
                key={notice.id}
                className="flex gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {notice.title}
                    </h4>
                    {notice.priority === 'high' && (
                      <Badge variant="destructive" className="text-xs">
                        {t('urgent')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {notice.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{notice.date}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('noNotices')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
