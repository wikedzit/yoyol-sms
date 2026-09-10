import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import { Building2, Save } from 'lucide-react';
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
import {
  getOwnerOnboardingStatus,
  hasFinishedOnboarding,
} from '~/lib/onboarding.server';
import { useLanguage } from '~/lib/i18n';

type OnboardingActionData = {
  error?: string;
};

function readFormText(form: FormData, fieldName: string): string {
  return String(form.get(fieldName) || '').trim();
}

export async function loader({ context }: LoaderFunctionArgs) {
  const status = await getOwnerOnboardingStatus(context.services);

  if (hasFinishedOnboarding(status)) {
    return redirect('/');
  }

  return status;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = readFormText(form, 'intent');
  const status = await getOwnerOnboardingStatus(context.services);

  if (intent === 'create-school') {
    if (status.school) {
      return redirect('/onboarding');
    }

    const created = await context.services.school.create({
      name: readFormText(form, 'name'),
      address: readFormText(form, 'address'),
      phone: readFormText(form, 'phone'),
      email: readFormText(form, 'email'),
      motto: readFormText(form, 'motto'),
      registrationNumber: readFormText(form, 'registrationNumber'),
      logoUrl: readFormText(form, 'logoUrl'),
    });

    if (!created) {
      return { error: 'Could not save school details. Please try again.' };
    }

    return redirect('/onboarding');
  }

  if (intent === 'create-campus') {
    if (!status.school) {
      return redirect('/onboarding');
    }

    const campusName = readFormText(form, 'name');
    if (!campusName) {
      return { error: 'Campus name is required.' };
    }

    const created = await context.services.campus.create({
      schoolId: status.school.id,
      name: campusName,
      code: readFormText(form, 'code') || null,
      address: readFormText(form, 'address') || null,
      phone: readFormText(form, 'phone') || null,
      email: readFormText(form, 'email') || null,
    });

    if (!created) {
      return { error: 'Could not save campus. Please try again.' };
    }

    return redirect('/');
  }

  return { error: 'Unknown onboarding step.' };
}

export default function OnboardingPage() {
  const { t } = useLanguage();
  const { step, school } = useLoaderData<typeof loader>();
  const actionData = useActionData<OnboardingActionData>();
  const navigation = useNavigation();
  const isSaving = navigation.state === 'submitting';
  const isSchoolStep = step === 'school';

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <img
            className="h-10 w-auto"
            src="/assets/auth-page/yoyol-logo.png"
            alt="Yoyol"
          />
          <p className="text-sm text-muted-foreground">
            {isSchoolStep ? t('onboardSchoolStepLabel') : t('onboardCampusStepLabel')}
          </p>
        </div>

        {isSchoolStep ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('onboardSchool')}
              </CardTitle>
              <CardDescription>{t('onboardSchoolDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="create-school" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('schoolName')} *</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">
                      {t('registrationNumber')}
                    </Label>
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

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary-gradient text-white flex items-center gap-2 cursor-pointer"
                >
                  <Save size={16} />
                  {isSaving ? t('saving') : t('continueToCampus')}
                </Button>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('onboardCampus')}
              </CardTitle>
              <CardDescription>
                {t('onboardCampusDescription')}{' '}
                <span className="font-medium text-foreground">
                  {school?.name}
                </span>
                .
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="create-campus" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="campus-name">{t('campusName')} *</Label>
                    <Input
                      id="campus-name"
                      name="name"
                      placeholder="e.g. Mikocheni Campus"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">{t('campusCode')}</Label>
                    <Input id="code" name="code" placeholder="e.g. MIK" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="campus-address">{t('address')}</Label>
                    <Input id="campus-address" name="address" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campus-phone">{t('phone')}</Label>
                    <Input id="campus-phone" name="phone" type="tel" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campus-email">{t('email')}</Label>
                    <Input id="campus-email" name="email" type="email" />
                  </div>
                </div>

                {actionData?.error && (
                  <p className="text-sm text-destructive">{actionData.error}</p>
                )}

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary-gradient text-white flex items-center gap-2 cursor-pointer"
                >
                  <Save size={16} />
                  {isSaving ? t('saving') : t('saveAndOpenDashboard')}
                </Button>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
