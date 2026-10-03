import { Building2, Plus } from "lucide-react";
import Link from "next/link";

import { ProjectForm } from "@/components/projects/project-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Dự án mới" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const [{ clientId }, organization] = await Promise.all([
    searchParams,
    getCurrentOrganization(),
  ]);
  const clients = await prisma.client.findMany({
    where: { organizationId: organization.id, status: { not: "archived" } },
    select: { id: true, companyName: true },
    orderBy: { companyName: "asc" },
  });
  const selectedClientId = clients.some((client) => client.id === clientId)
    ? clientId
    : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Quản lý dự án"
        title="Tạo dự án mới"
        description="Ghi nhận khách hàng, giá trị thương mại, thời gian bàn giao, người phụ trách và kết quả đo lường."
        actions={
          <Link href="/projects" className={buttonVariants({ variant: "secondary" })}>
            Quay lại danh sách dự án
          </Link>
        }
      />
      {clients.length ? (
        <Card className="p-5 sm:p-7">
          <ProjectForm clients={clients} selectedClientId={selectedClientId} />
        </Card>
      ) : (
        <EmptyState
          icon={Building2}
          title="Hãy tạo khách hàng trước"
          description="Mỗi dự án BizFlow phải thuộc về một khách hàng. Hãy thêm khách hàng rồi quay lại tạo dự án."
          action={
            <Link href="/clients/new" className={buttonVariants()}>
              <Plus className="size-4" /> Khách hàng mới
            </Link>
          }
        />
      )}
    </div>
  );
}
