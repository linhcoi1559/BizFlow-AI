import type {
  PaymentMilestone,
  Plan,
  PlanItem,
  Reminder,
  Task,
} from "@prisma/client";
import {
  BellRing,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  ListChecks,
  Rocket,
} from "lucide-react";
import Link from "next/link";

import {
  activatePlanAction,
  createPlanPreviewAction,
  createReminderAction,
  updatePaymentStatusAction,
  updateReminderStatusAction,
  updateTaskStatusAction,
} from "@/app/execution/actions";
import { PlanEditor } from "@/components/execution/plan-editor";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-fields";
import { StatusBadge } from "@/components/ui/status-badge";
import { dateInputValue, formatCurrency, formatDate, titleCase } from "@/lib/utils";
import {
  paymentStatuses,
  reminderStatuses,
  reminderTypes,
  taskStatuses,
} from "@/services/execution/schemas";

type PlanWithItems = Plan & {
  items: PlanItem[];
  sourceDocument: { id: string; title: string; referenceNumber: string } | null;
};

type TaskRow = Task & { project?: { name: string }; client?: { companyName: string } };
type PaymentRow = PaymentMilestone & { project?: { name: string }; client?: { companyName: string } };
type ReminderRow = Reminder & { project?: { name: string }; client?: { companyName: string } };

