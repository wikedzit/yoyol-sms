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
import { useState } from 'react';
import { toTitleCase } from '~/utils/strings';

export async function action({ request, context }: ActionFunctionArgs) {
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

  // Baada ya kuunda, elekeza moja kwa moja kwenye profile ya shule mpya
  return redirect(`/schools/${created.id}`);
}

export default function NewSchoolPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSaving = navigation.state === 'submitting';
  const [name, setName] = useState('');

  return (
    <div className="space-y-6">
      <PageHeader title="Add School" description="Register a new school" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Details
          </CardTitle>
          <CardDescription>Fill in the new school's information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('schoolName')} *</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(toTitleCase(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input id="registrationNumber" name="registrationNumber" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motto">Motto</Label>
                <Input id="motto" name="motto" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input id="logoUrl" name="logoUrl" />
              </div>
            </div>

            {actionData?.error && (
              <p className="text-sm text-destructive">{actionData.error}</p>
            )}

            <Button type="submit" disabled={isSaving} className="bg-primary-gradient text-white flex items-center gap-2  hover:scale-110 hover:text-white-600 transition cursor-pointer">
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save School'}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}   