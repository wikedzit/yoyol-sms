import {
  Building2,
  GraduationCap,
  Hash,
  Mail,
  MapPin,
  Palette,
  Pencil,
  Phone,
  Plus,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { Form, Link } from 'react-router';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { useLanguage } from '~/lib/i18n';
import { DeleteButton } from '~/components/DeleteButton';
import ViewCampusModal from '~/components/modal/ViewCampusModal';
import EditCampusModal from '~/components/modal/EditCampusModal';
import type { SchoolProfileData } from '~/lib/school-profile.server';

type SchoolProfileViewProps = SchoolProfileData & {
  addCampusReturnTo?: string;
};

function campusAddPath(schoolId: number, returnTo?: string): string {
  const path = `/schools/${schoolId}/campuses/new_campus`;
  if (!returnTo) {
    return path;
  }

  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function SchoolProfileView({
  school,
  campuses,
  totalTeachers,
  totalStudents,
  addCampusReturnTo,
}: SchoolProfileViewProps) {
  const { t } = useLanguage();
  const [campusQuery, setCampusQuery] = useState('');
  const [mainCampusOnly, setMainCampusOnly] = useState(false);

  if (!school) {
    return (
      <div className="min-h-screen space-y-6 pb-8">
        <PageHeader title={t('aboutSchool')} />
        <Card>
          <CardContent className="flex min-h-[240px] flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">{t('noSchoolOnProfile')}</h2>
            <Button asChild className="mt-4 bg-primary-gradient text-white">
              <Link to="/onboarding">{t('onboardSchool')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const schoolName = school.name;
  const schoolMotto = school.motto || t('noMotto');
  const schoolAddress = school.address || t('notProvided');
  const schoolPhone = school.phone || t('notProvided');
  const schoolEmail = school.email || t('notProvided');
  const registrationNumber = school.registrationNumber || t('notProvided');
  const logoUrl = school.logoUrl || '/assets/auth-page/yoyol-logo.png';
  const primaryColor = school.primaryColor || '#2563eb';
  const secondaryColor = school.secondaryColor || '#0f172a';
  const isArchived = school.status === 'archived';
  const visibleCampuses = campuses.filter((campus) => {
    const matchesName = campus.name
      .toLowerCase()
      .includes(campusQuery.trim().toLowerCase());
    return matchesName && (!mainCampusOnly || campus.isMain);
  });

  return (
    <div className="min-h-screen space-y-6 pb-8">
      <PageHeader
        title={t('aboutSchool')}
        actions={
          <>
            <Link to={`/schools/${school.id}`}>
              <Button className="flex items-center gap-2 bg-primary-gradient text-white transition-colors hover:bg-purple hover:text-white-600 hover:scale-110 cursor-pointer transition-all duration-300">
                <Pencil className="h-4 w-4" />
                {t('editSchool')}
              </Button>
            </Link>
            <Form method="post" action="/schools/access">
              <input type="hidden" name="schoolId" value={school.id} />
              <input type="hidden" name="intent" value={isArchived ? 'restore' : 'archive'} />
              <Button
                type="submit"
                variant="outline"
                className="cursor-pointer"
              >
                {isArchived ? t('restoreSchool') : t('archiveSchool')}
              </Button>
            </Form>
            <Button
              asChild
              className="flex items-center gap-2 bg-primary-gradient text-white hover:scale-110 hover:text-white-600 cursor-pointer transition-all duration-300"
            >
              <Link to={campusAddPath(school.id, addCampusReturnTo)}>
                <Plus size={18} />
                <span className="font-medium">{t('addCampus')}</span>
              </Link>
            </Button>
          </>
        }
      />

      <Card className="border-none shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${primaryColor}20`,
              }}
            >
              <Building2
                className="h-6 w-6"
                style={{
                  color: primaryColor,
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                {t('schoolName')}
              </p>
              <p className="truncate text-2xl font-bold">{schoolName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${primaryColor}15`,
                }}
              >
                <GraduationCap
                  className="h-6 w-6"
                  style={{
                    color: primaryColor,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('teachers')}
                </p>
                <p className="text-2xl font-bold">{totalTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${secondaryColor}15`,
                }}
              >
                <UserRound
                  className="h-6 w-6"
                  style={{
                    color: secondaryColor,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('students')}
                </p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${primaryColor}15`,
                }}
              >
                <Building2
                  className="h-6 w-6"
                  style={{
                    color: primaryColor,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('totalCampuses')}
                </p>
                <p className="text-2xl font-bold">{campuses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('campuses')}</CardTitle>
          <CardDescription>{t('campusesBelongToSchool')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isArchived ? (
            <p className="text-sm text-muted-foreground">{t('schoolArchived')}</p>
          ) : null}
          {campuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noCampusesYet')}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={campusQuery}
                  onChange={(event) => setCampusQuery(event.target.value)}
                  placeholder={t('campusSearch')}
                  aria-label={t('campusSearch')}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={mainCampusOnly}
                    onChange={(event) => setMainCampusOnly(event.target.checked)}
                  />
                  {t('mainCampusOnly')}
                </label>
              </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">{t('campusName')}</TableHead>
                    <TableHead className="font-semibold">{t('campusCode')}</TableHead>
                    <TableHead className="font-semibold">{t('address')}</TableHead>
                    <TableHead className="font-semibold">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCampuses.map((campus) => (
                    <TableRow key={campus.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          {campus.name}
                          {campus.isMain ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {t('mainCampusBadge')}
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>{campus.code}</TableCell>
                      <TableCell className="whitespace-normal">{campus.address || t('notProvided')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ViewCampusModal campus={campus} />
                          <EditCampusModal campus={campus} />
                          <DeleteButton
                            id={campus.id}
                            name={campus.name}
                            entityName="campus"
                            entityType="campus"
                            action={`/schools/${school.id}/campuses`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2
                className="h-5 w-5"
                style={{
                  color: primaryColor,
                }}
              />
              {schoolName}
            </CardTitle>
            <CardDescription>{schoolMotto}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('schoolName')}
                </p>
                <p className="text-2xl font-semibold">{school.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('motto')}
                </p>
                <p className="text-2xl">{school.motto || t('notProvided')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('registrationNumber')}
                </p>
                <p className="text-2xl">{registrationNumber}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  School ID
                </p>
                <p className="text-2xl">{school.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('officialLogo')}</CardTitle>
            <CardDescription>{t('officialLogo')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="flex h-[180px] items-center justify-center rounded-lg border p-6"
              style={{
                borderColor: `${primaryColor}40`,
              }}
            >
              <img
                src={logoUrl}
                alt={`${schoolName} logo`}
                className="max-h-[140px] max-w-full object-contain"
                onError={(event) => {
                  event.currentTarget.src = '/assets/auth-page/yoyol-logo.png';
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('howToReachUs')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('address')}</p>
                  <p className="text-sm text-muted-foreground">{schoolAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('phone')}</p>
                  <p className="text-sm text-muted-foreground">{schoolPhone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('email')}</p>
                  <p className="break-all text-sm text-muted-foreground">
                    {schoolEmail}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('registrationNumber')}</p>
                  <p className="text-sm text-muted-foreground">
                    {registrationNumber}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Colours
            </CardTitle>
            <CardDescription>
              Colours configured for this school.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Primary</p>
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  {primaryColor}
                </p>
              </div>
              <div
                className="h-10 w-10 rounded-md border shadow-sm"
                style={{
                  backgroundColor: primaryColor,
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Secondary</p>
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  {secondaryColor}
                </p>
              </div>
              <div
                className="h-10 w-10 rounded-md border shadow-sm"
                style={{
                  backgroundColor: secondaryColor,
                }}
              />
            </div>
            <div className="overflow-hidden rounded-lg border">
              <div
                className="px-4 py-3 text-sm font-semibold text-white"
                style={{
                  backgroundColor: primaryColor,
                }}
              >
                Primary Colour
              </div>
              <div
                className="px-4 py-3 text-sm font-semibold text-white"
                style={{
                  backgroundColor: secondaryColor,
                }}
              >
                Secondary Colour
              </div>
            </div>
            <Link className="text-sm underline" to={`/themes?schoolId=${school.id}`}>
              {t('openThemes')}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
