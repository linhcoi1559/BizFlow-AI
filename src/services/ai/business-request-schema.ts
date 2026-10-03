import { z } from "zod";

const nullableString = (max: number) => z.string().trim().max(max).nullable();
const nullableNumber = z.number().finite().nonnegative().nullable();

export const businessRequestInputSchema = z.object({
  request: z
    .string()
    .trim()
    .min(20, "Mô tả yêu cầu bằng ít nhất 20 ký tự.")
    .max(5000, "Yêu cầu không được vượt quá 5.000 ký tự."),
});

export const rawBusinessRequestSchema = z
  .object({
    client: z
      .object({
        companyName: nullableString(160),
        taxCode: nullableString(60),
        address: nullableString(300),
        representativeName: nullableString(140),
        representativeTitle: nullableString(140),
        email: nullableString(180),
        phone: nullableString(60),
      })
      .strict(),
    project: z
      .object({
        name: nullableString(180),
        description: nullableString(3000),
        serviceType: nullableString(160),
        startDate: nullableString(20),
        endDate: nullableString(20),
        durationMonths: z.number().int().positive().max(120).nullable(),
        monthlyFee: nullableNumber,
        totalValue: nullableNumber,
        currency: nullableString(3),
        ownerName: nullableString(140),
        kpi: nullableString(600),
      })
      .strict(),
    missingFields: z.array(z.string().trim().min(1).max(160)).max(30),
    suggestedDocuments: z.array(z.string().trim().min(1).max(160)).max(20),
  })
  .strict();

export const businessRequestResponseJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    client: {
      type: "object",
      additionalProperties: false,
      properties: {
        companyName: { anyOf: [{ type: "string" }, { type: "null" }] },
        taxCode: { anyOf: [{ type: "string" }, { type: "null" }] },
        address: { anyOf: [{ type: "string" }, { type: "null" }] },
        representativeName: { anyOf: [{ type: "string" }, { type: "null" }] },
        representativeTitle: { anyOf: [{ type: "string" }, { type: "null" }] },
        email: { anyOf: [{ type: "string" }, { type: "null" }] },
        phone: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      required: [
        "companyName",
        "taxCode",
        "address",
        "representativeName",
        "representativeTitle",
        "email",
        "phone",
      ],
    },
    project: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { anyOf: [{ type: "string" }, { type: "null" }] },
        description: { anyOf: [{ type: "string" }, { type: "null" }] },
        serviceType: { anyOf: [{ type: "string" }, { type: "null" }] },
        startDate: {
          anyOf: [{ type: "string", format: "date" }, { type: "null" }],
        },
        endDate: {
          anyOf: [{ type: "string", format: "date" }, { type: "null" }],
        },
        durationMonths: {
          anyOf: [
            { type: "integer", minimum: 1, maximum: 120 },
            { type: "null" },
          ],
        },
        monthlyFee: {
          anyOf: [{ type: "number", minimum: 0 }, { type: "null" }],
        },
        totalValue: {
          anyOf: [{ type: "number", minimum: 0 }, { type: "null" }],
        },
        currency: { anyOf: [{ type: "string" }, { type: "null" }] },
        ownerName: { anyOf: [{ type: "string" }, { type: "null" }] },
        kpi: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      required: [
        "name",
        "description",
        "serviceType",
        "startDate",
        "endDate",
        "durationMonths",
        "monthlyFee",
        "totalValue",
        "currency",
        "ownerName",
        "kpi",
      ],
    },
    missingFields: { type: "array", items: { type: "string" }, maxItems: 30 },
    suggestedDocuments: {
      type: "array",
      items: { type: "string" },
      maxItems: 20,
    },
  },
  required: ["client", "project", "missingFields", "suggestedDocuments"],
  propertyOrdering: ["client", "project", "missingFields", "suggestedDocuments"],
};

export const businessRequestDraftSchema = z.object({
  client: z.object({
    companyName: z.string(),
    taxCode: z.string(),
    address: z.string(),
    representativeName: z.string(),
    representativeTitle: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  project: z.object({
    name: z.string(),
    description: z.string(),
    serviceType: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    durationMonths: z.number().int().positive().nullable(),
    monthlyFee: z.number().nonnegative().nullable(),
    totalValue: z.number().nonnegative().nullable(),
    currency: z.string(),
    ownerName: z.string(),
    kpi: z.string(),
  }),
  missingFields: z.array(z.string()),
  suggestedDocuments: z.array(z.string()),
});

export type BusinessRequestDraft = z.infer<typeof businessRequestDraftSchema>;

const optionalFormText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Không được vượt quá ${max} ký tự.`)
    .transform((value) => value || null);

const optionalNumberField = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce
      .number({ error: "Nhập một số hợp lệ." })
      .finite()
      .nonnegative("Giá trị không được âm.")
      .max(max, "Giá trị quá lớn.")
      .nullable(),
  );

const optionalIntegerField = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce
    .number({ error: "Nhập thời lượng hợp lệ." })
    .int("Thời lượng phải là số tháng nguyên.")
    .min(1)
    .max(120)
    .nullable(),
);

const optionalDateField = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Nhập ngày hợp lệ.",
  )
  .transform((value) => value || null);

export const confirmBusinessRequestSchema = z
  .object({
    originalRequest: z.string().trim().min(20).max(5000),
    clientResolution: z
      .string()
      .refine(
        (value) => value === "create" || value.startsWith("existing:"),
        "Chọn cách xử lý khách hàng.",
      ),
    reviewedDuplicateIds: z.string().max(2000),
    clientCompanyName: z.string().trim().min(2, "Cần nhập tên công ty.").max(160),
    clientTaxCode: optionalFormText(60),
    clientAddress: optionalFormText(300),
    clientRepresentativeName: optionalFormText(140),
    clientRepresentativeTitle: optionalFormText(140),
    clientEmail: z
      .string()
      .trim()
      .refine((value) => !value || z.email().safeParse(value).success, "Nhập email hợp lệ.")
      .transform((value) => value || null),
    clientPhone: optionalFormText(60),
    projectName: z.string().trim().min(3, "Cần nhập tên dự án.").max(180),
    projectDescription: optionalFormText(3000),
    projectServiceType: z.string().trim().min(2, "Cần nhập loại dịch vụ.").max(160),
    projectStartDate: optionalDateField,
    projectEndDate: optionalDateField,
    projectDurationMonths: optionalIntegerField,
    projectMonthlyFee: optionalNumberField(100_000_000_000_000),
    projectTotalValue: optionalNumberField(100_000_000_000_000),
    projectCurrency: z
      .string()
      .trim()
      .length(3, "Dùng mã tiền tệ gồm 3 chữ cái.")
      .transform((value) => value.toUpperCase()),
    projectOwnerName: optionalFormText(140),
    projectKpi: optionalFormText(600),
    missingFields: z.string().max(4000),
    suggestedDocuments: z.string().max(4000),
  })
  .superRefine((data, context) => {
    if (
      data.projectStartDate &&
      data.projectEndDate &&
      new Date(`${data.projectEndDate}T00:00:00Z`) <
        new Date(`${data.projectStartDate}T00:00:00Z`)
    ) {
      context.addIssue({
        code: "custom",
        path: ["projectEndDate"],
        message: "Ngày kết thúc phải cùng ngày hoặc sau ngày bắt đầu.",
      });
    }
  });
