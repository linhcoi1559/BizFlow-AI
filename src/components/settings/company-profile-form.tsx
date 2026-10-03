"use client";

import { useActionState } from "react";

import { updateCompanyProfileAction } from "@/app/actions";
import { ErrorBanner, SuccessBanner } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form-fields";
import { FormSubmit } from "@/components/ui/form-submit";
import { initialActionState } from "@/lib/action-state";

type CompanyProfileValues = {
  companyName: string;
  taxCode: string | null;
  address: string | null;
  representativeName: string | null;
  representativeTitle: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  bankName: string | null;
  bankAccount: string | null;
};

export function CompanyProfileForm({ values }: { values: CompanyProfileValues }) {
  const [state, formAction] = useActionState(
    updateCompanyProfileAction,
    initialActionState,
  );

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" ? <ErrorBanner>{state.message}</ErrorBanner> : null}
      {state.status === "success" ? <SuccessBanner>{state.message}</SuccessBanner> : null}

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Thông tin doanh nghiệp</h2>
          <p className="mt-1 text-sm text-slate-500">
            Các thông tin này được sử dụng trong đề xuất, báo giá, hợp đồng và tệp xuất.
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
              defaultValue={values.companyName}
              required
            />
          </Field>
          <Field label="Mã số thuế" name="taxCode" error={state.fieldErrors.taxCode}>
            <Input id="taxCode" name="taxCode" defaultValue={values.taxCode ?? ""} />
          </Field>
          <Field label="Website" name="website" error={state.fieldErrors.website}>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={values.website ?? ""}
            />
          </Field>
          <Field
            label="Địa chỉ"
            name="address"
            error={state.fieldErrors.address}
            className="md:col-span-2"
          >
            <Input id="address" name="address" defaultValue={values.address ?? ""} />
          </Field>
        </div>
      </section>

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Người đại diện và liên hệ</h2>
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
            />
          </Field>
          <Field
            label="Chức vụ người đại diện"
            name="representativeTitle"
            error={state.fieldErrors.representativeTitle}
          >
            <Input
              id="representativeTitle"
              name="representativeTitle"
              defaultValue={values.representativeTitle ?? ""}
            />
          </Field>
          <Field label="Email" name="email" error={state.fieldErrors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={values.email ?? ""}
            />
          </Field>
          <Field label="Số điện thoại" name="phone" error={state.fieldErrors.phone}>
            <Input id="phone" name="phone" defaultValue={values.phone ?? ""} />
          </Field>
        </div>
      </section>

      <section>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900">Thông tin ngân hàng</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Tên ngân hàng" name="bankName" error={state.fieldErrors.bankName}>
            <Input id="bankName" name="bankName" defaultValue={values.bankName ?? ""} />
          </Field>
          <Field
            label="Số tài khoản"
            name="bankAccount"
            error={state.fieldErrors.bankAccount}
          >
            <Input
              id="bankAccount"
              name="bankAccount"
              defaultValue={values.bankAccount ?? ""}
            />
          </Field>
        </div>
      </section>

      <div className="flex justify-end border-t border-slate-100 pt-6">
        <FormSubmit label="Lưu hồ sơ công ty" />
      </div>
    </form>
  );
}
