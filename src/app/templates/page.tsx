import { Blocks, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { formatDate, titleCase } from "@/lib/utils";

export const metadata = { title: "Mẫu tài liệu" };

export default async function TemplatesPage() {
  const organization = await getCurrentOrganization();
  const templates = await prisma.template.findMany({
    where: { organizationId: organization.id, isCurrent: true },
    include: { _count: { select: { documents: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mẫu tài liệu"
        description="Quản lý cấu trúc có thể tái sử dụng và có phiên bản cho đề xuất, báo giá, hợp đồng và tài liệu kinh doanh khác."
        actions={
          <Link href="/templates/new" className={buttonVariants()}>
            <Plus className="size-4" /> Mẫu mới
          </Link>
        }
      />

      {templates.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Link key={template.id} href={`/templates/${template.id}`} className="group">
              <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Blocks className="size-5" />
                  </div>
                  <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
                  {titleCase(template.type)} · Phiên bản {template.version}
                </p>
                <h2 className="mt-1 font-bold text-slate-900 group-hover:text-indigo-700">{template.name}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                  {template.description || "Mẫu tài liệu kinh doanh có cấu trúc và có thể tái sử dụng."}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
                  <span>{template._count.documents} tài liệu</span>
                  <span>Cập nhật {formatDate(template.updatedAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Blocks}
          title="Chưa có mẫu tài liệu"
          description="Tạo cấu trúc có thể tái sử dụng cho đề xuất, báo giá, hợp đồng hoặc tài liệu kinh doanh khác."
          action={<Link href="/templates/new" className={buttonVariants()}><Plus className="size-4" /> Tạo mẫu</Link>}
        />
      )}
    </div>
  );
}
