"use server";

import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import {
  DOCUMENT_REVIEWER_ROLES,
  WORKSPACE_EDITOR_ROLES,
  requireOrganizationRole,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { buildDocumentDraft, referencePrefix } from "@/services/documents/draft";
import {
  documentContentSchema,
  templateContentSchema,
} from "@/services/documents/schemas";

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

const createDocumentSchema = z.object({
  projectId: z.string().trim().min(1, "Chọn một dự án"),
  templateId: z.string().trim().min(1, "Chọn một mẫu"),
});

const editorSchema = z.object({
  id: z.string().trim().min(1),
  expectedVersion: z.coerce.number().int().positive(),
  title: z.string().trim().min(3, "Tiêu đề tài liệu phải có ít nhất 3 ký tự").max(200),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  totalValue: z.coerce.number().min(0).max(100_000_000_000_000),
  paymentTerms: z.string().trim().max(4_000),
  notes: z.string().trim().max(4_000),
  changeNote: z.string().trim().max(300).transform((value) => value || null),
  sections: z.array(
    z.object({
      key: z.string().trim().min(1).max(50),
      heading: z.string().trim().min(1, "Cần nhập tiêu đề mục").max(120),
      body: z.string().trim().min(1, "Cần nhập nội dung mục").max(12_000),
    }),
  ).min(1).max(12),
  lineItems: z.array(
    z.object({
      description: z.string().trim().min(1, "Cần nhập mô tả hạng mục").max(500),
      quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0").max(1_000_000),
      unit: z.string().trim().min(1, "Cần nhập đơn vị").max(40),
      unitPrice: z.coerce.number().min(0, "Đơn giá không được âm").max(100_000_000_000_000),
    }),
  ).min(1).max(30),
});

function validationState(
  message: string,
  error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } },
): ActionState {
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages) fields[key] = messages;
  }
  return { status: "error", message, fieldErrors: fields };
}

