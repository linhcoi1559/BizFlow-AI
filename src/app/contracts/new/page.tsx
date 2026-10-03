import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ContractWizard } from "@/components/ai/contract-wizard";
import {
  requireOrganizationRole,
  WORKSPACE_EDITOR_ROLES,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { aiConfigured } from "@/services/ai/provider-factory";
export const metadata = { title: "Tạo hợp đồng bằng AI" };
export default async function NewContractPage() {
  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );
  const [clients, templates, configured] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: organization.id, status: { not: "archived" } },
      orderBy: { companyName: "asc" },
      select: {
        id: true,
        companyName: true,
        address: true,
        representativeName: true,
        taxCode: true,
        email: true,
        phone: true,
      },
    }),
    prisma.template.findMany({
      where: {
        organizationId: organization.id,
        type: "contract",
        status: "active",
        isCurrent: true,
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    aiConfigured(),
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Tạo hợp đồng bằng AI"
        description="Nhập thông tin → xem bản nháp → xác nhận → duyệt và xuất hợp đồng."
        actions={
          <Link
            href="/settings/ai"
            className={buttonVariants({ variant: "secondary" })}
          >
            Kết nối ChatGPT
          </Link>
        }
      />
      <ContractWizard
        key={`${organization.id}:${user.id}`}
        draftStorageKey={`bizflow:contract-draft:v1:${organization.id}:${user.id}`}
        clients={clients}
        templates={templates}
        configured={configured}
      />
    </div>
  );
}
