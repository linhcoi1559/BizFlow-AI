"use server";

import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import {
  ALL_MEMBER_ROLES,
  FINANCE_ROLES,
  WORKSPACE_EDITOR_ROLES,
  requireOrganizationRole,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { titleCase } from "@/lib/utils";
import { documentContentSchema } from "@/services/documents/schemas";
import { buildDefaultPlan } from "@/services/execution/default-plan";
import {
  paymentStatuses,
  planDraftInputSchema,
  reminderStatuses,
  reminderTypes,
  taskStatuses,
} from "@/services/execution/schemas";

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function dateValue(value: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function validationState(
  message: string,
  error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } },
): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages) fieldErrors[key] = messages;
  }
  return { status: "error", message, fieldErrors };
}

function revalidateExecution(projectId: string) {
  revalidatePath("/");
  revalidatePath("/activity");
  revalidatePath("/tasks");
  revalidatePath("/payments");
  revalidatePath("/reminders");
  revalidatePath(`/projects/${projectId}`);
}

export async function createPlanPreviewAction(formData: FormData) {
  const projectId = z.string().trim().min(1).safeParse(read(formData, "projectId"));
  if (!projectId.success) redirect("/projects");

  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const [project, approvedDocument] = await Promise.all([
    prisma.project.findFirst({
      where: { id: projectId.data, organizationId: organization.id },
      include: { plan: { select: { id: true } } },
    }),
    prisma.document.findFirst({
      where: {
        organizationId: organization.id,
        projectId: projectId.data,
        status: "approved",
      },
      include: { versions: { orderBy: { version: "desc" } } },
      orderBy: { approvedAt: "desc" },
    }),
  ]);
  if (!project) redirect("/projects");
  if (project.plan) redirect(`/projects/${project.id}?tab=plan`);

  const sourceVersion = approvedDocument?.versions.find(
    (version) => version.version === approvedDocument.currentVersion,
  );
  const parsedContent = sourceVersion
    ? documentContentSchema.safeParse(sourceVersion.content)
    : null;
  const preview = buildDefaultPlan(
    project,
    parsedContent?.success ? parsedContent.data : null,
  );

  try {
    await prisma.$transaction(async (transaction) => {
      const plan = await transaction.plan.create({
        data: {
          organizationId: organization.id,
          clientId: project.clientId,
          projectId: project.id,
          sourceDocumentId: parsedContent?.success ? approvedDocument?.id : null,
          title: preview.title,
          notes: preview.notes,
          items: {
            create: preview.items.map((item, index) => ({
              ...item,
              position: index + 1,
            })),
          },
        },
      });
      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          clientId: project.clientId,
          type: "plan_created",
          message: `${plan.title} đã được tạo ở trạng thái bản nháp có thể chỉnh sửa`,
        },
      });
    });
  } catch (error) {
    console.error("Failed to create plan preview", error);
    redirect(`/projects/${project.id}?tab=plan&planError=1`);
  }

  revalidateExecution(project.id);
  redirect(`/projects/${project.id}?tab=plan&planCreated=1`);
}

function planDraftInput(formData: FormData) {
  const itemCount = Number(read(formData, "itemCount"));
  const items = Number.isInteger(itemCount) && itemCount > 0 && itemCount <= 20
    ? Array.from({ length: itemCount }, (_, index) => ({
        title: read(formData, `itemTitle_${index}`),
        description: read(formData, `itemDescription_${index}`),
        ownerName: read(formData, `itemOwnerName_${index}`),
        startDate: read(formData, `itemStartDate_${index}`),
        dueDate: read(formData, `itemDueDate_${index}`),
        priority: read(formData, `itemPriority_${index}`),
        paymentPercent: read(formData, `itemPaymentPercent_${index}`),
      }))
    : [];
  return {
    id: read(formData, "id"),
    title: read(formData, "title"),
    notes: read(formData, "notes"),
    items,
  };
}

