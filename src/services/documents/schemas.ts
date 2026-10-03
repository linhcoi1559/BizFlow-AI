import { z } from "zod";

export const documentTypes = [
  "proposal",
  "quotation",
  "contract",
  "other",
] as const;

export const documentTypeSchema = z.enum(documentTypes);

export const templateSectionSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, "Dùng mã mục viết thường"),
  heading: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(8_000),
});

export const templateContentSchema = z
  .object({
    titlePattern: z.string().trim().min(3).max(200),
    sections: z.array(templateSectionSchema).min(1).max(12),
    paymentTerms: z.string().trim().max(4_000).default(""),
    notes: z.string().trim().max(4_000).default(""),
  })
  .superRefine((value, context) => {
    const keys = new Set<string>();
    for (const [index, section] of value.sections.entries()) {
      if (keys.has(section.key)) {
        context.addIssue({
          code: "custom",
          path: ["sections", index, "key"],
          message: "Mã các mục không được trùng nhau",
        });
      }
      keys.add(section.key);
    }
  });

export const documentSectionSchema = z.object({
  key: z.string().trim().min(1).max(50),
  heading: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(12_000),
});

export const documentLineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(40),
  unitPrice: z.number().min(0).max(100_000_000_000_000),
});

export const documentContentSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    sections: z.array(documentSectionSchema).min(1).max(12),
    lineItems: z.array(documentLineItemSchema).min(1).max(30),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    totalValue: z.number().min(0).max(100_000_000_000_000),
    paymentTerms: z.string().trim().max(4_000),
    notes: z.string().trim().max(4_000),
  })
  .superRefine((value, context) => {
    const keys = new Set<string>();
    for (const [index, section] of value.sections.entries()) {
      if (keys.has(section.key)) {
        context.addIssue({
          code: "custom",
          path: ["sections", index, "key"],
          message: "Mã các mục không được trùng nhau",
        });
      }
      keys.add(section.key);
    }
  });

export const templateFormSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(3, "Tên mẫu phải có ít nhất 3 ký tự").max(120),
  description: z.string().trim().max(500).transform((value) => value || null),
  type: documentTypeSchema,
  titlePattern: z.string().trim().min(3).max(200),
  summaryHeading: z.string().trim().min(1).max(120),
  summaryBody: z.string().trim().min(1).max(8_000),
  scopeHeading: z.string().trim().min(1).max(120),
  scopeBody: z.string().trim().min(1).max(8_000),
  timelineHeading: z.string().trim().min(1).max(120),
  timelineBody: z.string().trim().min(1).max(8_000),
  kpiHeading: z.string().trim().min(1).max(120),
  kpiBody: z.string().trim().min(1).max(8_000),
  legalHeading: z.string().trim().min(1).max(120),
  legalBody: z.string().trim().min(1).max(8_000),
  paymentTerms: z.string().trim().max(4_000),
  notes: z.string().trim().max(4_000),
  changeNote: z.string().trim().max(300).transform((value) => value || null),
});

export type TemplateContent = z.infer<typeof templateContentSchema>;
export type DocumentContent = z.infer<typeof documentContentSchema>;
export type DocumentTypeValue = z.infer<typeof documentTypeSchema>;

export function templateContentFromForm(
  input: z.infer<typeof templateFormSchema>,
): TemplateContent {
  return templateContentSchema.parse({
    titlePattern: input.titlePattern,
    sections: [
      { key: "summary", heading: input.summaryHeading, body: input.summaryBody },
      { key: "scope", heading: input.scopeHeading, body: input.scopeBody },
      { key: "timeline", heading: input.timelineHeading, body: input.timelineBody },
      { key: "kpi", heading: input.kpiHeading, body: input.kpiBody },
      { key: "legal", heading: input.legalHeading, body: input.legalBody },
    ],
    paymentTerms: input.paymentTerms,
    notes: input.notes,
  });
}
