"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createProjectAction, updateProjectAction } from "@/app/actions";
import { buttonVariants } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { FormSubmit } from "@/components/ui/form-submit";
import { initialActionState } from "@/lib/action-state";

type ProjectStatus =
  | "draft"
  | "planning"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type ProjectFormValues = {
  id?: string;
  clientId?: string;
  name?: string;
  description?: string | null;
  serviceType?: string | null;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  totalValue?: string | number;
  currency?: string;
  ownerName?: string | null;
  progress?: number;
  kpi?: string | null;
};

export function ProjectForm({
  clients,
  selectedClientId,
  mode = "create",
  values = {},
  progressLocked = false,
}: {
  clients: { id: string; companyName: string }[];
  selectedClientId?: string;
  mode?: "create" | "edit";
  values?: ProjectFormValues;
  progressLocked?: boolean;
}) {
  const serverAction = mode === "create" ? createProjectAction : updateProjectAction;
  const [state, formAction] = useActionState(
    serverAction,
    initialActionState,
  );
  const clientId = values.clientId ?? selectedClientId ?? "";

  return (
    <form action={formAction} noValidate className="space-y-8">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state.status === "error" ? <ErrorBanner>{state.message}</ErrorBanner> : null}

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Tóm tắt dự án</h2>
          <p className="mt-1 text-sm text-slate-500">
            Liên kết công việc với khách hàng và ghi nhận thông tin thương mại tổng quan.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Khách hàng"
            name="clientId"
            required
            error={state.fieldErrors.clientId}
          >
            {mode === "edit" ? (
              <input type="hidden" name="clientId" value={clientId} />
            ) : null}
            <Select
              id="clientId"
              name="clientId"
              defaultValue={clientId}
              disabled={mode === "edit"}
              required
            >
              <option value="" disabled>
                Chọn khách hàng
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Tên dự án"
            name="name"
            required
            error={state.fieldErrors.name}
          >
            <Input
              id="name"
              name="name"
              defaultValue={values.name ?? ""}
              placeholder="Ví dụ: Chiến dịch tăng trưởng TikTok"
              required
            />
          </Field>
          <Field
            label="Loại dịch vụ"
            name="serviceType"
            error={state.fieldErrors.serviceType}
          >
            <Input
              id="serviceType"
              name="serviceType"
              defaultValue={values.serviceType ?? ""}
              placeholder="Ví dụ: Quảng cáo TikTok"
            />
          </Field>
          <Field label="Trạng thái" name="status" error={state.fieldErrors.status}>
            <Select id="status" name="status" defaultValue={values.status ?? "planning"}>
              <option value="draft">Bản nháp</option>
              <option value="planning">Đang lập kế hoạch</option>
              <option value="active">Đang hoạt động</option>
              <option value="paused">Tạm dừng</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </Select>
          </Field>
          <Field
            label="Mô tả"
            name="description"
            error={state.fieldErrors.description}
            className="md:col-span-2"
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={values.description ?? ""}
              placeholder="Phạm vi, kết quả mong đợi và các thông tin quan trọng…"
            />
          </Field>
        </div>
      </section>

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Lịch trình và phụ trách</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Ngày bắt đầu" name="startDate" error={state.fieldErrors.startDate}>
            <Input id="startDate" name="startDate" type="date" defaultValue={values.startDate ?? ""} />
          </Field>
          <Field label="Ngày kết thúc" name="endDate" error={state.fieldErrors.endDate}>
            <Input id="endDate" name="endDate" type="date" defaultValue={values.endDate ?? ""} />
          </Field>
          <Field label="Người phụ trách" name="ownerName" error={state.fieldErrors.ownerName}>
            <Input id="ownerName" name="ownerName" defaultValue={values.ownerName ?? ""} placeholder="Người phụ trách dự án" />
          </Field>
        </div>
      </section>

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Thương mại và kết quả</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Field
            label="Giá trị dự án"
            name="totalValue"
            error={state.fieldErrors.totalValue}
          >
            <Input
              id="totalValue"
              name="totalValue"
              type="number"
              min="0"
              step="1"
              defaultValue={values.totalValue ?? "0"}
            />
          </Field>
          <Field label="Tiền tệ" name="currency" error={state.fieldErrors.currency}>
            <Select id="currency" name="currency" defaultValue={values.currency ?? "VND"}>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </Field>
          <Field
            label="Tiến độ"
            name="progress"
            error={state.fieldErrors.progress}
            hint={
              progressLocked
                ? "Tiến độ được tự động tính từ trạng thái công việc"
                : "Nhập số nguyên từ 0 đến 100"
            }
          >
            {progressLocked ? (
              <input type="hidden" name="progress" value={values.progress ?? 0} />
            ) : null}
            <Input
              id="progress"
              name="progress"
              type="number"
              min="0"
              max="100"
              defaultValue={values.progress ?? 0}
              disabled={progressLocked}
            />
          </Field>
          <Field
            label="KPI / chỉ số thành công"
            name="kpi"
            error={state.fieldErrors.kpi}
            className="md:col-span-3"
          >
            <Input
              id="kpi"
              name="kpi"
              defaultValue={values.kpi ?? ""}
              placeholder="Ví dụ: 3.000 khách hàng tiềm năng đạt chuẩn"
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
        <Link
          href={values.id ? `/projects/${values.id}` : "/projects"}
          className={buttonVariants({ variant: "secondary" })}
        >
          Hủy
        </Link>
        <FormSubmit label={mode === "create" ? "Tạo dự án" : "Lưu thay đổi"} />
      </div>
    </form>
  );
}
