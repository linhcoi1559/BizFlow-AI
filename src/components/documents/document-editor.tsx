"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { updateDocumentAction } from "@/app/documents/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { FormSubmit } from "@/components/ui/form-submit";
import { initialActionState } from "@/lib/action-state";
import type { DocumentContent } from "@/services/documents/schemas";

type EditableLineItem = DocumentContent["lineItems"][number] & { localId: string };

export function DocumentEditor({
  documentId,
  projectId,
  currentVersion,
  content,
}: {
  documentId: string;
  projectId: string;
  currentVersion: number;
  content: DocumentContent;
}) {
  const [state, formAction] = useActionState(updateDocumentAction, initialActionState);
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(
    content.lineItems.map((item, index) => ({ ...item, localId: `${index}-${item.description}` })),
  );

  function updateLineItem(index: number, field: keyof Omit<EditableLineItem, "localId">, value: string) {
    setLineItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return {
        ...item,
        [field]: field === "quantity" || field === "unitPrice" ? Number(value) : value,
      };
    }));
  }

  return (
    <form action={formAction} noValidate className="space-y-8">
      <input type="hidden" name="id" value={documentId} />
      <input type="hidden" name="expectedVersion" value={currentVersion} />
      <input type="hidden" name="sectionCount" value={content.sections.length} />
      <input type="hidden" name="lineItemCount" value={lineItems.length} />
      {state.status === "error" ? <ErrorBanner>{state.message}</ErrorBanner> : null}

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Thông tin tài liệu</h2>
          <p className="mt-1 text-sm text-slate-500">Chỉnh sửa nội dung kinh doanh đã rà soát trước khi gửi phê duyệt.</p>
        </div>
        <Field label="Tiêu đề tài liệu" name="title" required error={state.fieldErrors.title}>
          <Input id="title" name="title" defaultValue={content.title} required />
        </Field>
      </section>

      <section className="space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Nội dung có cấu trúc</h2>
        </div>
        {content.sections.map((section, index) => (
          <div key={section.key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
            <input type="hidden" name={`sectionKey_${index}`} value={section.key} />
            <div className="grid gap-4">
              <Field label={`Tiêu đề phần ${index + 1}`} name={`sectionHeading_${index}`} required>
                <Input id={`sectionHeading_${index}`} name={`sectionHeading_${index}`} defaultValue={section.heading} required />
              </Field>
              <Field label="Nội dung" name={`sectionBody_${index}`} required>
                <Textarea id={`sectionBody_${index}`} name={`sectionBody_${index}`} defaultValue={section.body} className="min-h-36" required />
              </Field>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-bold text-slate-900">Thông tin tài chính</h2>
            <p className="mt-1 text-sm text-slate-500">Các hạng mục luôn được lưu có cấu trúc trong mọi phiên bản và tệp xuất.</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLineItems((current) => [
              ...current,
              { localId: crypto.randomUUID(), description: "Dịch vụ mới", quantity: 1, unit: "hạng mục", unitPrice: 0 },
            ])}
          >
            <Plus className="size-4" /> Thêm hạng mục
          </Button>
        </div>
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={item.localId} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[minmax(220px,1fr)_100px_120px_180px_auto] md:items-end">
              <Field label="Mô tả" name={`lineItemDescription_${index}`}>
                <Input name={`lineItemDescription_${index}`} value={item.description} onChange={(event) => updateLineItem(index, "description", event.target.value)} />
              </Field>
              <Field label="Số lượng" name={`lineItemQuantity_${index}`}>
                <Input name={`lineItemQuantity_${index}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateLineItem(index, "quantity", event.target.value)} />
              </Field>
              <Field label="Đơn vị" name={`lineItemUnit_${index}`}>
                <Input name={`lineItemUnit_${index}`} value={item.unit} onChange={(event) => updateLineItem(index, "unit", event.target.value)} />
              </Field>
              <Field label="Đơn giá" name={`lineItemUnitPrice_${index}`}>
                <Input name={`lineItemUnitPrice_${index}`} type="number" min="0" step="1" value={item.unitPrice} onChange={(event) => updateLineItem(index, "unitPrice", event.target.value)} />
              </Field>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Xóa ${item.description}`}
                disabled={lineItems.length === 1}
                onClick={() => setLineItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Tổng giá trị" name="totalValue" error={state.fieldErrors.totalValue}>
            <Input id="totalValue" name="totalValue" type="number" min="0" step="1" defaultValue={content.totalValue} />
          </Field>
          <Field label="Tiền tệ" name="currency" error={state.fieldErrors.currency}>
            <Select id="currency" name="currency" defaultValue={content.currency}>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </Field>
        </div>
        <Field label="Điều khoản thanh toán" name="paymentTerms" error={state.fieldErrors.paymentTerms}>
          <Textarea id="paymentTerms" name="paymentTerms" defaultValue={content.paymentTerms} />
        </Field>
        <Field label="Ghi chú" name="notes" error={state.fieldErrors.notes}>
          <Textarea id="notes" name="notes" defaultValue={content.notes} />
        </Field>
      </section>

      <section>
        <Field label="Ghi chú phiên bản" name="changeNote" error={state.fieldErrors.changeNote} hint="Mô tả ngắn gọn những thay đổi trong phiên bản đã lưu.">
          <Input id="changeNote" name="changeNote" placeholder={`Thay đổi trong phiên bản ${currentVersion + 1}`} />
        </Field>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
        <Link href={`/projects/${projectId}?tab=documents`} className={buttonVariants({ variant: "secondary" })}>Quay lại dự án</Link>
        <FormSubmit label={`Lưu thành phiên bản ${currentVersion + 1}`} pendingLabel="Đang lưu phiên bản…" />
      </div>
    </form>
  );
}
