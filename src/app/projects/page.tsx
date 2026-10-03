import { ChevronRight, FolderKanban, Plus, Search } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";

export const metadata = { title: "Dự án" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; client?: string }>;
}) {
  const { q = "", status = "all", client = "all" } = await searchParams;
  const organization = await getCurrentOrganization();
  const statuses = ["draft", "planning", "active", "paused", "completed", "cancelled"] as const;
  const safeStatus = statuses.find((item) => item === status);

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: organization.id, status: { not: "archived" } },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
    prisma.project.findMany({
      where: {
        organizationId: organization.id,
        ...(safeStatus ? { status: safeStatus } : {}),
        ...(client !== "all" ? { clientId: client } : {}),
        ...(q.trim()
          ? {
              OR: [
                { name: { contains: q.trim() } },
                { serviceType: { contains: q.trim() } },
                { ownerName: { contains: q.trim() } },
                { client: { companyName: { contains: q.trim() } } },
              ],
            }
          : {}),
      },
      include: { client: { select: { companyName: true } } },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dự án"
        description="Theo dõi phạm vi, giá trị, tiến độ bàn giao và người phụ trách của mọi dự án khách hàng."
        actions={
          <Link href="/projects/new" className={buttonVariants()}>
            <Plus className="size-4" /> Dự án mới
          </Link>
        }
      />

      <Card className="p-4">
        <form method="get" className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_220px_auto_auto]">
          <label className="relative">
            <span className="sr-only">Tìm kiếm dự án</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
            placeholder="Tìm dự án, dịch vụ hoặc người phụ trách…"
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
              <option key={item} value={item}>{titleCase(item)}</option>
            ))}
          </select>
          <select
            name="client"
            defaultValue={client}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <option value="all">Tất cả khách hàng</option>
            {clients.map((item) => (
              <option key={item.id} value={item.id}>{item.companyName}</option>
            ))}
          </select>
          <button type="submit" className={buttonVariants({ variant: "secondary" })}>
            Áp dụng bộ lọc
          </button>
          {q || status !== "all" || client !== "all" ? (
            <Link href="/projects" className={buttonVariants({ variant: "ghost" })}>Xóa bộ lọc</Link>
          ) : null}
        </form>
      </Card>

      {projects.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Dự án</th>
                  <th className="px-4 py-3 font-semibold">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Giá trị</th>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Tiến độ</th>
                  <th className="px-4 py-3 font-semibold">Phụ trách</th>
                  <th className="w-12 px-4 py-3"><span className="sr-only">Mở</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((project) => (
                  <tr key={project.id} className="group hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <Link href={`/projects/${project.id}`} className="font-bold text-slate-900 group-hover:text-indigo-600">
                        {project.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-400">{project.serviceType || "Chưa thiết lập dịch vụ"}</p>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700">{project.client.companyName}</td>
                    <td className="px-4 py-4"><StatusBadge status={project.status} /></td>
                    <td className="px-4 py-4 font-semibold tabular-nums text-slate-700">
                      {formatCurrency(project.totalValue, project.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-medium text-slate-600">{formatDate(project.startDate)}</p>
                      <p className="mt-0.5 text-xs text-slate-400">đến {formatDate(project.endDate)}</p>
                    </td>
                    <td className="px-4 py-4"><ProgressBar value={project.progress} /></td>
                    <td className="px-4 py-4 text-slate-600">{project.ownerName || "Chưa phân công"}</td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/projects/${project.id}`}
                        aria-label={`Mở ${project.name}`}
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
          <div className="border-t border-slate-100 px-6 py-3 text-xs font-medium text-slate-400">
            Hiển thị {projects.length} dự án
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="Không tìm thấy dự án"
          description="Tạo dự án đầu tiên hoặc để BizFlow AI tạo tự động từ yêu cầu kinh doanh."
          action={
            <Link href="/projects/new" className={buttonVariants()}>
              <Plus className="size-4" /> Tạo dự án
            </Link>
          }
        />
      )}
    </div>
  );
}
