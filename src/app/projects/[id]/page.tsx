import {
  Banknote,
  BellRing,
  CalendarDays,
  CheckSquare2,
  FilePlus2,
  FileStack,
  FolderKanban,
  Goal,
  Pencil,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityList } from "@/components/activity-list";
import {
  PaymentsTable,
  PlanTab,
  RemindersPanel,
  TasksTable,
} from "@/components/execution/project-execution-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBanner, SuccessBanner } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { hasOrganizationRole } from "@/lib/authorization";
import {
  WORKSPACE_EDITOR_ROLES,
  getCurrentOrganizationContext,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { documentTypeLabel, inferDocumentType } from "@/services/documents/draft";

const tabs = ["overview", "documents", "plan", "tasks", "payments", "reminders", "activity"] as const;
type Tab = (typeof tabs)[number];
const tabLabels: Record<Tab, string> = {
  overview: "Tổng quan",
  documents: "Tài liệu",
  plan: "Kế hoạch",
  tasks: "Công việc",
  payments: "Thanh toán",
  reminders: "Nhắc việc",
  activity: "Hoạt động",
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    created?: string;
    updated?: string;
    source?: string;
    planCreated?: string;
    planSaved?: string;
    planActivated?: string;
    taskUpdated?: string;
    paymentUpdated?: string;
    reminderCreated?: string;
    reminderUpdated?: string;
    planError?: string;
    activationError?: string;
  }>;
}) {
  const [{ id }, query, context] = await Promise.all([
    params,
    searchParams,
    getCurrentOrganizationContext(),
  ]);
  const organization = context.organization;
  const canEditProject = hasOrganizationRole(
    context.membership.role,
    WORKSPACE_EDITOR_ROLES,
  );
  const activeTab: Tab = tabs.includes(query.tab as Tab) ? (query.tab as Tab) : "overview";
  const project = await prisma.project.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      client: true,
      documents: { orderBy: { updatedAt: "desc" } },
      plan: {
        include: {
          items: { orderBy: { position: "asc" } },
          sourceDocument: {
            select: { id: true, title: true, referenceNumber: true },
          },
        },
      },
      tasks: { orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] },
      payments: { orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] },
      reminders: { orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!project) notFound();

  const suggestedDocuments = Array.isArray(project.suggestedDocuments)
    ? project.suggestedDocuments.filter(
        (document): document is string => typeof document === "string",
      )
    : [];

  return (
    <div className="space-y-6">
      {query.created ? (
        <SuccessBanner>
          {query.source === "ai"
            ? "Đã xác nhận yêu cầu AI và tạo thành công hồ sơ khách hàng, dự án."
            : "Đã tạo dự án thành công."}
        </SuccessBanner>
      ) : null}
      {query.updated ? <SuccessBanner>Đã cập nhật dự án thành công.</SuccessBanner> : null}
      {query.planCreated ? <SuccessBanner>Đã tạo bản xem trước kế hoạch. Hãy kiểm tra từng cột mốc trước khi kích hoạt.</SuccessBanner> : null}
      {query.planSaved ? <SuccessBanner>Đã lưu bản nháp kế hoạch.</SuccessBanner> : null}
      {query.planActivated ? <SuccessBanner>Đã kích hoạt kế hoạch và tạo công việc, cột mốc thanh toán, nhắc việc.</SuccessBanner> : null}
      {query.taskUpdated ? <SuccessBanner>Đã cập nhật công việc và tính lại tiến độ dự án.</SuccessBanner> : null}
      {query.paymentUpdated ? <SuccessBanner>Đã cập nhật cột mốc thanh toán.</SuccessBanner> : null}
      {query.reminderCreated ? <SuccessBanner>Đã tạo nhắc việc.</SuccessBanner> : null}
      {query.reminderUpdated ? <SuccessBanner>Đã cập nhật trạng thái nhắc việc.</SuccessBanner> : null}
      {query.planError ? <ErrorBanner>Không thể tạo bản xem trước kế hoạch.</ErrorBanner> : null}
      {query.activationError ? <ErrorBanner>Kích hoạt thất bại. Hãy lưu kế hoạch hợp lệ có tổng phân bổ thanh toán bằng 100% rồi thử lại.</ErrorBanner> : null}
      <PageHeader
        eyebrow={project.serviceType || "Dự án khách hàng"}
        title={project.name}
        description={`Dành cho ${project.client.companyName}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/clients/${project.clientId}`}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              Xem khách hàng
            </Link>
            {canEditProject ? (
              <Link
                href={`/projects/${project.id}/edit`}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                <Pencil className="size-4" /> Chỉnh sửa dự án
              </Link>
            ) : null}
          </div>
        }
      />

      <Card className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Trạng thái</p>
          <div className="mt-2"><StatusBadge status={project.status} /></div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Giá trị dự án</p>
          <p className="mt-2 text-lg font-extrabold text-slate-900">
            {formatCurrency(project.totalValue, project.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Thời gian</p>
          <p className="mt-2 text-sm font-bold text-slate-800">
            {formatDate(project.startDate)} – {formatDate(project.endDate)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tiến độ</p>
          <div className="mt-3"><ProgressBar value={project.progress} /></div>
        </div>
      </Card>

      <div className="overflow-x-auto border-b border-slate-200">
        <nav className="flex min-w-max gap-1" aria-label="Các phần của dự án">
          {tabs.map((tab) => (
            <Link
              key={tab}
              href={`/projects/${project.id}${tab === "overview" ? "" : `?tab=${tab}`}`}
              className={cn(
                "border-b-2 px-4 py-3 text-sm font-semibold capitalize transition",
                activeTab === tab
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
              )}
            >
              {tabLabels[tab]}
            </Link>
          ))}
        </nav>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <Card className="p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">Tổng quan dự án</h2>
            <p className="mt-0.5 text-xs text-slate-500">Thông tin thương mại và bàn giao cốt lõi</p>
            <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {[
                { icon: FolderKanban, label: "Khách hàng", value: project.client.companyName },
                { icon: Goal, label: "Loại dịch vụ", value: project.serviceType || "Chưa thiết lập" },
                { icon: CalendarDays, label: "Ngày bắt đầu", value: formatDate(project.startDate) },
                { icon: CalendarDays, label: "Ngày kết thúc", value: formatDate(project.endDate) },
                { icon: UserRound, label: "Người phụ trách", value: project.ownerName || "Chưa phân công" },
                { icon: Goal, label: "KPI", value: project.kpi || "Chưa thiết lập" },
                ...(project.durationMonths
                  ? [
                      {
                        icon: CalendarDays,
                        label: "Thời lượng",
                        value: `${project.durationMonths} tháng`,
                      },
                    ]
                  : []),
                ...(project.monthlyFee
                  ? [
                      {
                        icon: Banknote,
                        label: "Phí hàng tháng",
                        value: formatCurrency(project.monthlyFee, project.currency),
                      },
                    ]
                  : []),
              ].map((item) => (
                <div key={item.label} className="flex gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <item.icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-800">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-7 border-t border-slate-100 pt-6">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Mô tả</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {project.description || "Chưa có mô tả dự án."}
              </p>
            </div>
            {project.createdWithAi && project.sourceRequest ? (
              <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-700">
                  <Sparkles className="size-3.5" /> Yêu cầu nguồn AI
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {project.sourceRequest}
                </p>
                <p className="mt-2 text-[11px] font-medium text-slate-400">
                  {project.aiProvider} · {project.aiModel}
                </p>
              </div>
            ) : null}
          </Card>
          <Card className="h-fit p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">Hoạt động gần đây</h2>
            <p className="mt-0.5 text-xs text-slate-500">Các thay đổi mới nhất của dự án</p>
            <div className="mt-5"><ActivityList activities={project.activities.slice(0, 6)} /></div>
            <Link
              href={`/projects/${project.id}?tab=activity`}
              className="mt-5 inline-flex text-sm font-bold text-indigo-600"
            >
              Xem toàn bộ hoạt động
            </Link>
          </Card>
        </div>
      ) : null}

      {activeTab === "activity" ? (
        <Card className="p-5 sm:p-6">
          <h2 className="font-bold text-slate-900">Hoạt động dự án</h2>
          <p className="mt-0.5 text-xs text-slate-500">Lịch sử kiểm tra đầy đủ của dự án</p>
          <div className="mt-6 max-w-3xl"><ActivityList activities={project.activities} /></div>
        </Card>
      ) : null}

      {activeTab === "documents" ? (
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FileStack className="size-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Tài liệu dự án</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Bản nháp có cấu trúc, trạng thái duyệt, phê duyệt, phiên bản và tệp xuất của dự án.
                  </p>
                </div>
              </div>
              <Link href={`/documents/new?projectId=${project.id}`} className={buttonVariants({ size: "sm" })}>
                <FilePlus2 className="size-4" /> Tài liệu mới
              </Link>
            </div>
            {project.documents.length ? (
              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                    <tr><th className="px-4 py-3">Tài liệu</th><th className="px-4 py-3">Loại</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Phiên bản</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.documents.map((document) => (
                      <tr key={document.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3"><Link href={`/documents/${document.id}`} className="font-bold text-slate-800 hover:text-indigo-600">{document.title}</Link><p className="mt-0.5 text-xs text-slate-400">{document.referenceNumber}</p></td>
                        <td className="px-4 py-3 text-slate-600">{documentTypeLabel(document.type)}</td>
                        <td className="px-4 py-3"><StatusBadge status={document.status} /></td>
                        <td className="px-4 py-3 font-semibold text-slate-600">v{document.currentVersion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-6 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Chưa có bản nháp tài liệu nào cho dự án này.</p>
            )}
          </Card>

          {suggestedDocuments.length ? (
            <Card className="p-5 sm:p-6">
              <h2 className="font-bold text-slate-900">Đề xuất từ Không gian AI</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Chọn một đề xuất để tạo bản nháp có thể chỉnh sửa. Hệ thống không tự động tạo hoặc phê duyệt tài liệu.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {suggestedDocuments.map((document) => {
                  const type = inferDocumentType(document);
                  return (
                    <div key={document} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex items-center gap-3">
                        <FileStack className="size-4 shrink-0 text-indigo-600" />
                        <span className="text-sm font-semibold text-slate-700">{document}</span>
                      </div>
                      <Link href={`/documents/new?projectId=${project.id}&type=${type}`} className="mt-4 inline-flex text-xs font-bold text-indigo-600 hover:text-indigo-700">
                        Tạo bản nháp {documentTypeLabel(type)}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeTab === "plan" ? <PlanTab projectId={project.id} plan={project.plan} /> : null}

      {activeTab === "tasks" ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3"><CheckSquare2 className="size-5 text-indigo-600" /><div><h2 className="font-bold text-slate-900">Công việc dự án</h2><p className="text-sm text-slate-500">Thay đổi trạng thái sẽ tự động tính lại tiến độ dự án.</p></div></div>
          <TasksTable tasks={project.tasks} />
        </div>
      ) : null}

      {activeTab === "payments" ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3"><Banknote className="size-5 text-emerald-600" /><div><h2 className="font-bold text-slate-900">Lịch thanh toán</h2><p className="text-sm text-slate-500">Theo dõi giá trị đã lên lịch, xuất hóa đơn, thanh toán và quá hạn.</p></div></div>
          <PaymentsTable payments={project.payments} />
        </div>
      ) : null}

      {activeTab === "reminders" ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3"><BellRing className="size-5 text-amber-600" /><div><h2 className="font-bold text-slate-900">Nhắc việc dự án</h2><p className="text-sm text-slate-500">Nhắc công việc, thanh toán tự động và theo dõi thủ công.</p></div></div>
          <RemindersPanel projectId={project.id} reminders={project.reminders} />
        </div>
      ) : null}
    </div>
  );
}
