import { X } from 'lucide-react';
import { Form, Link } from 'react-router';
import { Button } from '~/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { ViewDocument, ViewText } from 'workers/kernel/view-document';
import { formatDate, formatMoney, formatNumber, translate, type AppLanguage } from 'workers/kernel/locale-format';

type Catalog = { en: Record<string, string>; sw: Record<string, string> };

export function ViewDocumentView({
  document,
  catalog,
  language,
  showTitle = true,
}: {
  document: ViewDocument;
  catalog: Catalog;
  language: AppLanguage;
  showTitle?: boolean;
}) {
  return (
    <div className="space-y-6">
      {showTitle ? (
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{renderText(document.title, catalog, language)}</h1>
        </header>
      ) : null}
      <div className="space-y-4">
        {document.body.map((node, index) => (
          <ViewNode key={index} node={node} catalog={catalog} language={language} />
        ))}
      </div>
    </div>
  );
}

function ViewNode({
  node,
  catalog,
  language,
  stacked = false,
}: {
  node: ViewDocument['body'][number];
  catalog: Catalog;
  language: AppLanguage;
  stacked?: boolean;
}) {
  if (node.type === 'text') {
    return <p className="text-sm text-foreground">{renderText(node.value, catalog, language)}</p>;
  }
  if (node.type === 'callout' && Array.isArray(node.body)) {
    return (
      <div className="rounded-md border p-4 text-sm">
        {node.title ? <p className="font-medium">{renderText(node.title, catalog, language)}</p> : null}
        {node.body.map((child, index) => (
          <ViewNode key={index} node={child as ViewDocument['body'][number]} catalog={catalog} language={language} />
        ))}
      </div>
    );
  }
  if (node.type === 'section' && Array.isArray(node.body)) {
    return (
      <section className="space-y-2">
        {node.heading ? <h2 className="text-lg font-semibold">{renderText(node.heading, catalog, language)}</h2> : null}
        {node.body.map((child, index) => (
          <ViewNode key={index} node={child as ViewDocument['body'][number]} catalog={catalog} language={language} />
        ))}
      </section>
    );
  }
  if (node.type === 'badge') {
    return <span className="inline-flex rounded-full border px-2 py-0.5 text-xs">{renderText(node.label, catalog, language)}</span>;
  }
  if (node.type === 'link' && typeof node.href === 'string') {
    return <a className="text-sm underline" href={node.href}>{renderText(node.label, catalog, language)}</a>;
  }
  if (node.type === 'divider') {
    return <hr />;
  }
  if (node.type === 'descriptionList' && Array.isArray(node.items)) {
    return (
      <dl className="grid gap-4 sm:grid-cols-3">
        {node.items.map((item, index) => {
          if (!item || typeof item !== 'object' || !('label' in item)) return null;
          return (
            <div key={index}>
              <dt className="text-sm text-muted-foreground">{renderText(item.label, catalog, language)}</dt>
              <dd className="text-sm font-medium">{renderText('value' in item ? item.value : '', catalog, language)}</dd>
            </div>
          );
        })}
      </dl>
    );
  }
  if (node.type === 'actions' && Array.isArray(node.body)) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {node.body.map((child, index) => (
          <ViewNode key={index} node={child as ViewDocument['body'][number]} catalog={catalog} language={language} />
        ))}
      </div>
    );
  }
  if (node.type === 'sheet' && Array.isArray(node.body)) {
    return (
      <RecordSheet
        title={node.title}
        trigger={node.trigger}
        emphasis={node.emphasis === 'primary' ? 'primary' : node.emphasis === 'link' ? 'link' : 'quiet'}
        body={node.body}
        catalog={catalog}
        language={language}
      />
    );
  }
  if (node.type === 'table' && Array.isArray(node.columns) && Array.isArray(node.rows)) {
    const columns = node.columns.flatMap((column) => {
      if (!column || typeof column !== 'object' || !('key' in column) || typeof column.key !== 'string') return [];
      return [column];
    });
    const toolbar = Array.isArray(node.toolbar) ? node.toolbar : [];
    return (
      <div className="space-y-3">
        {toolbar.length > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {toolbar.map((child, index) => (
              <ViewNode key={index} node={child as ViewDocument['body'][number]} catalog={catalog} language={language} />
            ))}
          </div>
        ) : null}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`font-semibold ${'align' in column && column.align === 'right' ? 'text-right' : ''}`}
                >
                  {renderText('label' in column ? column.label : column.key, catalog, language)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {node.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(columns.length, 1)} className="whitespace-normal text-muted-foreground">
                  {renderText(node.emptyText, catalog, language)}
                </TableCell>
              </TableRow>
            ) : node.rows.map((row, rowIndex) => {
              const href = row && typeof row === 'object' && 'href' in row && typeof row.href === 'string' ? row.href : '';
              const cells = row && typeof row === 'object' && 'cells' in row && row.cells && typeof row.cells === 'object'
                ? row.cells as Record<string, unknown>
                : {};
              return (
                <TableRow key={rowIndex}>
                  {columns.map((column, columnIndex) => (
                    <TableCell
                      key={column.key}
                      className={`${'wrap' in column && column.wrap ? 'whitespace-normal' : ''} ${'align' in column && column.align === 'right' ? 'text-right' : ''}`}
                    >
                      <TableCellValue
                        value={cells[column.key]}
                        href={columnIndex === 0 ? href : ''}
                        catalog={catalog}
                        language={language}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      </div>
    );
  }
  if (node.type === 'button' && typeof node.action === 'string') {
    const values = node.values && typeof node.values === 'object'
      ? Object.entries(node.values).flatMap(([name, value]) => typeof value === 'string' ? [[name, value] as const] : [])
      : [];
    return (
      <Form method="post">
        <input type="hidden" name="_action" value={node.action} />
        {values.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button type="submit" variant="outline" size="sm">{renderText(node.label, catalog, language)}</Button>
      </Form>
    );
  }
  if (node.type === 'form' && typeof node.action === 'string' && Array.isArray(node.fields)) {
    const method = node.method === 'get' ? 'get' : 'post';
    return (
      <Form method={method} action={method === 'get' ? node.action : undefined} className={stacked ? 'flex flex-col gap-4' : 'flex flex-wrap items-end gap-2'}>
        {method === 'post' ? <input type="hidden" name="_action" value={node.action} /> : null}
        {node.fields.map((field) => {
          if (!field || typeof field !== 'object') return null;
          const name = 'name' in field && typeof field.name === 'string' ? field.name : '';
          const kind = 'kind' in field && typeof field.kind === 'string' ? field.kind : 'text';
          const value = 'value' in field && typeof field.value === 'string' ? field.value : '';
          const label = 'label' in field ? field.label : undefined;
          const options = 'options' in field && Array.isArray(field.options) ? field.options : [];
          return (
            <label key={name} className={kind === 'hidden' ? 'hidden' : `flex flex-col gap-1 text-sm ${stacked ? 'w-full' : ''}`}>
              {label ? <span>{renderText(label, catalog, language)}</span> : null}
              {kind === 'select' ? (
                <select name={name} defaultValue={value} className={`h-9 rounded-md border px-3 text-sm ${stacked ? 'w-full' : ''}`}>
                  {options.map((option) => {
                    if (!option || typeof option !== 'object' || !('value' in option)) return null;
                    const optionValue = String(option.value);
                    return (
                      <option key={optionValue} value={optionValue}>
                        {renderText('label' in option ? option.label : optionValue, catalog, language)}
                      </option>
                    );
                  })}
                </select>
              ) : name === 'csv' ? (
                // A spreadsheet has several lines. A one-line box would drop them.
                <textarea
                  name={name}
                  defaultValue={value}
                  rows={4}
                  className="min-w-72 rounded-md border px-3 py-2 text-sm"
                />
              ) : (
                <input
                  type={kind === 'date' ? 'date' : kind === 'hidden' ? 'hidden' : 'text'}
                  name={name}
                  defaultValue={value}
                  className={kind === 'hidden' ? undefined : `h-9 rounded-md border px-3 text-sm ${stacked ? 'w-full' : ''}`}
                />
              )}
            </label>
          );
        })}
        <Button type="submit">{renderText(node.submitLabel, catalog, language)}</Button>
      </Form>
    );
  }
  return <p className="text-sm text-muted-foreground">This page could not be shown.</p>;
}

function RecordSheet({
  title,
  trigger,
  emphasis,
  body,
  compact = false,
  catalog,
  language,
}: {
  title: unknown;
  trigger: unknown;
  emphasis: 'primary' | 'quiet' | 'link';
  body: unknown[];
  compact?: boolean;
  catalog: Catalog;
  language: AppLanguage;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant={emphasis === 'primary' ? 'default' : emphasis === 'link' ? 'link' : 'outline'}
          size={emphasis === 'link' ? 'sm' : compact ? 'sm' : 'default'}
          className={emphasis === 'link' ? 'h-auto px-0 font-medium text-foreground underline' : undefined}
        >
          {renderText(trigger, catalog, language)}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full max-w-full overflow-y-auto bg-card p-6 text-card-foreground sm:max-w-[90%] md:w-[573px] md:max-w-[573px] md:p-10"
      >
        <div className="flex items-center justify-between">
          <SheetHeader className="p-0">
            <SheetTitle className="text-xl font-semibold md:text-2xl">
              {renderText(title, catalog, language)}
            </SheetTitle>
          </SheetHeader>
          <SheetClose className="cursor-pointer text-muted-foreground" aria-label="Close">
            <X size={25} />
          </SheetClose>
        </div>
        <div className="space-y-4">
          {body.map((child, index) => (
            <ViewNode
              key={index}
              node={child as ViewDocument['body'][number]}
              catalog={catalog}
              language={language}
              stacked
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TableCellValue({
  value,
  href,
  catalog,
  language,
}: {
  value: unknown;
  href: string;
  catalog: Catalog;
  language: AppLanguage;
}) {
  if (value && typeof value === 'object' && 'type' in value && value.type === 'badge') {
    const tone = 'tone' in value && value.tone === 'success' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${tone}`}>
        {renderText('label' in value ? value.label : '', catalog, language)}
      </span>
    );
  }
  if (value && typeof value === 'object' && 'type' in value && value.type === 'actions' && Array.isArray('body' in value ? value.body : null)) {
    const body = value.body as unknown[];
    return (
      <div className="flex flex-wrap items-center gap-2">
        {body.map((child, index) => (
          <ViewNode key={index} node={child as ViewDocument['body'][number]} catalog={catalog} language={language} />
        ))}
      </div>
    );
  }
  if (value && typeof value === 'object' && 'type' in value && value.type === 'sheet' && Array.isArray('body' in value ? value.body : null)) {
    const emphasis = 'emphasis' in value && value.emphasis === 'primary'
      ? 'primary'
      : 'emphasis' in value && value.emphasis === 'link'
        ? 'link'
        : 'quiet';
    return (
      <RecordSheet
        title={'title' in value ? value.title : ''}
        trigger={'trigger' in value ? value.trigger : ''}
        emphasis={emphasis}
        body={value.body as unknown[]}
        compact
        catalog={catalog}
        language={language}
      />
    );
  }
  if (value && typeof value === 'object' && 'type' in value && value.type === 'button' && 'action' in value && typeof value.action === 'string') {
    const values = 'values' in value && value.values && typeof value.values === 'object'
      ? Object.entries(value.values).flatMap(([name, item]) => typeof item === 'string' ? [[name, item] as const] : [])
      : [];
    return (
      <Form method="post">
        <input type="hidden" name="_action" value={value.action} />
        {values.map(([name, item]) => (
          <input key={name} type="hidden" name={name} value={item} />
        ))}
        <Button type="submit" variant="outline" size="sm">{renderText('label' in value ? value.label : '', catalog, language)}</Button>
      </Form>
    );
  }
  const text = renderText(value, catalog, language);
  if (href) {
    return <Link className="font-medium underline" to={href}>{text}</Link>;
  }
  return text;
}

export function renderText(value: unknown, catalog: Catalog, language: AppLanguage): string {
  if (typeof value === 'string') {
    return value;
  }
  if (!value || typeof value !== 'object') {
    return '';
  }
  const text = value as ViewText & { format?: string; amountMinor?: number; currency?: string; style?: 'decimal' | 'percent' };
  if ('t' in text && typeof text.t === 'string') {
    const params = 'params' in text && text.params && typeof text.params === 'object' ? text.params : undefined;
    return translate(catalog, language, text.t, params);
  }
  if (text.format === 'date' && 'value' in text && typeof text.value === 'string') {
    return formatDate(text.value, language);
  }
  if (text.format === 'money' && typeof text.amountMinor === 'number') {
    return formatMoney(text.amountMinor, text.currency ?? '', language);
  }
  if (text.format === 'number' && 'value' in text && typeof text.value === 'number') {
    return formatNumber(text.value, language, text.style === 'percent' ? 'percent' : 'decimal');
  }
  return '';
}
