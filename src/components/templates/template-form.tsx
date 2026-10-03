"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createTemplateAction,
  createTemplateVersionAction,
} from "@/app/templates/actions";
import { buttonVariants } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { FormSubmit } from "@/components/ui/form-submit";
import { initialActionState } from "@/lib/action-state";
import type { DocumentTypeValue, TemplateContent } from "@/services/documents/schemas";

type TemplateFormValue = {
  id?: string;
  name: string;
  description: string;
  type: DocumentTypeValue;
  version?: number;
  content: TemplateContent;
};

function section(content: TemplateContent, key: string) {
  return content.sections.find((item) => item.key === key) ?? { key, heading: key, body: "" };
}

export function TemplateForm({ value, mode }: { value: TemplateFormValue; mode: "create" | "version" }) {
  const action = mode === "create" ? createTemplateAction : createTemplateVersionAction;
  const [state, formAction] = useActionState(action, initialActionState);
  const fields = [
    ["summary", "Tổng quan"],
    ["scope", "Phạm vi"],
    ["timeline", "Thời gian"],
    ["kpi", "Chỉ số thành công"],
    ["legal", "Điều khoản"],
  ] as const;

  return (
    <form action={formAction} noValidate className="space-y-8">
      {value.id ? <input type="hidden" name="id" value={value.id} /> : null}
      {state.status === "error" ? <ErrorBanner>{state.message}</ErrorBanner> : null}

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Thông tin mẫu tài liệu</h2>
          <p className="mt-1 text-sm text-slate-500">
            Khi lưu mẫu hiện có, hệ thống sẽ tạo một phiên bản mới không thể chỉnh sửa lịch sử.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Tên mẫu" name="name" required error={state.fieldErrors.name}>
            <Input id="name" name="name" defaultValue={value.name} required />
          </Field>
          <Field label="Loại tài liệu" name="type" required error={state.fieldErrors.type}>
            <Select id="type" name="type" defaultValue={value.type}>
              <option value="proposal">Đề xuất</option>
              <option value="quotation">Báo giá</option>
              <option value="contract">Hợp đồng</option>
              <option value="other">Khác</option>
            </Select>
          </Field>
          <Field label="Mô tả" name="description" error={state.fieldErrors.description} className="md:col-span-2">
            <Textarea id="description" name="description" defaultValue={value.description} className="min-h-20" />
          </Field>
          <Field
            label="Mẫu tiêu đề tài liệu"
            name="titlePattern"
            required
            error={state.fieldErrors.titlePattern}
            hint="Sử dụng các biến như {{project.name}} hoặc {{client.companyName}}"
            className="md:col-span-2"
          >
            <Input id="titlePattern" name="titlePattern" defaultValue={value.content.titlePattern} required />
          </Field>
        </div>
      </section>

      <section className="space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Các phần có cấu trúc</h2>
          <p className="mt-1 text-sm text-slate-500">
            Các biến được hỗ trợ gồm công ty, khách hàng, dự án, ngày tháng, KPI, phí và tổng giá trị.
          </p>
        </div>
        {fields.map(([key, label], index) => {
          const current = section(value.content, key);
          const headingName = `${key}Heading`;
          const bodyName = `${key}Body`;
          return (
            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
                {index + 1}. {label}
              </p>
              <div className="grid gap-4">
                <Field label="Tiêu đề phần" name={headingName} required error={state.fieldErrors[headingName]}>
                  <Input id={headingName} name={headingName} defaultValue={current.heading} required />
                </Field>
                <Field label="Nội dung phần" name={bodyName} required error={state.fieldErrors[bodyName]}>
                  <Textarea id={bodyName} name={bodyName} defaultValue={current.body} className="min-h-32" required />
                </Field>
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Thiết lập thương mại mặc định</h2>
        </div>
        <div className="grid gap-5">
          <Field label="Điều khoản thanh toán" name="paymentTerms" error={state.fieldErrors.paymentTerms}>
            <Textarea id="paymentTerms" name="paymentTerms" defaultValue={value.content.paymentTerms} />
          </Field>
          <Field label="Ghi chú" name="notes" error={state.fieldErrors.notes}>
            <Textarea id="notes" name="notes" defaultValue={value.content.notes} />
          </Field>
          {mode === "version" ? (
            <Field label="Ghi chú phiên bản" name="changeNote" error={state.fieldErrors.changeNote}>
              <Input id="changeNote" name="changeNote" placeholder="Phiên bản này đã thay đổi những gì?" />
            </Field>
          ) : (
            <input type="hidden" name="changeNote" value="" />
          )}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
        <Link href="/templates" className={buttonVariants({ variant: "secondary" })}>Hủy</Link>
        <FormSubmit label={mode === "create" ? "Tạo mẫu" : `Tạo phiên bản ${(value.version ?? 0) + 1}`} />
      </div>
    </form>
  );
}