export async function updatePlanDraftAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = planDraftInputSchema.safeParse(planDraftInput(formData));
  if (!parsed.success) {
    return validationState(
      parsed.error.issues.find((issue) => issue.path[0] === "items")?.message
        || "Vui lòng sửa các trường kế hoạch được đánh dấu.",
      parsed.error,
    );
  }

  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const plan = await prisma.plan.findFirst({
    where: { id: parsed.data.id, organizationId: organization.id },
    select: { id: true, projectId: true, clientId: true, status: true },
  });
  if (!plan) return { status: "error", message: "Không tìm thấy kế hoạch.", fieldErrors: {} };
  if (plan.status !== "draft") {
    return { status: "error", message: "Chỉ có thể chỉnh sửa kế hoạch ở trạng thái bản nháp.", fieldErrors: {} };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.plan.update({
        where: { id: plan.id },
        data: { title: parsed.data.title, notes: parsed.data.notes },
      });
      await transaction.planItem.deleteMany({ where: { planId: plan.id } });
      await transaction.planItem.createMany({
        data: parsed.data.items.map((item, index) => ({
          planId: plan.id,
          title: item.title,
          description: item.description,
          ownerName: item.ownerName,
          startDate: dateValue(item.startDate),
          dueDate: dateValue(item.dueDate),
          priority: item.priority,
          paymentPercent: item.paymentPercent,
          position: index + 1,
        })),
      });
      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          projectId: plan.projectId,
          clientId: plan.clientId,
          type: "plan_updated",
          message: `Bản nháp ${parsed.data.title} đã được cập nhật`,
        },
      });
    });
  } catch (error) {
    console.error("Failed to update plan", error);
    return { status: "error", message: "Không thể lưu bản nháp kế hoạch.", fieldErrors: {} };
  }

  revalidateExecution(plan.projectId);
  redirect(`/projects/${plan.projectId}?tab=plan&planSaved=1`);
}

function reminderTime(dueDate: Date) {
  const value = new Date(dueDate);
  value.setUTCDate(value.getUTCDate() - 2);
  return value > new Date() ? value : new Date();
}

