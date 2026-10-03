"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createClientAction,
  updateClientAction,
} from "@/app/actions";
import { buttonVariants } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { FormSubmit } from "@/components/ui/form-submit";
import { initialActionState } from "@/lib/action-state";

export type ClientFormValues = {
  id?: string;
  companyName?: string;
  taxCode?: string | null;
  address?: string | null;
  representativeName?: string | null;
  representativeTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
  status?: "active" | "inactive" | "archived";
};

export function ClientForm({
  mode,
  values = {},
}: {
  mode: "create" | "edit";
  values?: ClientFormValues;
}) {
  const serverAction = mode === "create" ? createClientAction : updateClientAction;
  const [state, formAction] = useActionState(serverAction, initialActionState);

  return (
    <form action={formAction} noValidate className="space-y-8">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state.status === "error" ? <ErrorBanner>{state.message}</ErrorBanner> : null}

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Thông tin công ty</h2>
          <p className="mt-1 text-sm text-slate-500">
            Thông tin doanh nghiệp cốt lõi được sử dụng trong các dự án và tài liệu.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Tên công ty"
            name="companyName"
            required
            error={state.fieldErrors.companyName}
            className="md:col-span-2"
          >
            <Input
              id="companyName"
              name="companyName"
              defaultValue={values.companyName ?? ""}
              placeholder="Ví dụ: Công ty Cổ phần Nova Beauty"
              autoComplete="organization"
              required
            />
          </Field>
          <Field label="Mã số thuế" name="taxCode" error={state.fieldErrors.taxCode}>
            <Input
              id="taxCode"
              name="taxCode"
              defaultValue={values.taxCode ?? ""}
              placeholder="0101234567"
            />
          </Field>
          <Field label="Trạng thái" name="status" error={state.fieldErrors.status}>
            <Select id="status" name="status" defaultValue={values.status ?? "active"}>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Không hoạt động</option>
              <option value="archived">Đã lưu trữ</option>
            </Select>
          </Field>
          <Field
            label="Địa chỉ"
            name="address"
            error={state.fieldErrors.address}
            className="md:col-span-2"
          >
            <Input
              id="address"
              name="address"
              defaultValue={values.address ?? ""}
              placeholder="Quận/huyện, tỉnh/thành phố, quốc gia"
              autoComplete="street-address"
            />
          </Field>
          <Field label="Website" name="website" error={state.fieldErrors.website}>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={values.website ?? ""}
              placeholder="https://example.com"
              autoComplete="url"
            />
          </Field>
        </div>
      </section>

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Người liên hệ chính</h2>
          <p className="mt-1 text-sm text-slate-500">
            Người đại diện chính mà đội ngũ của bạn làm việc cùng.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Tên người đại diện"
            name="representativeName"
            error={state.fieldErrors.representativeName}
          >
            <Input
              id="representativeName"
              name="representativeName"
              defaultValue={values.representativeName ?? ""}
              placeholder="Họ và tên"
              autoComplete="name"
            />
          </Field>
          <Field
            label="Chức vụ"
            name="representativeTitle"
            error={state.fieldErrors.representativeTitle}
          >
            <Input
              id="representativeTitle"
              name="representativeTitle"
              defaultValue={values.representativeTitle ?? ""}
              placeholder="Ví dụ: Giám đốc Marketing"
              autoComplete="organization-title"
            />
          </Field>
          <Field label="Email" name="email" error={state.fieldErrors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={values.email ?? ""}
              placeholder="name@company.com"
              autoComplete="email"
            />
          </Field>
          <Field label="Số điện thoại" name="phone" error={state.fieldErrors.phone}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={values.phone ?? ""}
              placeholder="+84 912 345 678"
              autoComplete="tel"
            />
          </Field>
        </div>
      </section>

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Ghi chú nội bộ</h2>
        </div>
        <Field label="Ghi chú" name="notes" error={state.fieldErrors.notes}>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={values.notes ?? ""}
            placeholder="Thêm bối cảnh, tùy chọn hoặc ghi chú khách hàng cho nhóm…"
          />
        </Field>
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
        <Link
          href={values.id ? `/clients/${values.id}` : "/clients"}
          className={buttonVariants({ variant: "secondary" })}
        >
          Hủy
        </Link>
        <FormSubmit label={mode === "create" ? "Tạo khách hàng" : "Lưu thay đổi"} />
      </div>
    </form>
  );
}