export function PlanTab({ projectId, plan }: { projectId: string; plan: PlanWithItems | null }) {
  if (!plan) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Tạo kế hoạch bàn giao có thể chỉnh sửa"
        description="BizFlow soạn các cột mốc từ tài liệu đã duyệt mới nhất hoặc từ nội dung dự án hiện tại. Hệ thống chưa tạo dữ liệu vận hành cho đến khi bạn kích hoạt."
        action={
          <form action={createPlanPreviewAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <button className={buttonVariants()}><Rocket className="size-4" /> Tạo bản xem trước kế hoạch</button>
          </form>
        }
      />
    );
  }

  if (plan.status === "draft") {
    return (
      <div className="space-y-6">
        <Card className="p-5 sm:p-7">
          <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><StatusBadge status={plan.status} /><span className="text-xs font-semibold text-slate-400">Bản xem trước có thể chỉnh sửa</span></div>
              <p className="mt-2 text-sm text-slate-500">
                {plan.sourceDocument ? <>Nguồn: <Link href={`/documents/${plan.sourceDocument.id}`} className="font-bold text-indigo-600">{plan.sourceDocument.referenceNumber} · {plan.sourceDocument.title}</Link></> : "Nguồn: nội dung dự án hiện tại"}
              </p>
            </div>
          </div>
          <PlanEditor
            plan={{
              id: plan.id,
              title: plan.title,
              notes: plan.notes || "",
              items: plan.items.map((item) => ({
                title: item.title,
                description: item.description || "",
                ownerName: item.ownerName || "",
                startDate: dateInputValue(item.startDate),
                dueDate: dateInputValue(item.dueDate),
                priority: item.priority,
                paymentPercent: Number(item.paymentPercent),
              })),
            }}
          />
        </Card>
        <Card className="border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Sẵn sàng bắt đầu triển khai?</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Kích hoạt sẽ tạo {plan.items.length} công việc, các cột mốc thanh toán đủ 100% và nhắc hạn trong một giao dịch. Sau đó kế hoạch sẽ không thể chỉnh sửa.</p>
            </div>
            <form action={activatePlanAction}>
              <input type="hidden" name="id" value={plan.id} />
              <button className={buttonVariants()}><Rocket className="size-4" /> Kích hoạt kế hoạch</button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div><h2 className="font-bold text-slate-900">{plan.title}</h2><p className="mt-1 text-sm text-slate-500">Đã kích hoạt {formatDate(plan.activatedAt)}</p></div>
        <StatusBadge status={plan.status} />
      </div>
      <div className="mt-6 space-y-3">
        {plan.items.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[48px_minmax(0,1fr)_150px_120px] md:items-center">
            <div className="flex size-9 items-center justify-center rounded-full bg-indigo-50 text-sm font-extrabold text-indigo-600">{item.position}</div>
            <div><p className="font-bold text-slate-800">{item.title}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p></div>
            <div className="text-sm text-slate-500">Hạn {formatDate(item.dueDate)}</div>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function TasksTable({ tasks, showContext = false }: { tasks: TaskRow[]; showContext?: boolean }) {
  if (!tasks.length) return <EmptyState icon={ListChecks} title="Chưa có công việc" description="Kích hoạt kế hoạch dự án để tạo các công việc được phân công và lên lịch." />;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Công việc</th>{showContext ? <th className="px-4 py-3">Dự án</th> : null}<th className="px-4 py-3">Phụ trách</th><th className="px-4 py-3">Ưu tiên</th><th className="px-4 py-3">Hạn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Cập nhật</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const overdue = task.dueDate && task.dueDate < new Date() && !["completed", "cancelled"].includes(task.status);
              return <tr key={task.id} className="align-top hover:bg-slate-50/60">
                <td className="px-5 py-4"><p className="font-bold text-slate-800">{task.title}</p><p className="mt-1 max-w-md line-clamp-2 text-xs leading-5 text-slate-500">{task.description || "Chưa có mô tả công việc"}</p></td>
                {showContext ? <td className="px-4 py-4"><Link href={`/projects/${task.projectId}?tab=tasks`} className="font-semibold text-indigo-600">{task.project?.name}</Link><p className="mt-1 text-xs text-slate-400">{task.client?.companyName}</p></td> : null}
                <td className="px-4 py-4 text-slate-600">{task.ownerName || "Chưa phân công"}</td>
                <td className="px-4 py-4 font-semibold text-slate-600">{titleCase(task.priority)}</td>
                <td className={`px-4 py-4 font-medium ${overdue ? "text-rose-600" : "text-slate-600"}`}>{formatDate(task.dueDate)}{overdue ? <span className="block text-xs font-bold">Quá hạn</span> : null}</td>
                <td className="px-4 py-4"><StatusBadge status={task.status} /></td>
                <td className="px-4 py-3"><form action={updateTaskStatusAction} className="flex gap-2"><input type="hidden" name="id" value={task.id} /><Select name="status" defaultValue={task.status} className="mt-0 min-w-32 py-2">{taskStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</Select><button className={buttonVariants({ variant: "secondary", size: "sm" })}>Lưu</button></form></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function PaymentsTable({ payments, showContext = false }: { payments: PaymentRow[]; showContext?: boolean }) {
  if (!payments.length) return <EmptyState icon={CircleDollarSign} title="Chưa có cột mốc thanh toán" description="Kích hoạt kế hoạch có phân bổ thanh toán đủ 100% để tạo lịch." />;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Cột mốc</th>{showContext ? <th className="px-4 py-3">Dự án</th> : null}<th className="px-4 py-3">Số tiền</th><th className="px-4 py-3">Hạn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Hóa đơn / cập nhật</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((payment) => {
              const displayStatus = payment.dueDate && payment.dueDate < new Date() && ["scheduled", "invoiced"].includes(payment.status) ? "overdue" : payment.status;
              return <tr key={payment.id} className="align-top hover:bg-slate-50/60">
                <td className="px-5 py-4"><p className="font-bold text-slate-800">{payment.title}</p><p className="mt-1 text-xs text-slate-400">{payment.referenceNumber}</p></td>
                {showContext ? <td className="px-4 py-4"><Link href={`/projects/${payment.projectId}?tab=payments`} className="font-semibold text-indigo-600">{payment.project?.name}</Link><p className="mt-1 text-xs text-slate-400">{payment.client?.companyName}</p></td> : null}
                <td className="px-4 py-4 font-extrabold text-slate-800">{formatCurrency(payment.amount, payment.currency)}</td>
                <td className="px-4 py-4 text-slate-600">{formatDate(payment.dueDate)}</td>
                <td className="px-4 py-4"><StatusBadge status={displayStatus} /></td>
                <td className="px-4 py-3"><form action={updatePaymentStatusAction} className="grid min-w-[310px] grid-cols-[1fr_130px_auto] gap-2"><input type="hidden" name="id" value={payment.id} /><Input name="invoiceNumber" defaultValue={payment.invoiceNumber || ""} placeholder="Số hóa đơn" className="mt-0 py-2" /><Select name="status" defaultValue={payment.status} className="mt-0 py-2">{paymentStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</Select><button className={buttonVariants({ variant: "secondary", size: "sm" })}>Lưu</button></form></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function RemindersPanel({ projectId, reminders, showContext = false }: { projectId?: string; reminders: ReminderRow[]; showContext?: boolean }) {
  return (
    <div className="space-y-6">
      {projectId ? <Card className="p-5 sm:p-6">
        <div className="mb-5"><h2 className="font-bold text-slate-900">Thêm nhắc việc</h2><p className="mt-1 text-sm text-slate-500">Tạo nhắc việc trong ứng dụng liên kết với dự án này.</p></div>
        <form action={createReminderAction} className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_160px_180px_auto] md:items-end">
          <input type="hidden" name="projectId" value={projectId} />
          <Field label="Nội dung nhắc" name="title" required><Input id="title" name="title" placeholder="Theo dõi phản hồi từ khách hàng" required /></Field>
          <Field label="Loại" name="type"><Select id="type" name="type" defaultValue="general">{reminderTypes.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</Select></Field>
          <Field label="Ngày đến hạn" name="dueDate" required><Input id="dueDate" name="dueDate" type="date" required /></Field>
          <button className={buttonVariants()}><BellRing className="size-4" /> Thêm</button>
        </form>
      </Card> : null}
      {!reminders.length ? <EmptyState icon={BellRing} title="Không tìm thấy nhắc việc" description="Nhắc việc cho công việc, thanh toán và nhắc thủ công sẽ xuất hiện tại đây." /> : <Card className="divide-y divide-slate-100 overflow-hidden">
        {reminders.map((reminder) => {
          const overdue = reminder.status === "pending" && reminder.dueAt < new Date();
          return <div key={reminder.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_150px_130px_230px] md:items-center">
            <div className="flex gap-3"><div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${overdue ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}><CalendarClock className="size-4" /></div><div><p className="font-bold text-slate-800">{reminder.title}</p>{showContext ? <Link href={`/projects/${reminder.projectId}?tab=reminders`} className="mt-1 block text-xs font-semibold text-indigo-600">{reminder.project?.name} · {reminder.client?.companyName}</Link> : <p className="mt-1 text-xs text-slate-400">{titleCase(reminder.type)}</p>}</div></div>
            <div className={`text-sm font-semibold ${overdue ? "text-rose-600" : "text-slate-600"}`}>{formatDate(reminder.dueAt)}{overdue ? <span className="block text-xs">Quá hạn</span> : null}</div>
            <StatusBadge status={reminder.status} />
            <form action={updateReminderStatusAction} className="flex gap-2"><input type="hidden" name="id" value={reminder.id} /><Select name="status" defaultValue={reminder.status} className="mt-0">{reminderStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</Select><button className={buttonVariants({ variant: "secondary", size: "sm" })}>Lưu</button></form>
          </div>;
        })}
      </Card>}
    </div>
  );
}

export function ExecutionSummary({ taskCount, paymentCount, reminderCount }: { taskCount: number; paymentCount: number; reminderCount: number }) {
  return <div className="grid gap-4 sm:grid-cols-3"><Card className="p-4"><ListChecks className="size-5 text-indigo-600" /><p className="mt-3 text-2xl font-extrabold">{taskCount}</p><p className="text-xs text-slate-500">Công việc triển khai</p></Card><Card className="p-4"><CircleDollarSign className="size-5 text-emerald-600" /><p className="mt-3 text-2xl font-extrabold">{paymentCount}</p><p className="text-xs text-slate-500">Cột mốc thanh toán</p></Card><Card className="p-4"><FileCheck2 className="size-5 text-amber-600" /><p className="mt-3 text-2xl font-extrabold">{reminderCount}</p><p className="text-xs text-slate-500">Nhắc việc đang mở</p></Card></div>;
}
