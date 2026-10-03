import "server-only";

import type { CompanyProfile, Client, Project } from "@prisma/client";

import { formatCurrency, formatDate } from "@/lib/utils";
import {
  documentContentSchema,
  type DocumentContent,
  type DocumentTypeValue,
  type TemplateContent,
} from "@/services/documents/schemas";

type DraftContext = {
  company: CompanyProfile | null;
  client: Client;
  project: Project;
};

const fallback = "Chưa xác nhận";

function replacements({ company, client, project }: DraftContext) {
  return {
    "company.name": company?.companyName || "Công ty chúng tôi",
    "company.taxCode": company?.taxCode || fallback,
    "company.address": company?.address || fallback,
    "company.representative": company?.representativeName || fallback,
    "client.companyName": client.companyName,
    "client.taxCode": client.taxCode || fallback,
    "client.address": client.address || fallback,
    "client.representative": client.representativeName || fallback,
    "project.name": project.name,
    "project.description": project.description || fallback,
    "project.serviceType": project.serviceType || fallback,
    "project.startDate": formatDate(project.startDate),
    "project.endDate": formatDate(project.endDate),
    "project.duration": project.durationMonths
      ? `${project.durationMonths} tháng`
      : fallback,
    "project.kpi": project.kpi || fallback,
    "project.totalValue": formatCurrency(project.totalValue, project.currency),
    "project.monthlyFee": project.monthlyFee
      ? formatCurrency(project.monthlyFee, project.currency)
      : fallback,
  } satisfies Record<string, string>;
}

export function renderTemplateValue(value: string, context: DraftContext) {
  const values = replacements(context);
  return value.replace(/\{\{([a-zA-Z0-9.]+)\}\}/g, (match, key: string) => {
    return values[key as keyof typeof values] ?? match;
  });
}

export function buildDocumentDraft(
  template: TemplateContent,
  context: DraftContext,
): DocumentContent {
  const totalValue = Number(context.project.totalValue);

  return documentContentSchema.parse({
    title: renderTemplateValue(template.titlePattern, context),
    sections: template.sections.map((section) => ({
      key: section.key,
      heading: section.heading,
      body: renderTemplateValue(section.body, context),
    })),
    lineItems: [
      {
        description: context.project.serviceType || context.project.name,
        quantity: context.project.durationMonths || 1,
        unit: context.project.durationMonths ? "tháng" : "dự án",
        unitPrice: context.project.monthlyFee
          ? Number(context.project.monthlyFee)
          : totalValue,
      },
    ],
    currency: context.project.currency,
    totalValue,
    paymentTerms: renderTemplateValue(template.paymentTerms, context),
    notes: renderTemplateValue(template.notes, context),
  });
}

export function inferDocumentType(value: string): DocumentTypeValue {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("contract") || normalized.includes("hop dong")) return "contract";
  if (normalized.includes("quotation") || normalized.includes("quote") || normalized.includes("bao gia")) {
    return "quotation";
  }
  if (normalized.includes("proposal") || normalized.includes("de xuat")) return "proposal";
  return "other";
}

export function documentTypeLabel(type: DocumentTypeValue) {
  return {
    proposal: "Đề xuất",
    quotation: "Báo giá",
    contract: "Hợp đồng",
    other: "Tài liệu nghiệp vụ",
  }[type];
}

export function referencePrefix(type: DocumentTypeValue) {
  return {
    proposal: "PR",
    quotation: "QT",
    contract: "CT",
    other: "DOC",
  }[type];
}
