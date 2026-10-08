import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useLanguage } from '~/lib/i18n';

export type SchoolThemeChoice = {
  key: string;
  nameEn: string;
  nameSw: string;
  isActive: boolean;
  isBundled: boolean;
};

type ThemeActionData = {
  themeError?: string;
  themeSuccess?: 'uploaded' | 'activated';
};

export function SchoolThemeCard({
  themes,
  schoolId,
}: {
  themes: SchoolThemeChoice[];
  schoolId: number;
}) {
  const { language, t } = useLanguage();
  const fetcher = useFetcher<ThemeActionData>();
  const isSaving = fetcher.state !== 'idle';

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) {
      return;
    }
    if (fetcher.data.themeSuccess === 'uploaded') {
      toast.success(t('themeUploaded'));
    }
    if (fetcher.data.themeSuccess === 'activated') {
      toast.success(t('themeActivated'));
    }
    if (fetcher.data.themeError) {
      toast.error(fetcher.data.themeError);
    }
  }, [fetcher.state, fetcher.data, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('siteThemes')}</CardTitle>
        <CardDescription>{t('siteThemesDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-2">
          {themes.map((theme) => {
            const name = language === 'sw' ? theme.nameSw : theme.nameEn;
            return (
              <li
                key={theme.key}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{name}</p>
                  {theme.isBundled || theme.isActive ? (
                    <p className="text-xs text-muted-foreground">
                      {[
                        theme.isBundled ? t('extensionIncluded') : null,
                        theme.isActive ? t('activeTheme') : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
                {theme.isActive ? null : (
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="activate-theme" />
                    <input type="hidden" name="schoolId" value={schoolId} />
                    <input type="hidden" name="themeKey" value={theme.key} />
                    <Button type="submit" variant="outline" disabled={isSaving}>
                      {t('activateTheme')}
                    </Button>
                  </fetcher.Form>
                )}
              </li>
            );
          })}
        </ul>

        <fetcher.Form method="post" encType="multipart/form-data" className="space-y-3">
          <input type="hidden" name="intent" value="upload-theme" />
          <input type="hidden" name="schoolId" value={schoolId} />
          <div className="space-y-2">
            <Label htmlFor="themeFile">{t('themeFile')}</Label>
            <Input id="themeFile" name="themeFile" type="file" accept="application/json,.json" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {t('uploadTheme')}
            </Button>
            <a className="text-sm underline" href="/themes/template">
              {t('downloadThemeTemplate')}
            </a>
            <a className="text-sm underline" href="/themes/example">
              {t('downloadExampleTheme')}
            </a>
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}
