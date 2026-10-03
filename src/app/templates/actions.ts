"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/action-state";
import { WORKSPACE_EDITOR_ROLES, requireOrganizationRole } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import {
  templateContentFromForm,
  templateFormSchema,
} from "@/services/documents/schemas";

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function inputFrom(formData: FormData) {
  return {
    id: read(formData, "id") || undefined,
    name: read(formData, "name"),
    description: read(formData, "description"),
    type: read(formData, "type"),
    titlePattern: read(formData, "titlePattern"),
    summaryHeading: read(formData, "summaryHeading"),
    summaryBody: read(formData, "summaryBody"),
    scopeHeading: read(formData, "scopeHeading"),
    scopeBody: read(formData, "scopeBody"),
    timelineHeading: read(formData, "timelineHeading"),
    timelineBody: read(formData, "timelineBody"),
    kpiHeading: read(formData, "kpiHeading"),
    kpiBody: read(formData, "kpiBody"),
    legalHeading: read(formData, "legalHeading"),
    legalBody: read(formData, "legalBody"),
    paymentTerms: read(formData, "paymentTerms"),
    notes: read(formData, "notes"),
    changeNote: read(formData, "changeNote"),
  };
}

function validationState(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }) {
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages) fields[key] = messages;
  }
  return {
    status: "error" as const,
    message: "Vui lòng sửa các trường mẫu được đánh dấu.",
    fieldErrors: fields,
  };
}

export async function createTemplateAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = templateFormSchema.safeParse(inputFrom(formData));
  if (!parsed.success) return validationState(parsed.error);

  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const content = templateContentFromForm(parsed.data);
  let templateId: string;

  try {
    const created = await prisma.$transaction(async (transaction) => {
      const template = await transaction.template.create({
        data: {
          organizationId: organization.id,
          templateKey: `custom-${randomUUID().slice(0, 12)}`,
          name: parsed.data.name,
          description: parsed.data.description,
          type: parsed.data.type,
          changeNote: "Phiên bản mẫu đầu tiên",
          content,
        },
      });
      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          type: "template_created",
          message: `Mẫu ${template.name} đã được tạo`,
        },
      });
      return template;
    });
    templateId = created.id;
  } catch (error) {
    console.error("Failed to create template", error);
    return { status: "error", message: "Không thể tạo mẫu.", fieldErrors: {} };
  }

  revalidatePath("/templates");
  redirect(`/templates/${templateId}?created=1`);
}

export async function createTemplateVersionAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = templateFormSchema.safeParse(inputFrom(formData));
  if (!parsed.success) return validationState(parsed.error);
  if (!parsed.data.id) {
    return { status: "error", message: "Thiếu mã mẫu.", fieldErrors: {} };
  }

  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const existing = await prisma.template.findFirst({
    where: { id: parsed.data.id, organizationId: organization.id },
  });
  if (!existing) {
    return { status: "error", message: "Không tìm thấy mẫu.", fieldErrors: {} };
  }
  if (!existing.isCurrent) {
    return {
      status: "error",
      message: "Không thể sửa phiên bản mẫu cũ. Hãy mở phiên bản hiện tại để chỉnh sửa.",
      fieldErrors: {},
    };
  }

  const content = templateContentFromForm(parsed.data);
  let templateId: string;
  try {
    const created = await prisma.$transaction(async (transaction) => {
      await transaction.template.updateMany({
        where: { organizationId: organization.id, templateKey: existing.templateKey },
        data: { isCurrent: false },
      });
      const template = await transaction.template.create({
        data: {
          organizationId: organization.id,
          templateKey: existing.templateKey,
          name: parsed.data.name,
          description: parsed.data.description,
          type: parsed.data.type,
          version: existing.version + 1,
          changeNote: parsed.data.changeNote || `Cập nhật từ phiên bản ${existing.version}`,
          content,
        },
      });
      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          type: "template_version_created",
          message: `Mẫu ${template.name} phiên bản ${template.version} đã được tạo`,
        },
      });
      return template;
    });
    templateId = created.id;
  } catch (error) {
    console.error("Failed to create template version", error);
    return { status: "error", message: "Không thể lưu phiên bản mẫu.", fieldErrors: {} };
  }

  revalidatePath("/templates");
  redirect(`/templates/${templateId}?versioned=1`);
}