export async function activatePlanAction(formData: FormData) {
  const id = read(formData, "id");
  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const plan = await prisma.plan.findFirst({
    where: { id, organizationId: organization.id },
    include: { items: { orderBy: { position: "asc" } }, project: true },
  });
  if (!plan || plan.status !== "draft" || !plan.items.length) redirect("/projects");
  const totalPercent = plan.items.reduce(
    (sum, item) => sum + Number(item.paymentPercent),
    0,
  );
  if (Math.abs(totalPercent - 100) > 0.001) {
    redirect(`/projects/${plan.projectId}?tab=plan&activationError=1`);
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.plan.updateMany({
        where: { id: plan.id, status: "draft" },
        data: { status: "active", activatedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("Plan was already activated");

      for (const item of plan.items) {
        const task = await transaction.task.create({
          data: {
            organizationId: organization.id,
            clientId: plan.clientId,
            projectId: plan.projectId,
            planItemId: item.id,
            title: item.title,
            description: item.description,
            ownerName: item.ownerName,
            priority: item.priority,
            startDate: item.startDate,
            dueDate: item.dueDate,
          },
        });
        if (item.dueDate) {
          await transaction.reminder.create({
            data: {
              organizationId: organization.id,
              clientId: plan.clientId,
              projectId: plan.projectId,
              taskId: task.id,
              type: "task",
              title: `Task due: ${item.title}`,
              dueAt: reminderTime(item.dueDate),
            },
          });
        }

        if (Number(item.paymentPercent) > 0) {
          const amount = new Prisma.Decimal(plan.project.totalValue)
            .mul(item.paymentPercent)
            .div(100);
          const payment = await transaction.paymentMilestone.create({
            data: {
              organizationId: organization.id,
              clientId: plan.clientId,
              projectId: plan.projectId,
              planItemId: item.id,
              referenceNumber: `PAY-${new Date().getUTCFullYear()}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
              title: item.title,
              amount,
              currency: plan.project.currency,
              dueDate: item.dueDate,
            },
          });
          if (item.dueDate) {
            await transaction.reminder.create({
              data: {
                organizationId: organization.id,
                clientId: plan.clientId,
                projectId: plan.projectId,
                paymentMilestoneId: payment.id,
                type: "payment",
                title: `Payment due: ${item.title}`,
                dueAt: reminderTime(item.dueDate),
              },
            });
          }
        }
      }

      await transaction.planItem.updateMany({
        where: { planId: plan.id },
        data: { status: "active" },
      });
      await transaction.project.update({
        where: { id: plan.projectId },
        data: {
          progress: 0,
          ...(plan.project.status === "draft" || plan.project.status === "planning"
            ? { status: "active" as const }
            : {}),
        },
      });
      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          projectId: plan.projectId,
          clientId: plan.clientId,
          type: "plan_activated",
          message: `${plan.title} đã được kích hoạt với ${plan.items.length} công việc và cột mốc thanh toán`,
        },
      });
    });
  } catch (error) {
    console.error("Failed to activate plan", error);
    redirect(`/projects/${plan.projectId}?tab=plan&activationError=1`);
  }

  revalidateExecution(plan.projectId);
  redirect(`/projects/${plan.projectId}?tab=tasks&planActivated=1`);
}

export async function updateTaskStatusAction(formData: FormData) {
  const parsed = z.object({
    id: z.string().trim().min(1),
    status: z.enum(taskStatuses),
  }).safeParse({ id: read(formData, "id"), status: read(formData, "status") });
  if (!parsed.success) redirect("/tasks");

  const { organization } = await requireOrganizationRole(ALL_MEMBER_ROLES);
  const task = await prisma.task.findFirst({
    where: { id: parsed.data.id, organizationId: organization.id },
  });
  if (!task) redirect("/tasks");

  await prisma.$transaction(async (transaction) => {
    await transaction.task.update({
      where: { id: task.id },
      data: {
        status: parsed.data.status,
        completedAt: parsed.data.status === "completed" ? new Date() : null,
      },
    });
    if (task.planItemId) {
      const planItemStatus = parsed.data.status === "completed"
        ? "completed"
        : parsed.data.status === "blocked"
          ? "blocked"
          : parsed.data.status === "todo"
            ? "pending"
            : "active";
      await transaction.planItem.update({
        where: { id: task.planItemId },
        data: { status: planItemStatus },
      });
    }
    const [totalTasks, completedTasks] = await Promise.all([
      transaction.task.count({
        where: { projectId: task.projectId, status: { not: "cancelled" } },
      }),
      transaction.task.count({
        where: { projectId: task.projectId, status: "completed" },
      }),
    ]);
    const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    await transaction.project.update({ where: { id: task.projectId }, data: { progress } });
    const plan = await transaction.plan.findUnique({ where: { projectId: task.projectId } });
    if (plan) {
      await transaction.plan.update({
        where: { id: plan.id },
        data: { status: totalTasks > 0 && completedTasks === totalTasks ? "completed" : "active" },
      });
    }
    await transaction.activity.create({
      data: {
        organizationId: organization.id,
        projectId: task.projectId,
        clientId: task.clientId,
        type: "task_updated",
        message: `${task.title} đã chuyển sang trạng thái ${titleCase(parsed.data.status)}`,
      },
    });
  });

  revalidateExecution(task.projectId);
  redirect(`/projects/${task.projectId}?tab=tasks&taskUpdated=1`);
}

export async function updatePaymentStatusAction(formData: FormData) {
  const parsed = z.object({
    id: z.string().trim().min(1),
    status: z.enum(paymentStatuses),
    invoiceNumber: z.string().trim().max(80).transform((value) => value || null),
  }).safeParse({
    id: read(formData, "id"),
    status: read(formData, "status"),
    invoiceNumber: read(formData, "invoiceNumber"),
  });
  if (!parsed.success) redirect("/payments");

  const { organization } = await requireOrganizationRole(FINANCE_ROLES);
  const payment = await prisma.paymentMilestone.findFirst({
    where: { id: parsed.data.id, organizationId: organization.id },
  });
  if (!payment) redirect("/payments");

  await prisma.$transaction([
    prisma.paymentMilestone.update({
      where: { id: payment.id },
      data: {
        status: parsed.data.status,
        invoiceNumber: parsed.data.invoiceNumber,
        paidAt: parsed.data.status === "paid" ? payment.paidAt || new Date() : null,
      },
    }),
    prisma.activity.create({
      data: {
        organizationId: organization.id,
        projectId: payment.projectId,
        clientId: payment.clientId,
        type: "payment_updated",
        message: `${payment.referenceNumber} đã chuyển sang trạng thái ${titleCase(parsed.data.status)}`,
      },
    }),
  ]);

  revalidateExecution(payment.projectId);
  redirect(`/projects/${payment.projectId}?tab=payments&paymentUpdated=1`);
}

export async function createReminderAction(formData: FormData) {
  const parsed = z.object({
    projectId: z.string().trim().min(1),
    title: z.string().trim().min(3).max(180),
    type: z.enum(reminderTypes),
    dueDate: z.string().trim().refine(
      (value) => !Number.isNaN(Date.parse(`${value}T09:00:00.000Z`)),
      "Nhập ngày nhắc hợp lệ",
    ),
  }).safeParse({
    projectId: read(formData, "projectId"),
    title: read(formData, "title"),
    type: read(formData, "type"),
    dueDate: read(formData, "dueDate"),
  });
  if (!parsed.success) redirect("/reminders?error=1");

  const { organization } = await requireOrganizationRole(ALL_MEMBER_ROLES);
  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, organizationId: organization.id },
    select: { id: true, clientId: true },
  });
  if (!project) redirect("/reminders?error=1");

  await prisma.$transaction([
    prisma.reminder.create({
      data: {
        organizationId: organization.id,
        clientId: project.clientId,
        projectId: project.id,
        title: parsed.data.title,
        type: parsed.data.type,
        dueAt: new Date(`${parsed.data.dueDate}T09:00:00.000Z`),
      },
    }),
    prisma.activity.create({
      data: {
        organizationId: organization.id,
        clientId: project.clientId,
        projectId: project.id,
        type: "reminder_created",
        message: `Lời nhắc ${parsed.data.title} đã được tạo`,
      },
    }),
  ]);

  revalidateExecution(project.id);
  redirect(`/projects/${project.id}?tab=reminders&reminderCreated=1`);
}

export async function updateReminderStatusAction(formData: FormData) {
  const parsed = z.object({
    id: z.string().trim().min(1),
    status: z.enum(reminderStatuses),
  }).safeParse({ id: read(formData, "id"), status: read(formData, "status") });
  if (!parsed.success) redirect("/reminders");

  const { organization } = await requireOrganizationRole(ALL_MEMBER_ROLES);
  const reminder = await prisma.reminder.findFirst({
    where: { id: parsed.data.id, organizationId: organization.id },
  });
  if (!reminder) redirect("/reminders");

  await prisma.$transaction([
    prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        status: parsed.data.status,
        completedAt: parsed.data.status === "completed" ? new Date() : null,
      },
    }),
    prisma.activity.create({
      data: {
        organizationId: organization.id,
        clientId: reminder.clientId,
        projectId: reminder.projectId,
        type: "reminder_completed",
        message: `${reminder.title} đã chuyển sang trạng thái ${titleCase(parsed.data.status)}`,
      },
    }),
  ]);

  revalidateExecution(reminder.projectId);
  redirect(`/projects/${reminder.projectId}?tab=reminders&reminderUpdated=1`);
}
