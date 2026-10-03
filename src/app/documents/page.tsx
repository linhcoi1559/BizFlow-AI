import { ChevronRight, FilePlus2, FileStack, Search } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { formatDate, titleCase } from "@/lib/utils";

export const metadata = { title: "Tài liệu" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
}) {
  const { q = "", status = "all", type = "all" } = await searchParams;
  const organization = await getCurrentOrganization();
  const statuses = ["draft", "in_review", "approved", "archived"] as const;
  const types = ["proposal", "quotation", "contract", "other"] as const;
  const safeStatus = statuses.find((item) => item === status);
  const safeType = types.find((item) => item === type);
  const documents = await prisma.document.findMany({
    where: {
      organizationId: organization.id,
      ...(safeStatus ? { status: safeStatus } : {}),
      ...(safeType ? { type: safeType } : {}),
      ...(q.trim()
        ? {
            OR: [
              { title: { contains: q.trim() } },
              { referenceNumber: { contains: q.trim() } },
              { client: { companyName: { contains: q.trim() } } },
              { project: { name: { contains: q.trim() } } },
            ],
          }
        : {}),
    },
    include: {
      client: { select: { companyName: true } },
      project: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tài liệu"
        description="Tạo, rà soát, phê duyệt, quản lý phiên bản và xuất tài liệu kinh doanh theo dự án."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/contracts/new"
              className={buttonVariants({ variant: "secondary" })}
            >
              Tạo hợp đồng bằng AI
            </Link>
            <Link href="/documents/new" className={buttonVariants()}>
              <FilePlus2 className="size-4" /> Tài liệu mới
            </Link>
          </div>
        }
      />

      <Card className="p-4">
        <form
          method="get"
          className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto_auto]"
        >
          <label className="relative">
            <span className="sr-only">Tìm kiếm tài liệu</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Tìm tiêu đề, mã tham chiếu hoặc khách hàng…"
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <option value="all">Tất cả trạng thái</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {titleCase(item)}
              </option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={type}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <option value="all">Tất cả loại</option>
            {types.map((item) => (
              <option key={item} value={item}>
                {titleCase(item)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className={buttonVariants({ variant: "secondary" })}
          >
            Áp dụng bộ lọc
          </button>
          {q || status !== "all" || type !== "all" ? (
            <Link
              href="/documents"
              className={buttonVariants({ variant: "ghost" })}
            >
              Xóa bộ lọc
            </Link>
          ) : null}
        </form>
      </Card>

      {documents.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Tài liệu</th>
                  <th className="px-4 py-3 font-semibold">Loại</th>
                  <th className="px-4 py-3 font-semibold">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold">Dự án</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Phiên bản</th>
                  <th className="px-4 py-3 font-semibold">Cập nhật</th>
                  <th className="w-12 px-4 py-3">
                    <span className="sr-only">Mở</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((document) => (
                  <tr key={document.id} className="group hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <Link
                        href={`/documents/${document.id}`}
                        className="font-bold text-slate-900 group-hover:text-indigo-600"
                      >
                        {document.title}
                      </Link>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        {document.referenceNumber}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-600">
                      {titleCase(document.type)}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700">
                      {document.client.companyName}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {document.project.name}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={document.status} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-600">
                      v{document.currentVersion}
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {formatDate(document.updatedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/documents/${document.id}`}
                        aria-label={`Mở ${document.title}`}
                        className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-indigo-600"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={FileStack}
          title="Không tìm thấy tài liệu"
          description="Tạo bản nháp có thể chỉnh sửa từ dự án và mẫu tài liệu có phiên bản."
          action={
            <Link href="/documents/new" className={buttonVariants()}>
              <FilePlus2 className="size-4" /> Tạo tài liệu
            </Link>
          }
        />
      )}
    </div>
  );
}
