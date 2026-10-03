"use server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  requireOrganizationRole,
  WORKSPACE_EDITOR_ROLES,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/services/ai/provider-factory";
import {
  scopeKey,
  sealPreview,
  openPreview,
} from "@/services/ai/chatgpt/security";
import {
  contractInputSchema,
  generateContract,
  reviseContract,
} from "@/services/documents/ai-contract";
import {
  documentContentSchema,
  templateContentSchema,
} from "@/services/documents/schemas";
import { starterTemplates } from "@/services/documents/template-library";
import { findDuplicateClients } from "@/services/ai/client-matching";
import { AIProviderError, AIConfigurationError } from "@/services/ai/errors";
import {
  initialContractChatState,
  initialContractState,
  type ContractChatState,
  type ContractState,
} from "./state";
const ticketSchema = z.object({
  input: contractInputSchema,
  content: documentContentSchema,
  missingFields: z.array(z.string().trim().min(1).max(200)).max(20),
  provider: z.string(),
  model: z.string(),
  reference: z.string().regex(/^BF-CT-\d{4}-[A-F0-9]{12}$/),
  companyUpdatedAt: z.string(),
  templateUpdatedAt: z.string().nullable(),
});
const chatMessagesSchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string().trim().min(1).max(8000),
    }),
  )
  .max(12);
