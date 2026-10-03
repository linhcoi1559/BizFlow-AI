import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự`)
    .transform((value) => value || null);

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => !value || z.email().safeParse(value).success, {
    message: "Nhập địa chỉ email hợp lệ",
  })
  .transform((value) => value || null);

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => !value || z.url().safeParse(value).success, {
    message: "Nhập URL đầy đủ, bao gồm https://",
  })
  .transform((value) => value || null);

export const clientSchema = z.object({
  id: z.string().optional(),
  companyName: z
    .string()
    .trim()
    .min(2, "Tên công ty phải có ít nhất 2 ký tự")
    .max(120),
  taxCode: optionalText(50),
  address: optionalText(240),
  representativeName: optionalText(120),
  representativeTitle: optionalText(120),
  email: optionalEmail,
  phone: optionalText(50),
  website: optionalUrl,
  notes: optionalText(1200),
  status: z.enum(["active", "inactive", "archived"]),
});

const optionalDate = z
  .string()
  .trim()
  .refine((value) => !value || !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Nhập ngày hợp lệ",
  })
  .transform((value) => value || null);

export const projectSchema = z
  .object({
    clientId: z.string().min(1, "Chọn khách hàng"),
    name: z
      .string()
      .trim()
      .min(3, "Tên dự án phải có ít nhất 3 ký tự")
      .max(160),
    description: optionalText(2400),
    serviceType: optionalText(120),
    status: z.enum([
      "draft",
      "planning",
      "active",
      "paused",
      "completed",
      "cancelled",
    ]),
    startDate: optionalDate,
    endDate: optionalDate,
    totalValue: z.coerce
      .number({ error: "Nhập giá trị dự án hợp lệ" })
      .min(0, "Giá trị dự án không được âm")
      .max(100_000_000_000_000, "Giá trị dự án quá lớn"),
    currency: z
      .string()
      .trim()
      .min(3, "Nhập mã tiền tệ gồm 3 chữ cái")
      .max(3)
      .transform((value) => value.toUpperCase()),
    ownerName: optionalText(120),
    progress: z.coerce
      .number({ error: "Nhập phần trăm hợp lệ" })
      .int("Tiến độ phải là số nguyên")
      .min(0)
      .max(100),
    kpi: optionalText(500),
  })
  .superRefine((data, context) => {
    if (
      data.startDate &&
      data.endDate &&
      new Date(data.endDate) < new Date(data.startDate)
    ) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu",
      });
    }
  });

export const companyProfileSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Tên công ty phải có ít nhất 2 ký tự")
    .max(120),
  taxCode: optionalText(50),
  address: optionalText(240),
  representativeName: optionalText(120),
  representativeTitle: optionalText(120),
  email: optionalEmail,
  phone: optionalText(50),
  website: optionalUrl,
  bankName: optionalText(120),
  bankAccount: optionalText(80),
});
