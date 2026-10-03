import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null);

const optionalDate = z
  .string()
  .trim()
  .refine((value) => !value || !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
        message: "Nhập ngày hợp lệ",
  })
  .transform((value) => value || null);

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export const taskStatuses = ["todo", "in_progress", "blocked", "completed", "cancelled"] as const;
export const paymentStatuses = ["scheduled", "invoiced", "paid", "overdue", "waived"] as const;
export const reminderStatuses = ["pending", "completed", "dismissed"] as const;
export const reminderTypes = ["task", "payment", "milestone", "general"] as const;

export const planItemInputSchema = z.object({
    title: z.string().trim().min(2, "Cần nhập tên cột mốc").max(160),
  description: optionalText(2_000),
  ownerName: optionalText(120),
  startDate: optionalDate,
  dueDate: optionalDate,
  priority: z.enum(taskPriorities),
  paymentPercent: z.coerce.number().min(0).max(100),
});

export const planDraftInputSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(3).max(180),
    notes: optionalText(2_000),
    items: z.array(planItemInputSchema).min(1).max(20),
  })
  .superRefine((value, context) => {
    const totalPercent = value.items.reduce((sum, item) => sum + item.paymentPercent, 0);
    if (Math.abs(totalPercent - 100) > 0.001) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Tổng tỷ lệ thanh toán phải bằng 100%",
      });
    }
    value.items.forEach((item, index) => {
      if (item.startDate && item.dueDate && item.dueDate < item.startDate) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "dueDate"],
          message: "Hạn hoàn thành phải cùng ngày hoặc sau ngày bắt đầu",
        });
      }
    });
  });

export type PlanDraftInput = z.infer<typeof planDraftInputSchema>;
