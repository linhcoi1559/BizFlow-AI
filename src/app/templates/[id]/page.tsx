import { History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TemplateForm } from "@/components/templates/template-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SuccessBanner } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { templateContentSchema } from "@/services/documents/schemas";

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; versioned?: string }>;
}) {
  const [{ id }, query, organization] = await Promise.all([params, searchParams, getCurrentOrganization()]);
  const template = await prisma.template.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!template) notFound();

  const content = templateContentSchema.safeParse(template.content);
  if (!content.success) throw new Error("Nội dung mẫu không hợp lệ và không thể chỉnh sửa.");

  const versions = await prisma.template.findMany({
    where: { organizationId: organization.id, templateKey: template.templateKey },
    select: { id: true, version: true, isCurrent: true, createdAt: true },
    orderBy: { version: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {query.created ? <SuccessBanner>Đã tạo mẫu tài liệu thành công.</SuccessBanner> : null}
      {query.versioned ? <SuccessBanner>Đã tạo phiên bản mẫu mới thành công.</SuccessBanner> : null}
      <PageHeader
        eyebrow={`Phiên bản ${template.version}${template.isCurrent ? " · Hiện tại" : " · Lịch sử"}`}
        title={template.name}
        description="Thay đổi được lưu thành phiên bản mẫu mới để các bản chụp tài liệu hiện có không bị thay đổi."
        actions={<Link href="/templates" className={buttonVariants({ variant: "secondary" })}>Quay lại mẫu tài liệu</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <Card className="p-5 sm:p-7">
          <TemplateForm
            mode="version"
            value={{
              id: template.id,
              name: template.name,
              description: template.description || "",
              type: template.type,
              version: template.version,
              content: content.data,
            }}
          />
        </Card>
        <Card className="h-fit p-5">
          <div className="flex items-center gap-2">
            <History className="size-4 text-indigo-600" />
            <h2 className="font-bold text-slate-900">Lịch sử phiên bản</h2>
          </div>
          <div className="mt-4 space-y-2">
            {versions.map((version) => (
              <Link
                key={version.id}
                href={`/templates/${version.id}`}
                className="block rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <span className="font-bold text-slate-800">Phiên bản {version.version}</span>
                {version.isCurrent ? <span className="ml-2 text-xs font-bold text-emerald-600">Hiện tại</span> : null}
                <span className="mt-1 block text-xs text-slate-400">{formatDateTime(version.createdAt)}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
