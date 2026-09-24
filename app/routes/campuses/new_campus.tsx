import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import { safeInternalPath } from '~/lib/safe-return-path';
import { Building2, Save } from 'lucide-react';

import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useState } from 'react';
import { toTitleCase } from '~/utils/strings';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

import type SchoolService from 'workers/services/school';
import type CampusService from 'workers/services/campus';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const services = context.services as {
    school: SchoolService;
  };

  const schoolId = Number(params.schoolId);

  if (!schoolId) {
    throw new Response('School not found', { status: 404 });
  }

  const school = await services.school.getById(schoolId);

  if (!school) {
    throw new Response('School not found', { status: 404 });
  }

  const returnTo =
    safeInternalPath(new URL(request.url).searchParams.get('returnTo')) ??
    '/schools/profile';

  return {
    school,
    returnTo,
  };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const services = context.services as {
    school: SchoolService;
    campus: CampusService;
  };

  // Get school ID from URL.
  // Example:
  // /schools/4/campuses/new
  // params.schoolId === "4"
  const schoolId = Number(params.schoolId);

  if (!schoolId) {
    return {
      error: 'Invalid school.',
    };
  }

  // Make sure the school actually exists.
  const school = await services.school.getById(schoolId);

  if (!school) {
    return {
      error: 'School not found.',
    };
  }

  const form = await request.formData();

  const name = String(form.get('name') || '').trim();
  const code = String(form.get('code') || '').trim();
  const address = String(form.get('address') || '').trim();
  const phone = String(form.get('phone') || '').trim();
  const email = String(form.get('email') || '').trim();

  if (!name) {
    return {
      error: 'Campus name is required.',
    };
  }

  const created = await services.campus.create({
    schoolId,
    name,
    code,
    address,
    phone,
    email,
  });

  if (!created) {
    return {
      error: 'Failed to create campus.',
    };
  }

  const returnTo =
    safeInternalPath(String(form.get('returnTo') || '')) ?? '/schools/profile';

  return redirect(returnTo);
}

export default function NewCampusPage() {
  const { school, returnTo } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSaving = navigation.state === 'submitting';
  const [name, setName] = useState('');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Campus"
        description={`Add a new campus to ${school.name}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Campus Details
          </CardTitle>

          <CardDescription>
            YOU ARE ADDING A CAMPUS TO SCHOOL {' '}
            <span className="font-2x text-foreground">
              {school.name}
            </span>
            .
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="grid gap-4 sm:grid-cols-2">

              {/* School - read only */}
              <div className="space-y-2 sm:col-span-2">
                <Label>School</Label>

                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {school.name}
                </div>

                <p className="text-xs text-muted-foreground">
                  This campus will automatically be assigned to this school.
                </p>
              </div>

              {/* Campus Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Campus Name *
                </Label>

                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(toTitleCase(e.target.value))}
                  placeholder="e.g. Mikocheni Campus"
                  required
                />
              </div>

              {/* Campus Code */}
              <div className="space-y-2">
                <Label htmlFor="code">
                  Campus Code
                </Label>

                <Input
                  id="code"
                  name="code"
                  placeholder="e.g. MIK"
                />
              </div>

              {/* Address */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">
                  Address
                </Label>

                <Input
                  id="address"
                  name="address"
                  placeholder="Campus physical address"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone
                </Label>

                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+255..."
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email
                </Label>

                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="campus@example.com"
                />
              </div>
            </div>

            {/* Error */}
            {actionData?.error && (
              <p className="text-sm text-destructive">
                {actionData.error}
              </p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-primary-gradient text-white flex items-center gap-2 hover:scale-110 transition cursor-pointer"
            >
              <Save size={16} />

              {isSaving ? 'Saving...' : 'Save Campus'}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
