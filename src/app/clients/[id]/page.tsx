import {
  Building2,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityList } from "@/components/activity-list";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SuccessBanner } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const [{ id }, query, organization] = await Promise.all([
    params,
    searchParams,
    getCurrentOrganization(),
  ]);
  const client = await prisma.client.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      projects: { orderBy: { updatedAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  if (!client) notFound();

  return (
    <div className="space-y-6">
      {query.created ? <SuccessBanner>Đã tạo khách hàng thành công.</SuccessBanner> : null}
      {query.updated ? <SuccessBanner>Đã lưu thay đổi khách hàng.</SuccessBanner> : null}
      <PageHeader
        eyebrow="Tài khoản khách hàng"
        title={client.companyName}
        description={`Khách hàng từ ${formatDate(client.createdAt)}`}
        actions={
          <>
            <Link
              href={`/clients/${client.id}/edit`}
              className={buttonVariants({ variant: "secondary" })}
            >
              <Pencil className="size-4" /> Chỉnh sửa
            </Link>
            <Link
              href={`/projects/new?clientId=${client.id}`}
              className={buttonVariants()}
            >
              <Plus className="size-4" /> Dự án mới
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-extrabold text-indigo-700">
                {initials(client.companyName)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-950">{client.companyName}</h2>
                  <StatusBadge status={client.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {client.taxCode ? `Mã số thuế ${client.taxCode}` : "Chưa cung cấp mã số thuế"}
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
              {[
                { icon: UserRound, label: "Người đại diện", value: client.representativeName, sub: client.representativeTitle },
                { icon: Mail, label: "Email", value: client.email },
                { icon: Phone, label: "Số điện thoại", value: client.phone },
                { icon: MapPin, label: "Địa chỉ", value: client.address },
              ].map((item) => (
                <div key={item.label} className="flex gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <item.icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{item.value || "Chưa thiết lập"}</p>
                    {item.sub ? <p className="text-xs text-slate-500">{item.sub}</p> : null}
                  </div>
                </div>
              ))}
            </div>
            {client.website ? (
              <a
                href={client.website}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Truy cập website <ExternalLink className="size-3.5" />
              </a>
            ) : null}
            {client.notes ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ghi chú nội bộ</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{client.notes}</p>
              </div>
            ) : null}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-bold text-slate-900">Dự án</h2>
                <p className="mt-0.5 text-xs text-slate-500">{client.projects.length} dự án liên kết</p>
              </div>
              <Link href={`/projects/new?clientId=${client.id}`} className="text-sm font-bold text-indigo-600">Thêm dự án</Link>
            </div>
            {client.projects.length ? (
              <div className="divide-y divide-slate-100">
                {client.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto_150px_auto] sm:items-center sm:px-6"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{project.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{project.serviceType || "Chưa thiết lập dịch vụ"}</p>
                    </div>
                    <StatusBadge status={project.status} />
                    <ProgressBar value={project.progress} />
                    <p className="text-sm font-semibold tabular-nums text-slate-700">{formatCurrency(project.totalValue, project.currency)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <Building2 className="mx-auto size-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có dự án</p>
                <p className="mt-1 text-xs text-slate-500">Tạo dự án đầu tiên cho khách hàng này.</p>
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit p-5 sm:p-6">
          <h2 className="font-bold text-slate-900">Hoạt động gần đây</h2>
          <p className="mt-0.5 text-xs text-slate-500">Các thay đổi liên quan đến khách hàng này</p>
          <div className="mt-5"><ActivityList activities={client.activities} /></div>
        </Card>
      </div>
    </div>
  );
}
