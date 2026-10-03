"use client";
import { useActionState, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  previewContractAction,
  confirmContractAction,
  reviseContractAction,
} from "@/app/contracts/new/actions";
import {
  initialContractChatState,
  initialContractState,
} from "@/app/contracts/new/state";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/form-fields";
import { formatCurrency } from "@/lib/utils";
import { useContractDraft } from "./use-contract-draft";
import type { ContractDraft } from "@/lib/contract-draft";
type ClientChoice = {
  id: string;
  companyName: string;
  address: string | null;
  representativeName: string | null;
  taxCode: string | null;
  email: string | null;
  phone: string | null;
};

export function ContractWizard({
  clients,
  templates,
  configured,
  draftStorageKey,
}: {
  clients: ClientChoice[];
  templates: { id: string; name: string }[];
  configured: boolean;
  draftStorageKey: string;
}) {
  const [state, preview, pending] = useActionState(
    previewContractAction,
    initialContractState,
  );
  const [confirmation, confirm, saving] = useActionState(
    confirmContractAction,
    initialContractState,
  );
  const [chat, revise, revising] = useActionState(
    reviseContractAction,
    initialContractChatState,
  );
  const contractFormRef = useRef<HTMLFormElement>(null);
  const clientIds = useMemo(() => clients.map((item) => item.id), [clients]);
  const templateIds = useMemo(() => templates.map((item) => item.id), [templates]);
  const { fields, ready, message: draftMessage, update, clear } = useContractDraft(draftStorageKey, clientIds, templateIds);
  const clientId = fields.clientId;
  const kind = fields.partyKind;
  const [acknowledgeDuplicate, setAcknowledgeDuplicate] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [dirty, setDirty] = useState(false);
  function change(name: keyof ContractDraft, value: string) {
    update({ ...fields, [name]: value });
    setDirty(true);
  }
  function selectClient(id: string) {
    const client = clients.find((item) => item.id === id);
    update({ ...fields, clientId: id, name: client?.companyName || "", address: client?.address || "",
      representative: client?.representativeName || "", taxCode: client?.taxCode || "",
      email: client?.email || "", phone: client?.phone || "", birthDate: "", identityNumber: "" });
    setAcknowledgeDuplicate(false);
    setDirty(true);
  }
  const chatMatchesPreview = chat.baseTicket === state.ticket;
  const activeContent =
    chatMatchesPreview && chat.content ? chat.content : state.content;
  const activeMissingFields = chatMatchesPreview
    ? chat.missingFields
    : state.missingFields;
  const activeTicket =
    chatMatchesPreview && chat.ticket ? chat.ticket : state.ticket;
  const fieldLabels: Record<string, string> = {
    name: "Tên khách hàng",
    address: "Địa chỉ",
    representative: "Người đại diện",
    taxCode: "Mã số thuế",
    birthDate: "Ngày sinh",
    identityNumber: "Số giấy tờ định danh",
    email: "Email",
    phone: "Điện thoại",
    purpose: "Công việc và mục đích sử dụng",
    startDate: "Ngày bắt đầu",
    endDate: "Ngày kết thúc",
    totalValue: "Tổng giá trị",
    paymentTerms: "Thanh toán",
    requirements: "Yêu cầu bổ sung",
  };
  function focusField(field: string) {
    const element = document.getElementById(field);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => element?.focus(), 350);
  }
  function input(
    name: keyof ContractDraft,
    label: string,
    type = "text",
    defaultValue = "",
    required = false,
  ) {
    return (
      <Field
        key={name}
        name={name}
        label={label}
        error={state.fieldErrors[name]}
        required={required}
      >
        <Input
          id={name}
          name={name}
          type={type}
          value={fields[name] || defaultValue}
          onChange={(event) => change(name, event.target.value)}
          required={required}
          maxLength={type === "text" ? 500 : undefined}
        />
      </Field>
    );
  }
  return (
    <div className="space-y-6">
      {!configured && (
        <Card className="p-4 text-amber-800">
          Kết nối ChatGPT và chọn model tại{" "}
          <Link href="/settings/ai" className="font-bold underline">
            Cài đặt AI
          </Link>{" "}
          để soạn hợp đồng.
        </Card>
      )}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-slate-600">{draftMessage}</p>
          <Button type="button" variant="secondary" disabled={!ready || pending || saving} onClick={() => {
            if (clear()) { setAcknowledgeDuplicate(false); setDirty(true); setShowPreview(false); }
          }}>Xóa bản nhập đã lưu</Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Bản nhập chỉ lưu trên thiết bị này, riêng cho tài khoản và công ty hiện tại. Bạn vẫn cần xác nhận để tạo hợp đồng.</p>
      </Card>
      <Card className="p-5 sm:p-7">
        <form
          ref={contractFormRef}
          action={preview}
          onSubmit={() => { setDirty(false); setShowPreview(true); }}
          className="space-y-6"
        >
          <fieldset
            disabled={!ready || pending || saving || revising}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-bold">1. Thông tin khách hàng</h2>
              <p className="mt-1 text-sm text-slate-500">
                Chọn khách hàng có sẵn hoặc nhập thông tin mới. Thông tin bên bạn
                lấy từ hồ sơ công ty.
              </p>
            </div>
            <Field name="clientId" label="Khách hàng">
              <Select
                id="clientId"
                name="clientId"
                value={clientId}
                onChange={(event) => selectClient(event.target.value)}
              >
                <option value="">Khách hàng mới</option>
                {clients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.companyName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field name="partyKind" label="Loại khách hàng">
              <Select
                id="partyKind"
                name="partyKind"
                value={kind}
                onChange={(event) => change("partyKind", event.target.value)}
              >
                <option value="company">Doanh nghiệp</option>
                <option value="individual">Cá nhân</option>
              </Select>
            </Field>
            <div key={clientId} className="grid gap-4 sm:grid-cols-2">
              {input(
                "name",
                kind === "individual" ? "Họ và tên" : "Tên doanh nghiệp",
                "text",
                "",
                true,
              )}
              {input("address", "Địa chỉ", "text", "", true)}
              {kind === "company" ? (
                <>
                  {input(
                    "representative",
                    "Người đại diện",
                    "text",
                    "",
                    true,
                  )}
                  {input("taxCode", "Mã số thuế", "text", "")}
                </>
              ) : (
                <>
                  {input("birthDate", "Ngày sinh (nếu cần)", "date")}
                  {input("identityNumber", "Số giấy tờ định danh (nếu cần)")}
                </>
              )}
              {input("email", "Email", "email", "")}
              {input("phone", "Điện thoại", "tel", "")}
            </div>
            {!clientId && (
              <label className="flex gap-2 text-sm text-slate-600">
                <input type="checkbox" name="acknowledgeDuplicate" checked={acknowledgeDuplicate} onChange={(event) => setAcknowledgeDuplicate(event.target.checked)} /> Tôi xác nhận
                tạo khách hàng mới nếu có tên tương tự trong danh sách.
              </label>
            )}
            <h2 className="text-lg font-bold">2. Nội dung hợp đồng dịch vụ</h2>
            <Field
              name="purpose"
              label="Công việc và mục đích sử dụng"
              required
              error={state.fieldErrors.purpose}
            >
              <Textarea
                id="purpose"
                name="purpose"
                value={fields.purpose}
                onChange={(event) => change("purpose", event.target.value)}
                required
                minLength={10}
                maxLength={4000}
                placeholder="Ví dụ: thiết kế website bán hàng gồm 5 trang, bàn giao mã nguồn và hướng dẫn sử dụng..."
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              {input("startDate", "Ngày bắt đầu", "date", "", true)}
              {input("endDate", "Ngày kết thúc", "date", "", true)}
              <Field
                name="totalValue"
                label="Tổng giá trị (VND)"
                required
                error={state.fieldErrors.totalValue}
              >
                <Input
                  id="totalValue"
                  name="totalValue"
                  value={fields.totalValue}
                  onChange={(event) => change("totalValue", event.target.value)}
                  type="number"
                  min="1"
                  max="100000000000000"
                  step="1"
                  required
                />
              </Field>
            </div>
            <Field
              name="paymentTerms"
              label="Thanh toán"
              required
              error={state.fieldErrors.paymentTerms}
            >
              <Textarea
                id="paymentTerms"
                name="paymentTerms"
                value={fields.paymentTerms}
                onChange={(event) => change("paymentTerms", event.target.value)}
                required
                minLength={5}
                maxLength={4000}
                placeholder="Ví dụ: 50% khi ký, 50% sau nghiệm thu; giá đã bao gồm thuế hay chưa..."
              />
            </Field>
            <Field name="templateId" label="Mẫu tham khảo">
              <Select id="templateId" name="templateId" value={fields.templateId} onChange={(event) => change("templateId", event.target.value)}>
                <option value="">Mẫu hợp đồng dịch vụ tiêu chuẩn</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              name="requirements"
              label="Yêu cầu bổ sung và câu trả lời cho AI"
            >
              <Textarea
                id="requirements"
                name="requirements"
                value={fields.requirements}
                onChange={(event) => change("requirements", event.target.value)}
                maxLength={4000}
                placeholder="Tiêu chí nghiệm thu, bảo mật, quyền sử dụng, trường hợp chấm dứt..."
              />
            </Field>
            {state.message && (
              <p
                role="status"
                className={
                  state.status === "error" ? "text-rose-600" : "text-slate-600"
                }
              >
                {state.message}
              </p>
            )}
            <Button
              type="submit"
              disabled={pending || saving || revising || !configured}
            >
              {pending ? "AI đang soạn bản nháp…" : "AI soạn hợp đồng"}
            </Button>
          </fieldset>
        </form>
      </Card>
      {showPreview && state.content && (
        <Card className="space-y-5 p-5 sm:p-7">
          <h2 className="text-xl font-bold">3. Kiểm tra bản nháp</h2>
          {activeMissingFields.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
              <p className="font-bold text-slate-900">AI vẫn còn cảnh báo</p>
              <p className="mt-1 text-sm text-slate-600">
                Bạn có thể yêu cầu AI tự hoàn thiện tiếp trong khung chat bên
                dưới. Nếu nhân sự đã kiểm tra và thấy bản hợp đồng phù hợp, vẫn
                có thể xác nhận lưu mà không cần xử lý từng cảnh báo.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {activeMissingFields.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 sm:p-5">
            <div>
              <h3 className="font-bold text-slate-900">
                Trợ lý AI hoàn thiện hợp đồng
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Dán toàn bộ yêu cầu của bạn như khi chat với một trợ lý. AI sẽ
                sửa trực tiếp bản hợp đồng, nói rõ đã đổi gì và chỉ ra chính
                xác ô nào bạn cần tự sửa nếu đó là thông tin cố định.
              </p>
            </div>
            {chatMatchesPreview && chat.messages.length > 0 && (
              <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg bg-white p-3">
                {chat.messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
                      message.role === "user"
                        ? "ml-6 bg-slate-100 text-slate-800"
                        : "mr-6 bg-indigo-100 text-indigo-950"
                    }`}
                  >
                    <p className="mb-1 font-semibold">
                      {message.role === "user" ? "Bạn" : "Trợ lý AI"}
                    </p>
                    {message.text}
                  </div>
                ))}
              </div>
            )}
            {chatMatchesPreview && chat.manualChanges.length > 0 && (
              <div className="rounded-lg border border-sky-200 bg-white p-4">
                <p className="font-semibold text-slate-900">
                  Thông tin cần nhân sự sửa trực tiếp
                </p>
                <ul className="mt-3 space-y-3 text-sm">
                  {chat.manualChanges.map((item, index) => (
                    <li key={`${item.field}-${index}`}>
                      <p>
                        <strong>{fieldLabels[item.field] || item.field}:</strong>{" "}
                        {item.instruction}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => focusField(item.field)}
                      >
                        Đi tới ô cần sửa
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <form action={revise} className="space-y-3">
              <input type="hidden" name="baseTicket" value={state.ticket} />
              <input type="hidden" name="ticket" value={activeTicket} />
              <label className="block text-sm font-semibold text-slate-700">
                Nhắn cho AI
                <Textarea
                  name="message"
                  minLength={2}
                  maxLength={8000}
                  required
                  disabled={dirty || revising}
                  placeholder="Ví dụ: Hãy tự hoàn thiện toàn bộ hợp đồng theo hướng cân bằng. Thêm 3 vòng chỉnh sửa, nghiệm thu trong 5 ngày làm việc, bàn giao mã nguồn sau khi thanh toán đủ và giải thích từng thay đổi cho tôi."
                />
              </label>
              <Button
                type="submit"
                disabled={dirty || revising || pending || saving}
              >
                {revising
                  ? "AI đang đọc và sửa hợp đồng…"
                  : "Gửi cho AI và cập nhật hợp đồng"}
              </Button>
            </form>
            {chatMatchesPreview && chat.message && (
              <p
                role="status"
                className={
                  chat.status === "error"
                    ? "text-sm text-rose-600"
                    : "text-sm text-slate-600"
                }
              >
                {chat.message}
              </p>
            )}
          </div>

          <h3 className="font-bold">{activeContent?.title}</h3>
          <p>
            Tổng giá trị:{" "}
            {activeContent &&
              formatCurrency(activeContent.totalValue, activeContent.currency)}
          </p>
          {activeContent?.sections.map((section) => (
            <section key={section.key}>
              <h4 className="font-bold">{section.heading}</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {section.body}
              </p>
            </section>
          ))}
          <p className="text-sm text-slate-500">
            Sau khi lưu, bạn có thể sửa nội dung, gửi duyệt và phê duyệt trước
            khi xuất Word/PDF để gửi khách.
          </p>
          {dirty && (
            <p className="text-amber-700">
              Thông tin đã thay đổi. Hãy để AI tạo lại bản nháp trước khi lưu.
            </p>
          )}
          {activeTicket && (
            <form action={confirm} className="space-y-4">
              <input type="hidden" name="ticket" value={activeTicket} />
              {activeMissingFields.length > 0 && (
                <label className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <input
                    type="checkbox"
                    name="acceptUnresolved"
                    required
                    disabled={dirty}
                  />{" "}
                  Nhân sự đã kiểm tra và chấp nhận lưu dù AI vẫn còn cảnh báo.
                </label>
              )}
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  name="confirm"
                  required
                  disabled={dirty}
                />{" "}
                Tôi đã kiểm tra thông tin và xác nhận lưu bản nháp này.
              </label>
              {confirmation.message && (
                <p role="alert" className="text-rose-600">
                  {confirmation.message}
                </p>
              )}
              <Button
                type="submit"
                disabled={saving || pending || revising || dirty}
              >
                {saving ? "Đang lưu…" : "Xác nhận và lưu bản nháp"}
              </Button>
            </form>
          )}
        </Card>
      )}
      <Link
        href="/settings/company"
        className={buttonVariants({ variant: "secondary" })}
      >
        Kiểm tra hồ sơ công ty
      </Link>
    </div>
  );
}
