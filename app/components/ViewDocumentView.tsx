import { Form } from 'react-router';
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
}: {
  node: ViewDocument['body'][number];
  catalog: Catalog;
  language: AppLanguage;
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
        <button type="submit" className="h-9 rounded-md border px-3 text-sm">{renderText(node.label, catalog, language)}</button>
      </Form>
    );
  }
  if (node.type === 'form' && typeof node.action === 'string' && Array.isArray(node.fields)) {
    const method = node.method === 'get' ? 'get' : 'post';
    return (
      <Form method={method} action={method === 'get' ? node.action : undefined} className="flex flex-wrap items-end gap-2">
        {method === 'post' ? <input type="hidden" name="_action" value={node.action} /> : null}
        {node.fields.map((field) => {
          if (!field || typeof field !== 'object') return null;
          const name = 'name' in field && typeof field.name === 'string' ? field.name : '';
          const kind = 'kind' in field && typeof field.kind === 'string' ? field.kind : 'text';
          const value = 'value' in field && typeof field.value === 'string' ? field.value : '';
          const label = 'label' in field ? field.label : undefined;
          const options = 'options' in field && Array.isArray(field.options) ? field.options : [];
          return (
            <label key={name} className={kind === 'hidden' ? 'hidden' : 'flex flex-col gap-1 text-sm'}>
              {label ? <span>{renderText(label, catalog, language)}</span> : null}
              {kind === 'select' ? (
                <select name={name} defaultValue={value} className="h-9 rounded-md border px-3 text-sm">
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
                  className={kind === 'hidden' ? undefined : 'h-9 rounded-md border px-3 text-sm'}
                />
              )}
            </label>
          );
        })}
        <button type="submit" className="h-9 rounded-md border px-3 text-sm">{renderText(node.submitLabel, catalog, language)}</button>
      </Form>
    );
  }
  return <p className="text-sm text-muted-foreground">This page could not be shown.</p>;
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
