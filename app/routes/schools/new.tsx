import {
  type ActionFunctionArgs,
  Form,
  redirect,
  useActionData,
  useNavigation,
} from 'react-router';
import { Building2, Save } from 'lucide-react';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import type SchoolService from 'workers/services/school';
import { useLanguage } from '~/lib/i18n';
import { requireSchoolPermission } from '~/lib/require-school-permission';

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.update');
  const services = context.services as { school: SchoolService };
  const form = await request.formData();

  const data = {
    name: String(form.get('name') || ''),
    address: String(form.get('address') || ''),
    phone: String(form.get('phone') || ''),
    email: String(form.get('email') || ''),
    motto: String(form.get('motto') || ''),
    registrationNumber: String(form.get('registrationNumber') || ''),
    logoUrl: String(form.get('logoUrl') || ''),
  };

  const created = await services.school.create(data);

  if (!created) {
    return { error: 'Failed to create school' };
  }

  return redirect(`/schools/${created.id}/campuses/new_campus`);
}

export default function NewSchoolPage() {
  const { t } = useLanguage();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSaving = navigation.state === 'submitting';

  return (
    <div className="space-y-6">
      <PageHeader title={t('addSchool')} description={t('registerNewSchool')} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('schoolDetails')}
          </CardTitle>
          <CardDescription>{t('fillSchoolInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('schoolName')} *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">{t('registrationNumber')}</Label>
                <Input id="registrationNumber" name="registrationNumber" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">{t('address')}</Label>
                <Input id="address" name="address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motto">{t('motto')}</Label>
                <Input id="motto" name="motto" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">{t('logoUrl')}</Label>
                <Input id="logoUrl" name="logoUrl" />
              </div>
            </div>

            {actionData?.error && (
              <p className="text-sm text-destructive">{actionData.error}</p>
            )}

            <Button type="submit" disabled={isSaving} className="bg-primary-gradient text-white flex items-center gap-2  hover:scale-110 hover:text-white-600 transition cursor-pointer">
              <Save size={16} />
              {isSaving ? t('saving') : t('saveSchool')}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}   