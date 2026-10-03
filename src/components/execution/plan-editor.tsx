"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { updatePlanDraftAction } from "@/app/execution/actions";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { FormSubmit } from "@/components/ui/form-submit";
import { initialActionState } from "@/lib/action-state";
import { titleCase } from "@/lib/utils";
import { taskPriorities } from "@/services/execution/schemas";

type EditablePlanItem = {
  localId: string;
  title: string;
  description: string;
  ownerName: string;
  startDate: string;
  dueDate: string;
  priority: (typeof taskPriorities)[number];
  paymentPercent: number;
};

export function PlanEditor({
  plan,
}: {
  plan: {
    id: string;
    title: string;
    notes: string;
    items: Omit<EditablePlanItem, "localId">[];
  };
}) {
  const [state, formAction] = useActionState(updatePlanDraftAction, initialActionState);
  const [items, setItems] = useState<EditablePlanItem[]>(
    plan.items.map((item, index) => ({ ...item, localId: `${index}-${item.title}` })),
  );
  const paymentTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.paymentPercent || 0), 0),
    [items],
  );

  function updateItem<K extends keyof Omit<EditablePlanItem, "localId">>(
    index: number,
    field: K,
    value: EditablePlanItem[K],
  ) {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  return (
    <form action={formAction} noValidate className="space-y-7">
      <input type="hidden" name="id" value={plan.id} />
      <input type="hidden" name="itemCount" value={items.length} />
      {state.status === "error" ? <ErrorBanner>{state.message}</ErrorBanner> : null}

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
        <Field label="Tên kế hoạch" name="title" required error={state.fieldErrors.title}>
          <Input id="title" name="title" defaultValue={plan.title} required />
        </Field>
        <Field label="Phân bổ thanh toán" name="items" error={state.fieldErrors.items}>
          <div className={`mt-1.5 rounded-lg border px-3 py-2.5 text-sm font-bold ${Math.abs(paymentTotal - 100) < 0.001 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
            Đã phân bổ {paymentTotal.toFixed(2).replace(/\.00$/, "")}%
          </div>
        </Field>
      </div>
      <Field label="Ghi chú kế hoạch" name="notes" error={state.fieldErrors.notes}>
        <Textarea id="notes" name="notes" defaultValue={plan.notes} />
      </Field>

      <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-6">
        <div>
          <h3 className="font-bold text-slate-900">Các cột mốc</h3>
          <p className="mt-1 text-sm text-slate-500">Mỗi cột mốc sẽ trở thành một công việc và cột mốc thanh toán khi kích hoạt.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setItems((current) => [
            ...current,
            {
              localId: crypto.randomUUID(),
              title: "Cột mốc mới",
              description: "",
              ownerName: "",
              startDate: "",
              dueDate: "",
              priority: "medium",
              paymentPercent: 0,
            },
          ])}
        >
          <Plus className="size-4" /> Thêm cột mốc
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.localId} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cột mốc {index + 1}</p>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Xóa ${item.title}`}
                disabled={items.length === 1}
                onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tiêu đề" name={`itemTitle_${index}`} required>
                <Input name={`itemTitle_${index}`} value={item.title} onChange={(event) => updateItem(index, "title", event.target.value)} required />
              </Field>
              <Field label="Người phụ trách" name={`itemOwnerName_${index}`}>
                <Input name={`itemOwnerName_${index}`} value={item.ownerName} onChange={(event) => updateItem(index, "ownerName", event.target.value)} placeholder="Người phụ trách công việc" />
              </Field>
              <Field label="Mô tả" name={`itemDescription_${index}`} className="md:col-span-2">
                <Textarea name={`itemDescription_${index}`} value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} className="min-h-24" />
              </Field>
              <Field label="Ngày bắt đầu" name={`itemStartDate_${index}`}>
                <Input name={`itemStartDate_${index}`} type="date" value={item.startDate} onChange={(event) => updateItem(index, "startDate", event.target.value)} />
              </Field>
              <Field label="Ngày đến hạn" name={`itemDueDate_${index}`}>
                <Input name={`itemDueDate_${index}`} type="date" value={item.dueDate} onChange={(event) => updateItem(index, "dueDate", event.target.value)} />
              </Field>
              <Field label="Ưu tiên" name={`itemPriority_${index}`}>
                <Select name={`itemPriority_${index}`} value={item.priority} onChange={(event) => updateItem(index, "priority", event.target.value as EditablePlanItem["priority"])}>
                  {taskPriorities.map((priority) => <option key={priority} value={priority}>{titleCase(priority)}</option>)}
                </Select>
              </Field>
              <Field label="Phân bổ thanh toán (%)" name={`itemPaymentPercent_${index}`}>
                <Input name={`itemPaymentPercent_${index}`} type="number" min="0" max="100" step="0.01" value={item.paymentPercent} onChange={(event) => updateItem(index, "paymentPercent", Number(event.target.value))} />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-6">
        <FormSubmit label="Lưu bản nháp kế hoạch" pendingLabel="Đang lưu kế hoạch…" />
      </div>
    </form>
  );
}
