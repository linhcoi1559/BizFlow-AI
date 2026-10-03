import { Building2, FolderKanban, Search } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Tìm kiếm" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const organization = await getCurrentOrganization();
  const [clients, projects] = term
    ? await Promise.all([
        prisma.client.findMany({
          where: {
            organizationId: organization.id,
            OR: [
              { companyName: { contains: term } },
              { representativeName: { contains: term } },
              { email: { contains: term } },
            ],
          },
          take: 12,
          orderBy: { companyName: "asc" },
        }),
        prisma.project.findMany({
          where: {
            organizationId: organization.id,
            OR: [
              { name: { contains: term } },
              { serviceType: { contains: term } },
              { client: { companyName: { contains: term } } },
            ],
          },
          include: { client: { select: { companyName: true } } },
          take: 12,
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <PageHeader
        title={term ? `Kết quả tìm kiếm cho “${term}”` : "Tìm kiếm BizFlow"}
        description="Tìm khách hàng và dự án trong tổ chức hiện tại."
      />
      {!term ? (
        <EmptyState
          icon={Search}
          title="Nhập từ khóa tìm kiếm"
          description="Sử dụng ô tìm kiếm phía trên để tìm khách hàng, người đại diện, dự án hoặc dịch vụ."
        />
      ) : clients.length || projects.length ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-indigo-600" />
              <h2 className="font-bold text-slate-900">Khách hàng ({clients.length})</h2>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {clients.length ? clients.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-indigo-600">
                  <div>
                    <p className="text-sm font-bold">{client.companyName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{client.representativeName || client.email || "Chưa có liên hệ chính"}</p>
                  </div>
                  <StatusBadge status={client.status} />
                </Link>
              )) : <p className="py-6 text-sm text-slate-500">Không có khách hàng phù hợp.</p>}
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <FolderKanban className="size-4 text-indigo-600" />
              <h2 className="font-bold text-slate-900">Dự án ({projects.length})</h2>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {projects.length ? projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-indigo-600">
                  <div>
                    <p className="text-sm font-bold">{project.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{project.client.companyName} · {project.serviceType || "Chưa thiết lập dịch vụ"}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </Link>
              )) : <p className="py-6 text-sm text-slate-500">Không có dự án phù hợp.</p>}
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="Không tìm thấy kết quả"
          description="Hãy thử tên công ty, người liên hệ, dịch vụ hoặc dự án với từ khóa khác."
        />
      )}
    </div>
  );
}
