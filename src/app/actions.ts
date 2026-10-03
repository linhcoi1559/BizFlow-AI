"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/action-state";
import {
  MEMBER_ADMIN_ROLES,
  WORKSPACE_EDITOR_ROLES,
  requireOrganizationRole,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import {
  clientSchema,
  companyProfileSchema,
  projectSchema,
} from "@/lib/validations";

const read = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

const validationError = (
  message: string,
  error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } },
): ActionState => {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: Record<string, string[]> = {};

  for (const [key, messages] of Object.entries(flattened)) {
    if (messages) fieldErrors[key] = messages;
  }

  return { status: "error", message, fieldErrors };
};

function clientInput(formData: FormData) {
  return {
    id: read(formData, "id") || undefined,
    companyName: read(formData, "companyName"),
    taxCode: read(formData, "taxCode"),
    address: read(formData, "address"),
    representativeName: read(formData, "representativeName"),
    representativeTitle: read(formData, "representativeTitle"),
    email: read(formData, "email"),
    phone: read(formData, "phone"),
    website: read(formData, "website"),
    notes: read(formData, "notes"),
    status: read(formData, "status"),
  };
}

function projectInput(formData: FormData) {
  return {
    clientId: read(formData, "clientId"),
    name: read(formData, "name"),
    description: read(formData, "description"),
    serviceType: read(formData, "serviceType"),
    status: read(formData, "status"),
    startDate: read(formData, "startDate"),
    endDate: read(formData, "endDate"),
    totalValue: read(formData, "totalValue"),
    currency: read(formData, "currency"),
    ownerName: read(formData, "ownerName"),
    progress: read(formData, "progress"),
    kpi: read(formData, "kpi"),
  };
}

export async function createClientAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = clientSchema.safeParse(clientInput(formData));

  if (!parsed.success) {
    return validationError("Vui lòng sửa các trường được đánh dấu.", parsed.error);
  }

  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  let clientId: string;

  try {
    const client = await prisma.$transaction(async (transaction) => {
      const created = await transaction.client.create({
        data: {
          organizationId: organization.id,
          companyName: parsed.data.companyName,
          taxCode: parsed.data.taxCode,
          address: parsed.data.address,
          representativeName: parsed.data.representativeName,
          representativeTitle: parsed.data.representativeTitle,
          email: parsed.data.email,
          phone: parsed.data.phone,
          website: parsed.data.website,
          notes: parsed.data.notes,
          status: parsed.data.status,
        },
      });

      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          clientId: created.id,
          type: "client_created",
          message: `Đã tạo khách hàng ${created.companyName}`,
        },
      });

      return created;
    });
    clientId = client.id;
  } catch (error) {
    console.error("Failed to create client", error);
    return {
      status: "error",
      message: "Không thể tạo khách hàng. Vui lòng thử lại.",
      fieldErrors: {},
    };
  }

  revalidatePath("/");
  revalidatePath("/clients");
  redirect(`/clients/${clientId}?created=1`);
}

export async function updateClientAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = clientSchema.safeParse(clientInput(formData));

  if (!parsed.success || !parsed.data.id) {
    if (!parsed.success) {
      return validationError("Vui lòng sửa các trường được đánh dấu.", parsed.error);
    }
    return { status: "error", message: "Thiếu mã khách hàng.", fieldErrors: {} };
  }

  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const existing = await prisma.client.findFirst({
    where: { id: parsed.data.id, organizationId: organization.id },
    select: { id: true },
  });

  if (!existing) {
    return { status: "error", message: "Không tìm thấy khách hàng.", fieldErrors: {} };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.client.update({
        where: { id: existing.id },
        data: {
          companyName: parsed.data.companyName,
          taxCode: parsed.data.taxCode,
          address: parsed.data.address,
          representativeName: parsed.data.representativeName,
          representativeTitle: parsed.data.representativeTitle,
          email: parsed.data.email,
          phone: parsed.data.phone,
          website: parsed.data.website,
          notes: parsed.data.notes,
          status: parsed.data.status,
        },
      });
      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          clientId: existing.id,
          type: "client_updated",
          message: `Đã cập nhật khách hàng ${parsed.data.companyName}`,
        },
      });
    });
  } catch (error) {
    console.error("Failed to update client", error);
    return {
      status: "error",
      message: "Không thể cập nhật khách hàng. Vui lòng thử lại.",
      fieldErrors: {},
    };
  }

  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath(`/clients/${existing.id}`);
  redirect(`/clients/${existing.id}?updated=1`);
}