function revalidateDocumentPaths(documentId: string, projectId: string) {
  revalidatePath("/");
  revalidatePath("/activity");
  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function createDocumentAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createDocumentSchema.safeParse({
    projectId: read(formData, "projectId"),
    templateId: read(formData, "templateId"),
  });
  if (!parsed.success) {
    return validationState("Chọn dự án và một mẫu đang hoạt động.", parsed.error);
  }

  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const [project, template, company] = await Promise.all([
    prisma.project.findFirst({
      where: { id: parsed.data.projectId, organizationId: organization.id },
      include: { client: true },
    }),
    prisma.template.findFirst({
      where: {
        id: parsed.data.templateId,
        organizationId: organization.id,
        status: "active",
        isCurrent: true,
      },
    }),
    prisma.companyProfile.findUnique({ where: { organizationId: organization.id } }),
  ]);
  if (!project) return { status: "error", message: "Không tìm thấy dự án.", fieldErrors: {} };
  if (!template) return { status: "error", message: "Không tìm thấy mẫu đang hoạt động.", fieldErrors: {} };

  const parsedTemplate = templateContentSchema.safeParse(template.content);
  if (!parsedTemplate.success) {
    return { status: "error", message: "Mẫu đã chọn có cấu trúc nội dung không hợp lệ.", fieldErrors: {} };
  }

  const content = buildDocumentDraft(parsedTemplate.data, {
    company,
    client: project.client,
    project,
  });
  const year = new Date().getUTCFullYear();
  const referenceNumber = `BF-${referencePrefix(template.type)}-${year}-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  let documentId: string;

  try {
    const created = await prisma.$transaction(async (transaction) => {
      const document = await transaction.document.create({
        data: {
          organizationId: organization.id,
          clientId: project.clientId,
          projectId: project.id,
          templateId: template.id,
          referenceNumber,
          title: content.title,
          type: template.type,
          versions: {
            create: {
              version: 1,
              content: content as Prisma.InputJsonValue,
              changeNote: "Bản nháp đầu tiên được tạo từ mẫu",
            },
          },
        },
      });
      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          clientId: project.clientId,
          type: "document_created",
          message: `${document.referenceNumber} ${document.title} đã được tạo ở trạng thái bản nháp`,
        },
      });
      return document;
    });
    documentId = created.id;
  } catch (error) {
    console.error("Failed to create document", error);
    return { status: "error", message: "Không thể tạo bản nháp tài liệu.", fieldErrors: {} };
  }

  revalidateDocumentPaths(documentId, project.id);
  redirect(`/documents/${documentId}?created=1`);
}

function editorInput(formData: FormData) {
  const sectionCount = Number(read(formData, "sectionCount"));
  const lineItemCount = Number(read(formData, "lineItemCount"));

  const sections = Number.isInteger(sectionCount) && sectionCount > 0 && sectionCount <= 12
    ? Array.from({ length: sectionCount }, (_, index) => ({
        key: read(formData, `sectionKey_${index}`),
        heading: read(formData, `sectionHeading_${index}`),
        body: read(formData, `sectionBody_${index}`),
      }))
    : [];
  const lineItems = Number.isInteger(lineItemCount) && lineItemCount > 0 && lineItemCount <= 30
    ? Array.from({ length: lineItemCount }, (_, index) => ({
        description: read(formData, `lineItemDescription_${index}`),
        quantity: read(formData, `lineItemQuantity_${index}`),
        unit: read(formData, `lineItemUnit_${index}`),
        unitPrice: read(formData, `lineItemUnitPrice_${index}`),
      }))
    : [];

  return {
    id: read(formData, "id"),
    expectedVersion: read(formData, "expectedVersion"),
    title: read(formData, "title"),
    currency: read(formData, "currency"),
    totalValue: read(formData, "totalValue"),
    paymentTerms: read(formData, "paymentTerms"),
    notes: read(formData, "notes"),
    changeNote: read(formData, "changeNote"),
    sections,
    lineItems,
  };
}

export async function updateDocumentAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = editorSchema.safeParse(editorInput(formData));
  if (!parsed.success) {
    return validationState("Vui lòng sửa các trường tài liệu được đánh dấu.", parsed.error);
  }

  const contentResult = documentContentSchema.safeParse({
    title: parsed.data.title,
    sections: parsed.data.sections,
    lineItems: parsed.data.lineItems,
    currency: parsed.data.currency,
    totalValue: parsed.data.totalValue,
    paymentTerms: parsed.data.paymentTerms,
    notes: parsed.data.notes,
  });
  if (!contentResult.success) {
    return validationState("Nội dung tài liệu không hợp lệ.", contentResult.error);
  }

  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const existing = await prisma.document.findFirst({
    where: { id: parsed.data.id, organizationId: organization.id },
    select: { id: true, projectId: true, clientId: true, currentVersion: true, status: true, referenceNumber: true },
  });
  if (!existing) return { status: "error", message: "Không tìm thấy tài liệu.", fieldErrors: {} };
  if (existing.status === "archived") {
    return { status: "error", message: "Không thể chỉnh sửa tài liệu đã lưu trữ.", fieldErrors: {} };
  }
  if (existing.currentVersion !== parsed.data.expectedVersion) {
    return {
      status: "error",
      message: "Đã có phiên bản mới hơn. Hãy tải lại trang trước khi lưu thay đổi.",
      fieldErrors: {},
    };
  }

  const nextVersion = existing.currentVersion + 1;
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.documentVersion.create({
        data: {
          documentId: existing.id,
          version: nextVersion,
          content: contentResult.data as Prisma.InputJsonValue,
          changeNote: parsed.data.changeNote || `Cập nhật tài liệu lên phiên bản ${nextVersion}`,
        },
      });
      await transaction.document.update({
        where: { id: existing.id },
        data: {
          title: contentResult.data.title,
          currentVersion: nextVersion,
          status: "draft",
          approvedAt: null,
          approvedByName: null,
        },
      });
      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          projectId: existing.projectId,
          clientId: existing.clientId,
          type: "document_updated",
          message: `${existing.referenceNumber} đã được cập nhật lên phiên bản ${nextVersion}`,
        },
      });
    });
  } catch (error) {
    console.error("Failed to update document", error);
    return { status: "error", message: "Không thể lưu phiên bản tài liệu.", fieldErrors: {} };
  }

  revalidateDocumentPaths(existing.id, existing.projectId);
  redirect(`/documents/${existing.id}?saved=1`);
}

export async function submitDocumentForReviewAction(formData: FormData) {
  const id = read(formData, "id");
  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const document = await prisma.document.findFirst({
    where: { id, organizationId: organization.id },
    select: { id: true, projectId: true, clientId: true, status: true, referenceNumber: true },
  });
  if (!document || document.status !== "draft") redirect("/documents");

  await prisma.$transaction([
    prisma.document.update({ where: { id: document.id }, data: { status: "in_review" } }),
    prisma.activity.create({
      data: {
        organizationId: organization.id,
        projectId: document.projectId,
        clientId: document.clientId,
        type: "document_submitted",
        message: `${document.referenceNumber} đã được gửi duyệt`,
      },
    }),
  ]);
  revalidateDocumentPaths(document.id, document.projectId);
  redirect(`/documents/${document.id}?submitted=1`);
}

export async function approveDocumentAction(formData: FormData) {
  const id = read(formData, "id");
  const approvedByName = read(formData, "approvedByName").trim();
  const { organization } = await requireOrganizationRole(DOCUMENT_REVIEWER_ROLES);
  const document = await prisma.document.findFirst({
    where: { id, organizationId: organization.id },
    select: { id: true, projectId: true, clientId: true, status: true, referenceNumber: true },
  });
  if (!document || document.status !== "in_review") redirect("/documents");
  if (approvedByName.length < 2 || approvedByName.length > 120) {
    redirect(`/documents/${document.id}?approvalError=1`);
  }

  await prisma.$transaction([
    prisma.document.update({
      where: { id: document.id },
      data: { status: "approved", approvedAt: new Date(), approvedByName },
    }),
    prisma.activity.create({
      data: {
        organizationId: organization.id,
        projectId: document.projectId,
        clientId: document.clientId,
        type: "document_approved",
        message: `${document.referenceNumber} đã được ${approvedByName} phê duyệt`,
      },
    }),
  ]);
  revalidateDocumentPaths(document.id, document.projectId);
  redirect(`/documents/${document.id}?approved=1`);
}
