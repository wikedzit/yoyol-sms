import { useState } from 'react';
import { Link } from 'react-router';
import { Search } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { PaginationControls } from '~/components/shared/PaginationControls';
import { usePagination } from '~/hooks/usePagination';
import { useLanguage, type TranslationKey } from '~/lib/i18n';
import type { InstalledExtension } from 'workers/services/extensions';

const modulesPerPage = 10;

type ModuleStatusFilter = 'all' | 'included' | 'enabled' | 'disabled' | 'removed' | 'available';

export function ModuleCatalogTable({
  modules,
  schoolId,
}: {
  modules: InstalledExtension[];
  schoolId: number;
}) {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ModuleStatusFilter>('all');
  const filteredModules = modules.filter((module) => {
    const name = language === 'sw' ? module.nameSw : module.nameEn;
    const description = language === 'sw' ? module.descriptionSw : module.descriptionEn;
    const query = search.trim().toLowerCase();
    const matchesSearch = query.length === 0
      || name.toLowerCase().includes(query)
      || description.toLowerCase().includes(query);
    return matchesSearch && matchesStatus(module, statusFilter);
  });
  const {
    currentPage,
    totalPages,
    paginatedItems,
    startIndex,
    setCurrentPage,
  } = usePagination(filteredModules, modulesPerPage);

  function updateSearch(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function updateStatus(value: string) {
    setStatusFilter(isStatusFilter(value) ? value : 'all');
    setCurrentPage(1);
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('searchModules')}
              className="bg-muted/50 pl-10"
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={updateStatus}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder={t('filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="included">{t('extensionIncluded')}</SelectItem>
              <SelectItem value="enabled">{t('extensionOn')}</SelectItem>
              <SelectItem value="disabled">{t('extensionOffStatus')}</SelectItem>
              <SelectItem value="removed">{t('moduleFilterRemoved')}</SelectItem>
              <SelectItem value="available">{t('extensionNotInstalled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noModules')}</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold">SN</TableHead>
                  <TableHead className="font-semibold">{t('name')}</TableHead>
                  <TableHead className="font-semibold">{t('moduleDescription')}</TableHead>
                  <TableHead className="font-semibold">{t('extensionVersion')}</TableHead>
                  <TableHead className="font-semibold">{t('status')}</TableHead>
                  <TableHead className="text-right font-semibold">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      {t('noModulesMatch')}
                    </TableCell>
                  </TableRow>
                ) : paginatedItems.map((module, index) => {
                  const name = language === 'sw' ? module.nameSw : module.nameEn;
                  const description = language === 'sw' ? module.descriptionSw : module.descriptionEn;
                  return (
                    <TableRow key={module.key}>
                      <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <Link className="underline" to={modulePath(module.key, schoolId)}>
                          {name}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{description}</TableCell>
                      <TableCell>{module.version}</TableCell>
                      <TableCell>
                        <Badge
                          variant={module.status === 'enabled' ? 'default' : 'outline'}
                          className="border-none"
                        >
                          {moduleStatusLabel(module, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={modulePath(module.key, schoolId)}>{t('openExtension')}</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </CardContent>
    </Card>
  );
}

export function modulePath(moduleKey: string, schoolId: number): string {
  return `/modules/${moduleKey}?schoolId=${schoolId}`;
}

export function moduleStatusLabel(
  module: Pick<InstalledExtension, 'status' | 'required'>,
  t: (key: TranslationKey) => string,
): string {
  if (module.required) {
    return t('extensionIncluded');
  }
  if (module.status === 'enabled') {
    return t('extensionOn');
  }
  if (module.status === 'disabled') {
    return t('extensionOffStatus');
  }
  if (module.status === 'removed') {
    return t('extensionRemoved');
  }
  return t('extensionNotInstalled');
}

function matchesStatus(module: InstalledExtension, filter: ModuleStatusFilter): boolean {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'included') {
    return module.required;
  }
  if (module.required) {
    return false;
  }
  return module.status === filter;
}

function isStatusFilter(value: string): value is ModuleStatusFilter {
  return value === 'all'
    || value === 'included'
    || value === 'enabled'
    || value === 'disabled'
    || value === 'removed'
    || value === 'available';
}
