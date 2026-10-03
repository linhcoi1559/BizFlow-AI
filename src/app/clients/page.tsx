import { Building2, ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { formatDate, initials } from "@/lib/utils";

export const metadata = { title: "Khách hàng" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "all" } = await searchParams;
  const organization = await getCurrentOrganization();
  const safeStatus = ["active", "inactive", "archived"].includes(status)
    ? (status as "active" | "inactive" | "archived")
    : undefined;

  const clients = await prisma.client.findMany({
    where: {
      organizationId: organization.id,
      ...(safeStatus ? { status: safeStatus } : {}),
      ...(q.trim()
        ? {
            OR: [
              { companyName: { contains: q.trim() } },
              { representativeName: { contains: q.trim() } },
              { email: { contains: q.trim() } },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: { projects: { where: { status: "active" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khách hàng"
        description="Quản lý doanh nghiệp khách hàng, người liên hệ và các dự án liên quan."
        actions={
          <Link href="/clients/new" className={buttonVariants()}>
            <Plus className="size-4" /> Khách hàng mới
          </Link>
        }
      />

      <Card className="p-4">
        <form className="flex flex-col gap-3 sm:flex-row" method="get">
          <label className="relative flex-1">
            <span className="sr-only">Tìm kiếm khách hàng</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
            placeholder="Tìm công ty, người đại diện hoặc email…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-indigo-400"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Không hoạt động</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
          <button type="submit" className={buttonVariants({ variant: "secondary" })}>
            Áp dụng bộ lọc
          </button>
          {q || status !== "all" ? (
            <Link href="/clients" className={buttonVariants({ variant: "ghost" })}>
              Xóa bộ lọc
            </Link>
          ) : null}
        </form>
      </Card>

      {clients.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Công ty</th>
                  <th className="px-4 py-3 font-semibold">Người đại diện</th>
                  <th className="px-4 py-3 font-semibold">Liên hệ</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-center font-semibold">Dự án hoạt động</th>
                  <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                  <th className="w-12 px-4 py-3"><span className="sr-only">Mở</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <tr key={client.id} className="group hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                          {initials(client.companyName)}
                        </div>
                        <div>
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-bold text-slate-900 group-hover:text-indigo-600"
                          >
                            {client.companyName}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {client.taxCode ? `Mã số thuế: ${client.taxCode}` : "Chưa có mã số thuế"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-700">
                        {client.representativeName || "Chưa thiết lập"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {client.representativeTitle || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-slate-700">{client.email || "Chưa có email"}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{client.phone || "Chưa có số điện thoại"}</p>
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={client.status} /></td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums text-slate-700">
                      {client._count.projects}
                    </td>
                    <td className="px-4 py-4 text-slate-500">{formatDate(client.createdAt)}</td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/clients/${client.id}`}
                        aria-label={`Mở ${client.companyName}`}
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
            Hiển thị {clients.length} khách hàng
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Building2}
          title="Không tìm thấy khách hàng"
          description={
            q || safeStatus
              ? "Hãy thay đổi bộ lọc hoặc tạo một khách hàng mới."
              : "Tạo khách hàng đầu tiên để bắt đầu quản lý dự án và hoạt động kinh doanh."
          }
          action={
            <Link href="/clients/new" className={buttonVariants()}>
              <Plus className="size-4" /> Tạo khách hàng
            </Link>
          }
        />
      )}
    </div>
  );
}
