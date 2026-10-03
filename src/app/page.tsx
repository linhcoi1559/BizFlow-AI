import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  FileSignature,
  FolderKanban,
  ListChecks,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { ActivityList } from "@/components/activity-list";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Tổng quan" };

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  muted = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  muted?: boolean;
}) {
  return (
    <Card className="group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div
          className={`flex size-10 items-center justify-center rounded-xl ${
            muted ? "bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-600"
          }`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-400">{detail}</p>
    </Card>
  );
}

export default async function DashboardPage() {
  const organization = await getCurrentOrganization();
  const now = new Date();
  const deadlineLimit = new Date(now);
  deadlineLimit.setUTCDate(deadlineLimit.getUTCDate() + 30);

  const [
    totalClients,
    activeProjects,
    activeContracts,
    completedProjects,
    totalValue,
    upcomingDeadlines,
    recentProjects,
    attentionProjects,
    overdueTasks,
    outstandingPayments,
    openReminders,
    activities,
  ] = await Promise.all([
    prisma.client.count({ where: { organizationId: organization.id } }),
    prisma.project.count({
      where: { organizationId: organization.id, status: "active" },
    }),
    prisma.document.count({
      where: {
        organizationId: organization.id,
        type: "contract",
        status: "approved",
      },
    }),
    prisma.project.count({
      where: { organizationId: organization.id, status: "completed" },
    }),
    prisma.project.aggregate({
      where: { organizationId: organization.id, status: { not: "cancelled" } },
      _sum: { totalValue: true },
    }),
    prisma.project.count({
      where: {
        organizationId: organization.id,
        status: { in: ["active", "planning"] },
        endDate: { gte: now, lte: deadlineLimit },
      },
    }),
    prisma.project.findMany({
      where: { organizationId: organization.id },
      include: { client: { select: { companyName: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.project.findMany({
      where: {
        organizationId: organization.id,
        status: { in: ["active", "planning"] },
        OR: [{ endDate: { lte: deadlineLimit } }, { progress: { lt: 40 } }],
      },
      include: { client: { select: { companyName: true } } },
      orderBy: [{ endDate: "asc" }, { progress: "asc" }],
      take: 4,
    }),
    prisma.task.findMany({
      where: {
        organizationId: organization.id,
        status: { notIn: ["completed", "cancelled"] },
        dueDate: { lt: now },
      },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 4,
    }),
    prisma.paymentMilestone.count({
      where: {
        organizationId: organization.id,
        status: { in: ["scheduled", "invoiced", "overdue"] },
      },
    }),
    prisma.reminder.count({
      where: {
        organizationId: organization.id,
        status: "pending",
        dueAt: { lte: deadlineLimit },
      },
    }),
    prisma.activity.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Tổng quan không gian làm việc"
        title="Chào bạn"
        description="Tổng hợp tình hình khách hàng và dự án của bạn hôm nay."
        actions={
          <Link href="/projects/new" className={buttonVariants()}>
            <Plus className="size-4" /> Dự án mới
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Tổng khách hàng"
          value={totalClients.toString()}
          detail="Tất cả tài khoản khách hàng"
          icon={Building2}
        />
        <MetricCard
          label="Dự án đang hoạt động"
          value={activeProjects.toString()}
          detail="Đang trong quá trình bàn giao"
          icon={FolderKanban}
        />
        <MetricCard
          label="Hợp đồng hiệu lực"
          value={activeContracts.toString()}
          detail="Hợp đồng đã phê duyệt"
          icon={FileSignature}
        />
        <MetricCard
          label="Tổng giá trị dự án"
          value={formatCurrency(totalValue._sum.totalValue ?? 0)}
          detail="Không gồm công việc đã hủy"
          icon={TrendingUp}
        />
        <MetricCard
          label="Hạn sắp tới"
          value={upcomingDeadlines.toString()}
          detail="Đến hạn trong 30 ngày tới"
          icon={CalendarClock}
        />
        <MetricCard
          label="Dự án hoàn thành"
          value={completedProjects.toString()}
          detail="Tổng số đã bàn giao"
          icon={CheckCircle2}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Công việc quá hạn"
          value={overdueTasks.length.toString()}
          detail="Công việc chưa xong đã quá hạn"
          icon={ListChecks}
          muted={!overdueTasks.length}
        />
        <MetricCard
          label="Thanh toán chưa thu"
          value={outstandingPayments.toString()}
          detail="Đã lên lịch, xuất hóa đơn hoặc quá hạn"
          icon={CircleDollarSign}
          muted={!outstandingPayments}
        />
        <MetricCard
          label="Nhắc việc đang mở"
          value={openReminders.toString()}
          detail="Đến hạn trong 30 ngày tới"
          icon={BellRing}
          muted={!openReminders}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">Dự án gần đây</h2>
              <p className="mt-0.5 text-xs text-slate-500">Công việc mới nhất trong danh mục</p>
            </div>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Dự án</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Tiến độ</th>
                  <th className="px-6 py-3 text-right font-semibold">Giá trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentProjects.map((project) => (
                  <tr key={project.id} className="group hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-semibold text-slate-900 group-hover:text-indigo-600"
                      >
                        {project.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {project.client.companyName}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-4">
                      <ProgressBar value={project.progress} />
                    </td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums text-slate-700">
                      {formatCurrency(project.totalValue, project.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Cần chú ý</h2>
              <p className="mt-0.5 text-xs text-slate-500">Tín hiệu từ dữ liệu dự án hiện tại</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <CircleAlert className="size-4.5" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {overdueTasks.map((task) => (
              <Link
                key={task.id}
                href={`/projects/${task.projectId}?tab=tasks`}
                className="block rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 transition hover:border-rose-200"
              >
                <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>
                <p className="mt-1 text-xs font-medium text-rose-700">Công việc quá hạn · {task.project.name}</p>
              </Link>
            ))}
            {attentionProjects.length ? (
              attentionProjects.map((project) => {
                const daysToDeadline = project.endDate
                  ? Math.ceil(
                      (project.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                    )
                  : null;
                const message =
                  daysToDeadline !== null && daysToDeadline <= 30
                    ? daysToDeadline < 0
                      ? `Đã quá hạn ${Math.abs(daysToDeadline)} ngày`
                      : `Còn ${daysToDeadline} ngày đến hạn`
                    : `Tiến độ hiện tại ${project.progress}%`;
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition hover:border-amber-200 hover:bg-amber-50/40"
                  >
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {project.name}
                    </p>
                    <p className="mt-1 text-xs font-medium text-amber-700">{message}</p>
                  </Link>
                );
              })
            ) : !overdueTasks.length ? (
              <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                Không có mục nào cần chú ý ngay.
              </p>
            ) : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.65fr)]">
        <Card className="p-5 sm:p-6">
          <h2 className="font-bold text-slate-900">Thao tác nhanh</h2>
          <p className="mt-0.5 text-xs text-slate-500">Tiếp tục công việc từ một nơi</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              {
                href: "/ai-workspace",
                label: "Tạo bằng AI",
                detail: "Chuẩn bị yêu cầu kinh doanh",
                icon: Sparkles,
              },
              {
                href: "/clients/new",
                label: "Khách hàng mới",
                detail: "Thêm tài khoản khách hàng",
                icon: Building2,
              },
              {
                href: "/projects/new",
                label: "Dự án mới",
                detail: "Thiết lập công việc và thời hạn",
                icon: BriefcaseBusiness,
              },
              {
                href: "/documents/new?type=contract",
                label: "Tạo hợp đồng",
                detail: "Bắt đầu từ mẫu có phiên bản",
                icon: FileSignature,
              },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                  <action.icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{action.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{action.detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Hoạt động gần đây</h2>
              <p className="mt-0.5 text-xs text-slate-500">Thay đổi mới nhất trong không gian làm việc</p>
            </div>
            <Link href="/activity" className="text-xs font-bold text-indigo-600">
              Xem tất cả
            </Link>
          </div>
          <div className="mt-4">
            <ActivityList activities={activities} />
          </div>
        </Card>
      </section>
    </div>
  );
}
