import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { Separator } from '~/components/ui/separator';
import { useLanguage } from '~/lib/i18n';

export default function Settings() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('settingsDescription')}
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('profileInformation')}</CardTitle>
            <CardDescription>
              {t('personalDetails')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('firstName')}</Label>
                <Input id="firstName" placeholder="John" defaultValue="Admin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('lastName')}</Label>
                <Input id="lastName" placeholder="Doe" defaultValue="User" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@edu.com"
                defaultValue="admin@edu.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phoneNumber')}</Label>
              <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
            </div>
            <Button className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-110 hover:text-white-600 transition cursor-pointer">
              {t('saveChanges')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('notifications')}</CardTitle>
            <CardDescription>
              {t('notificationDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('emailNotifications')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('studentActivityUpdates')}
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('gradeSubmissions')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('gradeNotification')}
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('attendanceAlerts')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('lowAttendance')}
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('security')}</CardTitle>
            <CardDescription>
              {t('securityDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
              <Input id="currentPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('newPassword')}</Label>
              <Input id="newPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
              <Input id="confirmPassword" type="password" />
            </div>
            <Button className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-110 hover:text-white-600 transition cursor-pointer">
              {t('updatePassword')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
