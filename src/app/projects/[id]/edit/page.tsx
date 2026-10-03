import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectForm } from "@/components/projects/project-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  WORKSPACE_EDITOR_ROLES,
  requireOrganizationRole,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";

function dateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, { organization }] = await Promise.all([
    params,
    requireOrganizationRole(WORKSPACE_EDITOR_ROLES),
  ]);
  const project = await prisma.project.findFirst({
    where: { id, organizationId: organization.id },
    include: { client: true, _count: { select: { tasks: true } } },
  });

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Quản lý dự án"
        title={`Chỉnh sửa ${project.name}`}
        description="Cập nhật phạm vi, lịch trình, người phụ trách, giá trị và trạng thái dự án."
        actions={
          <Link
            href={`/projects/${project.id}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Quay lại dự án
          </Link>
        }
      />
      <Card className="p-5 sm:p-7">
        <ProjectForm
          mode="edit"
          clients={[{ id: project.client.id, companyName: project.client.companyName }]}
          progressLocked={project._count.tasks > 0}
          values={{
            id: project.id,
            clientId: project.clientId,
            name: project.name,
            description: project.description,
            serviceType: project.serviceType,
            status: project.status,
            startDate: dateInputValue(project.startDate),
            endDate: dateInputValue(project.endDate),
            totalValue: project.totalValue.toString(),
            currency: project.currency,
            ownerName: project.ownerName,
            progress: project.progress,
            kpi: project.kpi,
          }}
        />
      </Card>
    </div>
  );
}
