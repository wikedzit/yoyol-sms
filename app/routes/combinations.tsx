import { Form, redirect, useActionData, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '~/components/ui/button';
import { PageFrame } from '~/components/ui/PageFrame';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { useLanguage } from '~/lib/i18n';
import { requireSchoolPermission } from '~/lib/require-school-permission';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  const [combinations, subjects] = await Promise.all([
    context.services.combinations.list(),
    context.services.combinations.aLevelSubjects(),
  ]);
  return { combinations, subjects };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.update');
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const combinations = context.services.combinations;

  if (intent === 'create') {
    const result = await combinations.create(String(form.get('name') ?? ''));
    if ('error' in result) {
      return result;
    }
    return redirect('/combinations');
  }

  const combinationId = Number(form.get('combinationId'));
  if (!Number.isInteger(combinationId) || combinationId < 1) {
    return { error: 'That combination was not found.' };
  }

  if (intent === 'retire') {
    const result = await combinations.retire(combinationId);
    if ('error' in result) {
      return result;
    }
    return redirect('/combinations');
  }

  const subjectId = Number(form.get('subjectId'));
  if (!Number.isInteger(subjectId) || subjectId < 1) {
    return { error: 'Choose a subject.' };
  }

  const result = intent === 'remove'
    ? await combinations.removeSubject(combinationId, subjectId)
    : await combinations.addSubject(combinationId, subjectId);
  if ('error' in result) {
    return result;
  }
  return redirect('/combinations');
}

export default function CombinationsPage() {
  const { combinations, subjects } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { t } = useLanguage();

  return (
    <PageFrame title={t('combinations')} description={t('combinationsDescription')}>
      {result && 'error' in result ? <p className="text-sm text-destructive">{result.error}</p> : null}
      <Form method="post" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="intent" value="create" />
        <input
          name="name"
          required
          placeholder={t('combinationName')}
          aria-label={t('combinationName')}
          className="h-9 rounded-md border px-3 text-sm"
        />
        <Button type="submit">{t('addCombination')}</Button>
      </Form>
      {combinations.length === 0 ? <p>{t('noCombinations')}</p> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t('combinationName')}</TableHead>
                <TableHead className="font-semibold">{t('status')}</TableHead>
                <TableHead className="font-semibold">{t('subjects')}</TableHead>
                <TableHead className="font-semibold">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinations.map((combination) => (
                <TableRow key={combination.id}>
                  <TableCell className="font-medium">{combination.name}</TableCell>
                  <TableCell>
                    {combination.status === 'retired' ? t('combinationRetired') : combination.status}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {combination.subjects.length === 0 ? (
                      <span className="text-muted-foreground">{t('combinationNoSubjects')}</span>
                    ) : (
                      <ul className="space-y-1">
                        {combination.subjects.map((subject) => (
                          <li key={subject.id} className="flex items-center gap-2">
                            <span>{subject.name} ({subject.code})</span>
                            {combination.status === 'active' ? (
                              <Form method="post">
                                <input type="hidden" name="intent" value="remove" />
                                <input type="hidden" name="combinationId" value={combination.id} />
                                <input type="hidden" name="subjectId" value={subject.id} />
                                <Button type="submit" size="sm" variant="outline">{t('removeCombinationSubject')}</Button>
                              </Form>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell>
                    {combination.status === 'active' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Form method="post" className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="intent" value="add" />
                          <input type="hidden" name="combinationId" value={combination.id} />
                          <select name="subjectId" aria-label={t('addCombinationSubject')} className="h-8 rounded-md border px-2 text-sm" required>
                            <option value="">{t('addCombinationSubject')}</option>
                            {subjects.map((subject) => (
                              <option key={subject.id} value={subject.id}>{subject.name} ({subject.code})</option>
                            ))}
                          </select>
                          <Button type="submit" size="sm">{t('addCombinationSubject')}</Button>
                        </Form>
                        <Form method="post">
                          <input type="hidden" name="intent" value="retire" />
                          <input type="hidden" name="combinationId" value={combination.id} />
                          <Button type="submit" size="sm" variant="outline">{t('retireCombination')}</Button>
                        </Form>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageFrame>
  );
}