export async function createProjectAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = projectSchema.safeParse(projectInput(formData));

  if (!parsed.success) {
    return validationError("Vui lòng sửa các trường được đánh dấu.", parsed.error);
  }

  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, organizationId: organization.id },
    select: { id: true },
  });

  if (!client) {
    return {
      status: "error",
      message: "Khách hàng đã chọn không thuộc tổ chức này.",
      fieldErrors: { clientId: ["Chọn một khách hàng hợp lệ"] },
    };
  }

  let projectId: string;
  try {
    const project = await prisma.$transaction(async (transaction) => {
      const created = await transaction.project.create({
        data: {
          organizationId: organization.id,
          clientId: client.id,
          name: parsed.data.name,
          description: parsed.data.description,
          serviceType: parsed.data.serviceType,
          status: parsed.data.status,
          startDate: parsed.data.startDate
            ? new Date(`${parsed.data.startDate}T00:00:00.000Z`)
            : null,
          endDate: parsed.data.endDate
            ? new Date(`${parsed.data.endDate}T00:00:00.000Z`)
            : null,
          totalValue: parsed.data.totalValue,
          currency: parsed.data.currency,
          ownerName: parsed.data.ownerName,
          progress: parsed.data.progress,
          kpi: parsed.data.kpi,
        },
      });

      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          clientId: client.id,
          projectId: created.id,
          type: "project_created",
          message: `Đã tạo dự án ${created.name}`,
        },
      });
      return created;
    });
    projectId = project.id;
  } catch (error) {
    console.error("Failed to create project", error);
    return {
      status: "error",
      message: "Không thể tạo dự án. Vui lòng thử lại.",
      fieldErrors: {},
    };
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/clients/${client.id}`);
  redirect(`/projects/${projectId}?created=1`);
}

export async function updateProjectAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = read(formData, "id");
  const parsed = projectSchema.safeParse(projectInput(formData));

  if (!projectId) {
    return { status: "error", message: "Thiếu mã dự án.", fieldErrors: {} };
  }
  if (!parsed.success) {
    return validationError("Vui lòng sửa các trường được đánh dấu.", parsed.error);
  }

  const { organization } = await requireOrganizationRole(WORKSPACE_EDITOR_ROLES);
  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId: organization.id },
    select: {
      id: true,
      clientId: true,
      progress: true,
      _count: { select: { tasks: true } },
    },
  });

  if (!existing) {
    return { status: "error", message: "Không tìm thấy dự án.", fieldErrors: {} };
  }
  if (parsed.data.clientId !== existing.clientId) {
    return {
      status: "error",
      message: "Không thể chuyển dự án sang khách hàng khác sau khi đã tạo.",
      fieldErrors: { clientId: ["Khách hàng của dự án không thể thay đổi"] },
    };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.project.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          serviceType: parsed.data.serviceType,
          status: parsed.data.status,
          startDate: parsed.data.startDate
            ? new Date(`${parsed.data.startDate}T00:00:00.000Z`)
            : null,
          endDate: parsed.data.endDate
            ? new Date(`${parsed.data.endDate}T00:00:00.000Z`)
            : null,
          totalValue: parsed.data.totalValue,
          currency: parsed.data.currency,
          ownerName: parsed.data.ownerName,
          ...(existing._count.tasks ? {} : { progress: parsed.data.progress }),
          kpi: parsed.data.kpi,
        },
      });
      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          clientId: existing.clientId,
          projectId: existing.id,
          type: "project_updated",
          message: `Đã cập nhật dự án ${parsed.data.name}`,
        },
      });
    });
  } catch (error) {
    console.error("Failed to update project", error);
    return {
      status: "error",
      message: "Không thể cập nhật dự án. Vui lòng thử lại.",
      fieldErrors: {},
    };
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${existing.id}`);
  revalidatePath(`/clients/${existing.clientId}`);
  redirect(`/projects/${existing.id}?updated=1`);
}

export async function updateCompanyProfileAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = companyProfileSchema.safeParse({
    companyName: read(formData, "companyName"),
    taxCode: read(formData, "taxCode"),
    address: read(formData, "address"),
    representativeName: read(formData, "representativeName"),
    representativeTitle: read(formData, "representativeTitle"),
    email: read(formData, "email"),
    phone: read(formData, "phone"),
    website: read(formData, "website"),
    bankName: read(formData, "bankName"),
    bankAccount: read(formData, "bankAccount"),
  });

  if (!parsed.success) {
    return validationError("Vui lòng sửa các trường được đánh dấu.", parsed.error);
  }

  const { organization } = await requireOrganizationRole(MEMBER_ADMIN_ROLES);
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.companyProfile.upsert({
        where: { organizationId: organization.id },
        update: parsed.data,
        create: { ...parsed.data, organizationId: organization.id },
      });
      await transaction.activity.create({
        data: {
          organizationId: organization.id,
          type: "company_profile_updated",
          message: `Đã cập nhật hồ sơ công ty ${parsed.data.companyName}`,
        },
      });
    });
  } catch (error) {
    console.error("Failed to update company profile", error);
    return {
      status: "error",
      message: "Không thể lưu hồ sơ công ty. Vui lòng thử lại.",
      fieldErrors: {},
    };
  }

  revalidatePath("/settings/company");
  return {
    status: "success",
    message: "Đã lưu hồ sơ công ty thành công.",
    fieldErrors: {},
  };
}
