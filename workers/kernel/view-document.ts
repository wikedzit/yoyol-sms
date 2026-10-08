import { z } from 'zod';

const translatedText = z.object({
  t: z.string().min(1),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

const formattedText = z.discriminatedUnion('format', [
  z.object({ format: z.literal('money'), amountMinor: z.number().int(), currency: z.string().length(3) }),
  z.object({ format: z.literal('date'), value: z.string().min(1) }),
  z.object({ format: z.literal('number'), value: z.number(), style: z.enum(['decimal', 'percent']).optional() }),
]);

const textValue = z.union([z.string(), translatedText, formattedText]);
const tone = z.enum(['neutral', 'info', 'success', 'warning', 'danger']);

const appPath = z.string().refine((href) => {
  return href.startsWith('/') && !href.startsWith('//') && !href.includes('://');
}, 'Links must stay inside the app.');

type ViewNode = {
  type: string;
  [key: string]: unknown;
};

const viewNode: z.ZodType<ViewNode> = z.lazy(() => z.discriminatedUnion('type', [
  z.object({
    type: z.literal('section'),
    heading: textValue.optional(),
    description: textValue.optional(),
    body: z.array(viewNode),
  }),
  z.object({
    type: z.literal('card'),
    heading: textValue.optional(),
    body: z.array(viewNode),
    footer: z.array(viewNode).optional(),
  }),
  z.object({
    type: z.literal('grid'),
    columns: z.number().int().min(1).max(4),
    body: z.array(viewNode),
  }),
  z.object({
    type: z.literal('stats'),
    items: z.array(z.object({ label: textValue, value: textValue, tone: tone.optional() })),
  }),
  z.object({
    type: z.literal('text'),
    value: textValue,
    tone: tone.optional(),
    size: z.enum(['sm', 'md', 'lg']).optional(),
  }),
  z.object({
    type: z.literal('callout'),
    tone: z.enum(['info', 'success', 'warning', 'danger']),
    title: textValue.optional(),
    body: z.array(viewNode),
  }),
  z.object({
    type: z.literal('badge'),
    label: textValue,
    tone: tone.optional(),
  }),
  z.object({
    type: z.literal('descriptionList'),
    items: z.array(z.object({ label: textValue, value: textValue })),
  }),
  z.object({
    type: z.literal('link'),
    label: textValue,
    href: appPath,
    variant: z.enum(['primary', 'secondary']).optional(),
  }),
  z.object({
    type: z.literal('divider'),
  }),
  z.object({
    type: z.literal('button'),
    label: textValue,
    action: z.string().min(1),
    values: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    type: z.literal('sheet'),
    title: textValue,
    trigger: textValue,
    emphasis: z.enum(['primary', 'quiet', 'link']).optional(),
    body: z.array(viewNode),
  }),
  z.object({
    type: z.literal('actions'),
    body: z.array(viewNode),
  }),
  z.object({
    type: z.literal('form'),
    action: z.string().min(1),
    method: z.enum(['get', 'post']).optional(),
    fields: z.array(z.object({
      name: z.string().min(1),
      kind: z.enum(['hidden', 'text', 'date', 'select']),
      label: textValue.optional(),
      value: z.string().optional(),
      options: z.array(z.object({ value: z.string(), label: textValue })).optional(),
    })),
    submitLabel: textValue,
  }),
  z.object({
    type: z.literal('table'),
    columns: z.array(z.object({
      key: z.string().min(1),
      label: textValue,
      align: z.enum(['left', 'right']).optional(),
      wrap: z.boolean().optional(),
    })),
    toolbar: z.array(viewNode).optional(),
    rows: z.array(z.object({
      href: appPath.optional(),
      cells: z.record(z.string(), z.union([
        z.object({
          type: z.literal('badge'),
          label: textValue,
          tone: tone.optional(),
        }),
        z.object({
          type: z.literal('button'),
          label: textValue,
          action: z.string().min(1),
          values: z.record(z.string(), z.string()).optional(),
        }),
        z.object({
          type: z.literal('sheet'),
          title: textValue,
          trigger: textValue,
          emphasis: z.enum(['primary', 'quiet', 'link']).optional(),
          body: z.array(viewNode),
        }),
        z.object({
          type: z.literal('actions'),
          body: z.array(viewNode),
        }),
        textValue,
      ])),
    })),
    emptyText: textValue,
  }),
]));

export const viewDocumentSchema = z.object({
  viewVersion: z.literal(1),
  title: textValue,
  breadcrumbs: z.array(z.object({ label: textValue, href: appPath.optional() })).optional(),
  body: z.array(viewNode),
});

export type ViewDocument = z.infer<typeof viewDocumentSchema>;
export type ViewText = z.infer<typeof textValue>;

const maxDocumentBytes = 256 * 1024;

export function parseViewDocument(input: unknown): ViewDocument {
  const problem = viewDocumentError(input);
  if (problem) {
    throw new Error(problem);
  }
  return viewDocumentSchema.parse(input);
}

export function viewDocumentError(input: unknown): string | null {
  const encoded = JSON.stringify(input);
  if (encoded.length > maxDocumentBytes) {
    return 'This page is too large to show.';
  }
  const parsed = viewDocumentSchema.safeParse(input);
  if (parsed.success) {
    return null;
  }
  return parsed.error.issues.map((issue) => issue.message).join(' ');
}

export const view = {
  page(titleKey: string, body: ViewDocument['body']): ViewDocument {
    return { viewVersion: 1, title: { t: titleKey }, body };
  },
  text(key: string) {
    return { type: 'text' as const, value: { t: key } };
  },
};
