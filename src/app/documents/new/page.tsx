import { Blocks, FilePlus2 } from "lucide-react";
import Link from "next/link";

import { CreateDocumentForm } from "@/components/documents/create-document-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Tài liệu mới" };

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; type?: string; templateId?: string }>;
}) {
  const [query, organization] = await Promise.all([searchParams, getCurrentOrganization()]);
  const [projects, templates] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: organization.id },
      include: { client: { select: { companyName: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.template.findMany({
      where: { organizationId: organization.id, isCurrent: true, status: "active" },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);
  const selectedProjectId = projects.some((item) => item.id === query.projectId) ? query.projectId : undefined;
  const explicitTemplate = templates.find((item) => item.id === query.templateId);
  const typeTemplate = templates.find((item) => item.type === query.type);
  const selectedTemplateId = explicitTemplate?.id || typeTemplate?.id || templates[0]?.id;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Quy trình tài liệu"
        title="Tạo bản nháp có thể chỉnh sửa"
        description="Chọn dự án và mẫu hiện tại. BizFlow sẽ điền phiên bản có cấu trúc đầu tiên từ dữ liệu đáng tin cậy trong hệ thống."
        actions={<Link href="/documents" className={buttonVariants({ variant: "secondary" })}>Quay lại tài liệu</Link>}
      />
      {!templates.length ? (
        <EmptyState
          icon={Blocks}
          title="Hãy tạo mẫu tài liệu trước"
          description="Mỗi bản nháp tài liệu phải bắt đầu từ một mẫu đang hoạt động và có phiên bản."
          action={<Link href="/templates/new" className={buttonVariants()}>Tạo mẫu tài liệu</Link>}
        />
      ) : !projects.length ? (
        <EmptyState
          icon={FilePlus2}
          title="Hãy tạo dự án trước"
          description="Tài liệu luôn liên kết với dự án khách hàng và kế thừa ngữ cảnh kinh doanh của dự án."
          action={<Link href="/projects/new" className={buttonVariants()}>Tạo dự án</Link>}
        />
      ) : (
        <Card className="p-5 sm:p-7">
          <CreateDocumentForm
            projects={projects.map((item) => ({ id: item.id, name: item.name, clientName: item.client.companyName }))}
            templates={templates.map((item) => ({ id: item.id, name: item.name, type: item.type, version: item.version }))}
            selectedProjectId={selectedProjectId}
            selectedTemplateId={selectedTemplateId}
          />
        </Card>
      )}
    </div>
  );
}
