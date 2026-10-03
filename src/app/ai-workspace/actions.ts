"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  AIConfirmationState,
  AIExtractionState,
} from "@/app/ai-workspace/state";
import {
  WORKSPACE_EDITOR_ROLES,
  requireOrganizationRole,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { extractBusinessRequest } from "@/services/ai/business-request";
import {
  businessRequestInputSchema,
  confirmBusinessRequestSchema,
} from "@/services/ai/business-request-schema";
import { findDuplicateClients } from "@/services/ai/client-matching";
import {
  AIConfigurationError,
  AIProviderError,
  AIValidationError,
} from "@/services/ai/errors";
import {
  scopeKey,
  sealPreview,
  openPreview,
} from "@/services/ai/chatgpt/security";
import { z } from "zod";

const read = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

function zodFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

function listFromTextarea(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function deriveInclusiveEndDate(
  startDate: string | null,
  durationMonths: number | null,
) {
  if (!startDate || !durationMonths) return null;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + durationMonths);
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

export async function extractBusinessRequestAction(
  _previousState: AIExtractionState,
  formData: FormData,
): Promise<AIExtractionState> {
  const rawRequest = read(formData, "request");
  const input = businessRequestInputSchema.safeParse({ request: rawRequest });

  if (!input.success) {
    return {
      status: "error",
      message: "Hãy cung cấp đủ chi tiết để BizFlow AI hiểu yêu cầu.",
      fieldErrors: zodFieldErrors(input.error),
      originalRequest: rawRequest,
      draft: null,
      duplicateCandidates: [],
      provider: "",
      model: "",
    };
  }

  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );

  try {
    const extraction = await extractBusinessRequest(input.data.request);
    const duplicateCandidates = await findDuplicateClients(organization.id, {
      companyName: extraction.draft.client.companyName,
      taxCode: extraction.draft.client.taxCode,
    });

    return {
      status: "review",
      message:
        "Hãy kiểm tra và chỉnh sửa thông tin đã trích xuất trước khi tạo dữ liệu.",
      fieldErrors: {},
      originalRequest: input.data.request,
      draft: extraction.draft,
      duplicateCandidates,
      provider: extraction.provider,
      model: extraction.model,
      receipt: sealPreview(
        {
          request: input.data.request,
          provider: extraction.provider,
          model: extraction.model,
        },
        scopeKey(organization.id, user.id),
      ),
    };
  } catch (error) {
    console.error(
      "Business request extraction failed",
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : "Unknown error",
    );
    let message = "Không thể phân tích yêu cầu. Vui lòng thử lại.";
    if (error instanceof AIConfigurationError) {
      message = error.message;
    } else if (error instanceof AIProviderError) {
      message = error.userMessage;
    } else if (error instanceof AIValidationError) {
      message = error.message;
    }

    return {
      status: "error",
      message,
      fieldErrors: {},
      originalRequest: input.data.request,
      draft: null,
      duplicateCandidates: [],
      provider: "",
      model: "",
    };
  }
}

export async function confirmBusinessRequestAction(
  _previousState: AIConfirmationState,
  formData: FormData,
): Promise<AIConfirmationState> {
  const parsed = confirmBusinessRequestSchema.safeParse({
    originalRequest: read(formData, "originalRequest"),
    clientResolution: read(formData, "clientResolution"),
    reviewedDuplicateIds: read(formData, "reviewedDuplicateIds"),
    clientCompanyName: read(formData, "clientCompanyName"),
    clientTaxCode: read(formData, "clientTaxCode"),
    clientAddress: read(formData, "clientAddress"),
    clientRepresentativeName: read(formData, "clientRepresentativeName"),
    clientRepresentativeTitle: read(formData, "clientRepresentativeTitle"),
    clientEmail: read(formData, "clientEmail"),
    clientPhone: read(formData, "clientPhone"),
    projectName: read(formData, "projectName"),
    projectDescription: read(formData, "projectDescription"),
    projectServiceType: read(formData, "projectServiceType"),
    projectStartDate: read(formData, "projectStartDate"),
    projectEndDate: read(formData, "projectEndDate"),
    projectDurationMonths: read(formData, "projectDurationMonths"),
    projectMonthlyFee: read(formData, "projectMonthlyFee"),
    projectTotalValue: read(formData, "projectTotalValue"),
    projectCurrency: read(formData, "projectCurrency"),
    projectOwnerName: read(formData, "projectOwnerName"),
    projectKpi: read(formData, "projectKpi"),
    missingFields: read(formData, "missingFields"),
    suggestedDocuments: read(formData, "suggestedDocuments"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vui lòng sửa các trường được đánh dấu trong phần kiểm tra.",
      fieldErrors: zodFieldErrors(parsed.error),
      duplicateCandidates: [],
    };
  }

  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );
  let provenance: { request: string; provider: string; model: string };
  try {
    provenance = z
      .object({ request: z.string(), provider: z.string(), model: z.string() })
      .parse(
        openPreview(
          read(formData, "receipt"),
          scopeKey(organization.id, user.id),
        ),
      );
    if (provenance.request !== parsed.data.originalRequest)
      throw new Error("Source mismatch");
  } catch {
    return {
      status: "error",
      message:
        "Kết quả AI đã hết hạn hoặc không hợp lệ. Hãy phân tích lại yêu cầu.",
      fieldErrors: {},
      duplicateCandidates: [],
    };
  }
  const duplicateCandidates = await findDuplicateClients(organization.id, {
    companyName: parsed.data.clientCompanyName,
    taxCode: parsed.data.clientTaxCode,
  });
  const existingClientId = parsed.data.clientResolution.startsWith("existing:")
    ? parsed.data.clientResolution.slice("existing:".length)
    : null;
  const reviewedDuplicateIds = new Set(
    parsed.data.reviewedDuplicateIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

  if (
    !existingClientId &&
    duplicateCandidates.some(
      (candidate) => !reviewedDuplicateIds.has(candidate.id),
    )
  ) {
    return {
      status: "error",
      message:
        "Phát hiện khách hàng có thể bị trùng sau khi bạn chỉnh sửa. Hãy kiểm tra lựa chọn khách hàng trước khi tạo dữ liệu.",
      fieldErrors: {
        clientResolution: [
          "Chọn khách hàng hiện có hoặc xác nhận tạo khách hàng mới.",
        ],
      },
      duplicateCandidates,
    };
  }

  if (existingClientId) {
    const selectedClient = await prisma.client.findFirst({
      where: { id: existingClientId, organizationId: organization.id },
      select: { id: true },
    });
    if (!selectedClient) {
      return {
        status: "error",
        message: "Khách hàng hiện có đã chọn không còn khả dụng.",
        fieldErrors: { clientResolution: ["Chọn một khách hàng hợp lệ."] },
        duplicateCandidates,
      };
    }
  }

  const suggestedDocuments = listFromTextarea(parsed.data.suggestedDocuments);
  const derivedTotalValue =
    parsed.data.projectTotalValue ??
    (parsed.data.projectMonthlyFee !== null &&
    parsed.data.projectDurationMonths !== null
      ? parsed.data.projectMonthlyFee * parsed.data.projectDurationMonths
      : 0);
  const derivedEndDate =
    parsed.data.projectEndDate ??
    deriveInclusiveEndDate(
      parsed.data.projectStartDate,
      parsed.data.projectDurationMonths,
    );
  let projectId: string;

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const client = existingClientId
        ? await transaction.client.findFirstOrThrow({
            where: { id: existingClientId, organizationId: organization.id },
          })
        : await transaction.client.create({
            data: {
              organizationId: organization.id,
              companyName: parsed.data.clientCompanyName,
              taxCode: parsed.data.clientTaxCode,
              address: parsed.data.clientAddress,
              representativeName: parsed.data.clientRepresentativeName,
              representativeTitle: parsed.data.clientRepresentativeTitle,
              email: parsed.data.clientEmail,
              phone: parsed.data.clientPhone,
              status: "active",
            },
          });

      const project = await transaction.project.create({
        data: {
          organizationId: organization.id,
          clientId: client.id,
          name: parsed.data.projectName,
          description: parsed.data.projectDescription,
          serviceType: parsed.data.projectServiceType,
          status: "planning",
          startDate: parsed.data.projectStartDate
            ? new Date(`${parsed.data.projectStartDate}T00:00:00.000Z`)
            : null,
          endDate: derivedEndDate
            ? new Date(`${derivedEndDate}T00:00:00.000Z`)
            : null,
          durationMonths: parsed.data.projectDurationMonths,
          monthlyFee: parsed.data.projectMonthlyFee,
          totalValue: derivedTotalValue,
          currency: parsed.data.projectCurrency,
          ownerName: parsed.data.projectOwnerName,
          progress: 0,
          kpi: parsed.data.projectKpi,
          sourceRequest: parsed.data.originalRequest,
          createdWithAi: true,
          aiProvider: provenance.provider,
          aiModel: provenance.model,
          suggestedDocuments,
        },
      });

      const activities = [
        ...(!existingClientId
          ? [
              {
                organizationId: organization.id,
                clientId: client.id,
                type: "client_created" as const,
                message: `Khách hàng ${client.companyName} đã được tạo từ Không gian AI`,
              },
            ]
          : []),
        {
          organizationId: organization.id,
          clientId: client.id,
          projectId: project.id,
          type: "project_created" as const,
          message: `Dự án ${project.name} đã được tạo`,
        },
        {
          organizationId: organization.id,
          clientId: client.id,
          projectId: project.id,
          type: "ai_workflow_created" as const,
          message: `Yêu cầu trong Không gian AI đã được kiểm tra và xác nhận cho ${project.name}`,
        },
      ];
      await transaction.activity.createMany({ data: activities });
      return project;
    });
    projectId = result.id;
  } catch (error) {
    console.error("Failed to confirm AI business request", error);
    return {
      status: "error",
      message:
        "Không có dữ liệu nào được tạo vì giao dịch cơ sở dữ liệu thất bại. Hãy kiểm tra các trường và thử lại.",
      fieldErrors: {},
      duplicateCandidates,
    };
  }

  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/activity");
  redirect(`/projects/${projectId}?created=1&source=ai`);
}