function failure(message: string): ContractState {
  return { ...initialContractState, status: "error", message };
}
export async function previewContractAction(
  _previous: ContractState,
  formData: FormData,
): Promise<ContractState> {
  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );
  const parsed = contractInputSchema.safeParse({
    ...Object.fromEntries(formData),
    acknowledgeDuplicate: formData.get("acknowledgeDuplicate") === "on",
  });
  if (!parsed.success)
    return {
      ...failure("Kiểm tra thông tin được đánh dấu."),
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  const input = parsed.data;
  const company = await prisma.companyProfile.findUnique({
    where: { organizationId: organization.id },
  });
  if (!company?.address || !company.representativeName)
    return failure(
      "Bổ sung địa chỉ và người đại diện của bên bạn tại Cài đặt công ty trước khi soạn hợp đồng.",
    );
  if (
    input.clientId &&
    !(await prisma.client.findFirst({
      where: {
        id: input.clientId,
        organizationId: organization.id,
        status: { not: "archived" },
      },
    }))
  )
    return failure("Khách hàng đã chọn không khả dụng.");
  const duplicates = !input.clientId
    ? await findDuplicateClients(organization.id, {
        companyName: input.name,
        taxCode: input.taxCode,
      })
    : [];
  if (duplicates.length && !input.acknowledgeDuplicate)
    return failure(
      "Khách hàng có thể đã tồn tại. Chọn khách hàng hiện có hoặc xác nhận tạo khách hàng mới.",
    );
  const template = input.templateId
    ? await prisma.template.findFirst({
        where: {
          id: input.templateId,
          organizationId: organization.id,
          type: "contract",
          isCurrent: true,
          status: "active",
        },
      })
    : null;
  if (input.templateId && !template)
    return failure("Mẫu hợp đồng đã chọn không khả dụng.");
  try {
    const base = template
      ? templateContentSchema.parse(template.content)
      : starterTemplates.find((item) => item.type === "contract")!.content;
    const provider = await getAIProvider();
    const result = await generateContract(input, company, base, provider);
    const ticket = sealPreview(
      {
        input,
        content: result.content,
        missingFields: result.missingFields,
        provider: result.provider,
        model: result.model,
        reference: `BF-CT-${new Date().getUTCFullYear()}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
        companyUpdatedAt: company.updatedAt.toISOString(),
        templateUpdatedAt: template?.updatedAt.toISOString() || null,
      },
      scopeKey(organization.id, user.id),
    );
    return {
      status: "preview",
      message: result.missingFields.length
        ? "AI đã tạo bản nháp và nêu các điểm cần xem xét. Bạn có thể chat để AI sửa tiếp hoặc tự xác nhận lưu khi đã thấy phù hợp."
        : "Kiểm tra thông tin và nội dung. Chỉ khi bạn xác nhận, BizFlow mới lưu bản nháp.",
      fieldErrors: {},
      content: result.content,
      missingFields: result.missingFields,
      ticket,
    };
  } catch (error) {
    return failure(
      error instanceof AIProviderError
        ? error.userMessage
        : error instanceof AIConfigurationError
          ? error.message
          : "Chưa tạo được bản nháp hợp lệ. Kiểm tra kết nối AI rồi thử lại.",
    );
  }
}

export async function reviseContractAction(
  previous: ContractChatState,
  formData: FormData,
): Promise<ContractChatState> {
  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );
  const contextTicket = String(formData.get("ticket") || "");
  const requestedBaseTicket = String(formData.get("baseTicket") || "");
  const continuingConversation =
    previous.baseTicket === requestedBaseTicket &&
    previous.ticket === contextTicket;
  const baseTicket = continuingConversation
    ? previous.baseTicket
    : requestedBaseTicket === contextTicket
      ? requestedBaseTicket
      : contextTicket;
  const previousMessages = continuingConversation
    ? chatMessagesSchema.safeParse(previous.messages).data?.slice(-10) || []
    : [];
  let context: z.infer<typeof ticketSchema>;
  try {
    context = ticketSchema.parse(
      openPreview(contextTicket, scopeKey(organization.id, user.id)),
    );
  } catch {
    return {
      ...initialContractChatState,
      status: "error",
      message: "Bản hợp đồng trao đổi đã hết hạn hoặc không hợp lệ. Hãy tạo lại bản nháp.",
      baseTicket,
    };
  }
  const userMessage = z.string().trim().min(2).max(8000).safeParse(
    String(formData.get("message") || ""),
  );
  if (!userMessage.success) {
    return {
      ...initialContractChatState,
      status: "error",
      message: "Nội dung gửi cho AI cần từ 2 đến 8.000 ký tự.",
      baseTicket,
      ticket: contextTicket,
      content: context.content,
      missingFields: context.missingFields,
      messages: previousMessages,
    };
  }
  try {
    const provider = await getAIProvider();
    const result = await reviseContract(
      context.input,
      context.content,
      context.missingFields,
      userMessage.data,
      provider,
    );
    const nextTicket = sealPreview(
      {
        ...context,
        content: result.content,
        missingFields: result.missingFields,
        provider: result.provider,
        model: result.model,
      },
      scopeKey(organization.id, user.id),
    );
    return {
      status: "ready",
      message: "AI đã cập nhật trực tiếp bản hợp đồng theo yêu cầu của bạn.",
      baseTicket,
      ticket: nextTicket,
      content: result.content,
      missingFields: result.missingFields,
      manualChanges: result.manualChanges,
      messages: [
        ...previousMessages,
        { role: "user", text: userMessage.data },
        { role: "assistant", text: result.assistantReply },
      ],
    };
  } catch (error) {
    return {
      ...initialContractChatState,
      status: "error",
      message:
        error instanceof AIProviderError
          ? error.userMessage
          : error instanceof AIConfigurationError
            ? error.message
            : "AI chưa cập nhật được hợp đồng. Hãy thử lại sau.",
      baseTicket,
      ticket: contextTicket,
      content: context.content,
      missingFields: context.missingFields,
      messages: previousMessages,
    };
  }
}
export async function confirmContractAction(
  _previous: ContractState,
  formData: FormData,
): Promise<ContractState> {
  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );
  let ticket: z.infer<typeof ticketSchema>;
  try {
    ticket = ticketSchema.parse(
      openPreview(
        String(formData.get("ticket") || ""),
        scopeKey(organization.id, user.id),
      ),
    );
  } catch {
    return failure("Bản nháp đã hết hạn hoặc không hợp lệ. Hãy tạo lại.");
  }
  if (formData.get("confirm") !== "on")
    return failure("Xác nhận đã kiểm tra bản nháp trước khi lưu.");
  if (
    ticket.missingFields.length > 0 &&
    formData.get("acceptUnresolved") !== "on"
  )
    return failure(
      "AI vẫn còn cảnh báo. Nếu nhân sự đã kiểm tra và thấy hợp lý, hãy xác nhận chấp nhận các cảnh báo trước khi lưu.",
    );
  let documentId: string;
  try {
    const document = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.document.findFirst({
        where: {
          organizationId: organization.id,
          referenceNumber: ticket.reference,
        },
      });
      if (existing) return existing;
      const company = await transaction.companyProfile.findUnique({
        where: { organizationId: organization.id },
      });
      if (company?.updatedAt.toISOString() !== ticket.companyUpdatedAt)
        throw new Error("Company changed");
      if (ticket.input.templateId) {
        const template = await transaction.template.findFirst({
          where: {
            id: ticket.input.templateId,
            organizationId: organization.id,
            type: "contract",
            isCurrent: true,
            status: "active",
          },
        });
        if (
          !template ||
          template.updatedAt.toISOString() !== ticket.templateUpdatedAt
        )
          throw new Error("Template changed");
      }
      const input = ticket.input;
      const client = input.clientId
        ? await transaction.client.findFirst({
            where: {
              id: input.clientId,
              organizationId: organization.id,
              status: { not: "archived" },
            },
          })
        : await transaction.client.create({
            data: {
              organizationId: organization.id,
              companyName: input.name,
              address: input.address,
              representativeName:
                input.partyKind === "company"
                  ? input.representative
                  : input.name,
              taxCode:
                input.partyKind === "company" ? input.taxCode || null : null,
              email: input.email || null,
              phone: input.phone || null,
              status: "active",
            },
          });
      if (!client) throw new Error("Client unavailable");
      const project = await transaction.project.create({
        data: {
          organizationId: organization.id,
          clientId: client.id,
          name: ("Hợp đồng dịch vụ — " + input.name).slice(0, 200),
          description: input.purpose,
          serviceType: "Dịch vụ theo hợp đồng",
          status: "planning",
          startDate: new Date(input.startDate + "T00:00:00.000Z"),
          endDate: new Date(input.endDate + "T00:00:00.000Z"),
          totalValue: input.totalValue,
          currency: "VND",
          sourceRequest: JSON.stringify(input),
          createdWithAi: true,
          aiProvider: ticket.provider,
          aiModel: ticket.model,
        },
      });
      const document = await transaction.document.create({
        data: {
          organizationId: organization.id,
          clientId: client.id,
          projectId: project.id,
          templateId: input.templateId || null,
          referenceNumber: ticket.reference,
          title: ticket.content.title,
          type: "contract",
          status: "draft",
          versions: {
            create: {
              version: 1,
              content: ticket.content as Prisma.InputJsonValue,
              changeNote: `Bản nháp AI được người dùng xác nhận${ticket.missingFields.length ? `; chấp nhận ${ticket.missingFields.length} cảnh báo còn lại` : ""}; ${ticket.provider} / ${ticket.model}`,
            },
          },
        },
      });
      await transaction.activity.createMany({
        data: [
          ...(!input.clientId
            ? [
                {
                  organizationId: organization.id,
                  clientId: client.id,
                  type: "client_created" as const,
                  message: `Khách hàng ${client.companyName} được tạo sau xác nhận hợp đồng`,
                },
              ]
            : []),
          {
            organizationId: organization.id,
            clientId: client.id,
            projectId: project.id,
            type: "project_created",
            message: `Dự án ${project.name} đã được tạo`,
          },
          {
            organizationId: organization.id,
            clientId: client.id,
            projectId: project.id,
            type: "document_created",
            message: `${document.referenceNumber} được lưu ở trạng thái bản nháp sau khi kiểm tra AI`,
          },
        ],
      });
      return document;
    });
    documentId = document.id;
  } catch {
    const existing = await prisma.document.findFirst({
      where: {
        organizationId: organization.id,
        referenceNumber: ticket.reference,
      },
      select: { id: true },
    });
    if (!existing)
      return failure(
        "Chưa lưu dữ liệu. Khách hàng, công ty hoặc mẫu có thể đã thay đổi; hãy tạo lại bản nháp.",
      );
    documentId = existing.id;
  }
  for (const path of ["/", "/clients", "/projects", "/documents", "/activity"])
    revalidatePath(path);
  redirect(`/documents/${documentId}?created=1`);
}
