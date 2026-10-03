"use client";

import {
  Banknote,
  Bot,
  Building2,
  CalendarDays,
  Check,
  FileCheck2,
  Goal,
  Info,
  LoaderCircle,
  MessageSquareText,
  RefreshCcw,
  Send,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

import {
  confirmBusinessRequestAction,
  extractBusinessRequestAction,
} from "@/app/ai-workspace/actions";
import {
  initialAIConfirmationState,
  initialAIExtractionState,
} from "@/app/ai-workspace/state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/ui/page-header";
import { cn, formatCurrency } from "@/lib/utils";

const examples = [
  "Công ty Nova Beauty thuê chúng tôi chạy TikTok Ads trong 3 tháng, phí dịch vụ 30 triệu/tháng, bắt đầu ngày 01/11/2026, KPI 3.000 khách hàng tiềm năng.",
  "Tạo dự án chạy Facebook Ads 6 tháng cho GreenHub, phí 50 triệu/tháng.",
  "Công ty ABC thuê chúng tôi thiết kế website, tổng giá trị 120 triệu, hoàn thành trong 3 tháng.",
];

function ReviewSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="size-4.5" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-slate-900">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

export function AIWorkspace({ configured }: { configured: boolean }) {
  const [request, setRequest] = useState(examples[0]);
  const [extractionState, extractionAction, extracting] = useActionState(
    extractBusinessRequestAction,
    initialAIExtractionState,
  );
  const [confirmationState, confirmationAction, confirming] = useActionState(
    confirmBusinessRequestAction,
    initialAIConfirmationState,
  );
  const draft = extractionState.draft;
  const duplicateCandidates = confirmationState.duplicateCandidates.length
    ? confirmationState.duplicateCandidates
    : extractionState.duplicateCandidates;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Tiếp nhận bằng AI"
        title="Không gian AI"
        description="Mô tả yêu cầu kinh doanh, rà soát kết quả có cấu trúc và xác nhận trước khi BizFlow tạo dữ liệu."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/contracts/new" className={buttonVariants()}>
              Tạo hợp đồng bằng AI
            </Link>
            <Link
              href="/settings/ai"
              className={buttonVariants({ variant: "secondary" })}
            >
              Kết nối AI
            </Link>
            <Link
              href="/projects/new"
              className={buttonVariants({ variant: "secondary" })}
            >
              Tạo thủ công
            </Link>
          </div>
        }
      />

      {!configured ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4.5 shrink-0" />
          <div>
            <p className="font-bold">Cần kết nối AI</p>
            <p className="mt-1 leading-6 text-amber-800">
              Mở{" "}
              <Link href="/settings/ai" className="font-bold underline">
                Cài đặt AI
              </Link>{" "}
              để kết nối ChatGPT và chọn model hoặc dùng Gemini đã cấu hình.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Mô tả yêu cầu kinh doanh
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Hỗ trợ cả tiếng Việt và tiếng Anh.
                </p>
              </div>
            </div>
          </div>

          <form action={extractionAction} className="p-5 sm:p-6">
            <div className="flex gap-3">
              <div className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white sm:flex">
                <MessageSquareText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="business-request" className="sr-only">
                  Yêu cầu kinh doanh
                </label>
                <textarea
                  id="business-request"
                  name="request"
                  value={request}
                  onChange={(event) => setRequest(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      (event.ctrlKey || event.metaKey) &&
                      event.key === "Enter"
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  disabled={!configured || extracting}
                  maxLength={5000}
                  placeholder="Mô tả khách hàng, dịch vụ, thời gian, chi phí và kết quả mong đợi…"
                  className="min-h-44 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                />
                <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-400">
                  <span>Ctrl/⌘ + Enter để phân tích</span>
                  <span className="tabular-nums">{request.length}/5,000</span>
                </div>
                {extractionState.fieldErrors.request?.[0] ? (
                  <p className="mt-2 text-xs font-semibold text-rose-600">
                    {extractionState.fieldErrors.request[0]}
                  </p>
                ) : null}
              </div>
            </div>

            {extractionState.status === "error" ? (
              <div className="mt-4" aria-live="polite">
                <ErrorBanner>{extractionState.message}</ErrorBanner>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Info className="size-3.5" /> Không có dữ liệu nào được lưu
                trước khi bạn xác nhận kết quả rà soát.
              </p>
              <Button
                type="submit"
                disabled={
                  !configured || extracting || request.trim().length < 20
                }
              >
                {extracting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {extracting
                  ? "Đang phân tích yêu cầu…"
                  : "Trích xuất dữ liệu kinh doanh"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Bot className="size-4.5 text-indigo-600" />
            <h2 className="font-bold text-slate-900">Yêu cầu mẫu</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Chọn một ví dụ rồi chỉnh sửa cho phù hợp với yêu cầu thực tế.
          </p>
          <div className="mt-5 space-y-3">
            {examples.map((example, index) => (
              <button
                key={example}
                type="button"
                onClick={() => setRequest(example)}
                disabled={extracting}
                className={cn(
                  "w-full rounded-xl border p-3.5 text-left text-sm leading-6 transition",
                  request === example
                    ? "border-indigo-200 bg-indigo-50/60 text-indigo-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50",
                )}
              >
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Ví dụ {index + 1}
                </span>
                {example}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
            <strong className="text-slate-700">Để có kết quả tốt nhất:</strong>{" "}
            hãy cung cấp khách hàng, dịch vụ, ngày hoặc thời lượng, giá, tiền tệ
            và KPI nếu đã biết.
          </div>
        </Card>
      </div>

      {draft && extractionState.status === "review" ? (
        <div className="space-y-5 animate-slide-in">
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check className="size-4" />
              </div>
              <div>
                <p className="font-bold text-emerald-950">
                  Kết quả trích xuất đã sẵn sàng để rà soát
                </p>
                <p className="mt-0.5 text-xs leading-5 text-emerald-800">
                  Kết quả Gemini đã qua phân tích JSON, kiểm tra Zod và chuẩn
                  hóa BizFlow. Hãy kiểm tra mọi trường trước khi xác nhận.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
              {extractionState.model}
            </span>
          </div>

          <form
            key={`${extractionState.originalRequest}-${extractionState.model}`}
            action={confirmationAction}
            className="space-y-5"
          >
            <input
              type="hidden"
              name="receipt"
              value={extractionState.receipt || ""}
            />
            <input
              type="hidden"
              name="originalRequest"
              value={extractionState.originalRequest}
            />
            <input
              type="hidden"
              name="reviewedDuplicateIds"
              value={duplicateCandidates
                .map((candidate) => candidate.id)
                .join(",")}
            />

            {confirmationState.status === "error" ? (
              <ErrorBanner>{confirmationState.message}</ErrorBanner>
            ) : null}

            {duplicateCandidates.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />
                  <div className="flex-1">
                    <h2 className="font-bold text-amber-950">
                      Có thể đã tồn tại khách hàng này
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Chọn khách hàng hiện có để tránh trùng lặp hoặc xác nhận
                      tạo một hồ sơ khách hàng riêng.
                    </p>
                    <div className="mt-4 space-y-2">
                      {duplicateCandidates.map((candidate, index) => (
                        <label
                          key={candidate.id}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white p-3.5"
                        >
                          <input
                            type="radio"
                            name="clientResolution"
                            value={`existing:${candidate.id}`}
                            defaultChecked={index === 0}
                            className="mt-1 accent-indigo-600"
                          />
                          <span>
                            <span className="block text-sm font-bold text-slate-900">
                              Sử dụng {candidate.companyName}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              Khớp theo{" "}
                              {candidate.matchReason === "taxCode"
                                ? "mã số thuế"
                                : "tên công ty"}
                              {candidate.taxCode
                                ? ` · MST ${candidate.taxCode}`
                                : ""}
                            </span>
                          </span>
                        </label>
                      ))}
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white p-3.5">
                        <input
                          type="radio"
                          name="clientResolution"
                          value="create"
                          className="mt-1 accent-indigo-600"
                        />
                        <span>
                          <span className="block text-sm font-bold text-slate-900">
                            Vẫn tạo khách hàng mới
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            Chỉ dùng khi đây thực sự là hai công ty khác nhau.
                          </span>
                        </span>
                      </label>
                    </div>
                    {confirmationState.fieldErrors.clientResolution?.[0] ? (
                      <p className="mt-2 text-xs font-semibold text-rose-600">
                        {confirmationState.fieldErrors.clientResolution[0]}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <input type="hidden" name="clientResolution" value="create" />
            )}

            <div className="grid gap-5 xl:grid-cols-2">
              <ReviewSection
                icon={Building2}
                title="Thông tin khách hàng"
                description="Thông tin pháp lý và liên hệ chính của hồ sơ khách hàng."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Tên công ty"
                    name="clientCompanyName"
                    required
                    error={confirmationState.fieldErrors.clientCompanyName}
                    className="sm:col-span-2"
                  >
                    <Input
                      id="clientCompanyName"
                      name="clientCompanyName"
                      defaultValue={draft.client.companyName}
                      required
                    />
                  </Field>
                  <Field
                    label="Mã số thuế"
                    name="clientTaxCode"
                    error={confirmationState.fieldErrors.clientTaxCode}
                  >
                    <Input
                      id="clientTaxCode"
                      name="clientTaxCode"
                      defaultValue={draft.client.taxCode}
                    />
                  </Field>
                  <Field
                    label="Số điện thoại"
                    name="clientPhone"
                    error={confirmationState.fieldErrors.clientPhone}
                  >
                    <Input
                      id="clientPhone"
                      name="clientPhone"
                      defaultValue={draft.client.phone}
                    />
                  </Field>
                  <Field
                    label="Địa chỉ"
                    name="clientAddress"
                    error={confirmationState.fieldErrors.clientAddress}
                    className="sm:col-span-2"
                  >
                    <Input
                      id="clientAddress"
                      name="clientAddress"
                      defaultValue={draft.client.address}
                    />
                  </Field>
                  <Field
                    label="Người đại diện"
                    name="clientRepresentativeName"
                    error={
                      confirmationState.fieldErrors.clientRepresentativeName
                    }
                  >
                    <Input
                      id="clientRepresentativeName"
                      name="clientRepresentativeName"
                      defaultValue={draft.client.representativeName}
                    />
                  </Field>
                  <Field
                    label="Chức vụ"
                    name="clientRepresentativeTitle"
                    error={
                      confirmationState.fieldErrors.clientRepresentativeTitle
                    }
                  >
                    <Input
                      id="clientRepresentativeTitle"
                      name="clientRepresentativeTitle"
                      defaultValue={draft.client.representativeTitle}
                    />
                  </Field>
                  <Field
                    label="Email"
                    name="clientEmail"
                    error={confirmationState.fieldErrors.clientEmail}
                    className="sm:col-span-2"
                  >
                    <Input
                      id="clientEmail"
                      name="clientEmail"
                      type="email"
                      defaultValue={draft.client.email}
                    />
                  </Field>
                </div>
              </ReviewSection>

              <ReviewSection
                icon={CalendarDays}
                title="Thông tin dự án"
                description="Phạm vi, dịch vụ, người phụ trách và lịch bàn giao."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Tên dự án"
                    name="projectName"
                    required
                    error={confirmationState.fieldErrors.projectName}
                    className="sm:col-span-2"
                  >
                    <Input
                      id="projectName"
                      name="projectName"
                      defaultValue={draft.project.name}
                      required
                    />
                  </Field>
                  <Field
                    label="Loại dịch vụ"
                    name="projectServiceType"
                    required
                    error={confirmationState.fieldErrors.projectServiceType}
                    className="sm:col-span-2"
                  >
                    <Input
                      id="projectServiceType"
                      name="projectServiceType"
                      defaultValue={draft.project.serviceType}
                      required
                    />
                  </Field>
                  <Field
                    label="Ngày bắt đầu"
                    name="projectStartDate"
                    error={confirmationState.fieldErrors.projectStartDate}
                  >
                    <Input
                      id="projectStartDate"
                      name="projectStartDate"
                      type="date"
                      defaultValue={draft.project.startDate}
                    />
                  </Field>
                  <Field
                    label="Ngày kết thúc"
                    name="projectEndDate"
                    error={confirmationState.fieldErrors.projectEndDate}
                  >
                    <Input
                      id="projectEndDate"
                      name="projectEndDate"
                      type="date"
                      defaultValue={draft.project.endDate}
                    />
                  </Field>
                  <Field
                    label="Thời lượng (tháng)"
                    name="projectDurationMonths"
                    error={confirmationState.fieldErrors.projectDurationMonths}
                  >
                    <Input
                      id="projectDurationMonths"
                      name="projectDurationMonths"
                      type="number"
                      min="1"
                      max="120"
                      defaultValue={draft.project.durationMonths ?? ""}
                    />
                  </Field>
                  <Field
                    label="Người phụ trách"
                    name="projectOwnerName"
                    error={confirmationState.fieldErrors.projectOwnerName}
                  >
                    <Input
                      id="projectOwnerName"
                      name="projectOwnerName"
                      defaultValue={draft.project.ownerName}
                    />
                  </Field>
                  <Field
                    label="Mô tả"
                    name="projectDescription"
                    error={confirmationState.fieldErrors.projectDescription}
                    className="sm:col-span-2"
                  >
                    <Textarea
                      id="projectDescription"
                      name="projectDescription"
                      defaultValue={draft.project.description}
                    />
                  </Field>
                </div>
              </ReviewSection>

              <ReviewSection
                icon={Banknote}
                title="Thông tin tài chính"
                description="Phí định kỳ và tổng giá trị dự án được nêu hoặc tính toán."
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="Phí hàng tháng"
                    name="projectMonthlyFee"
                    error={confirmationState.fieldErrors.projectMonthlyFee}
                  >
                    <Input
                      id="projectMonthlyFee"
                      name="projectMonthlyFee"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={draft.project.monthlyFee ?? ""}
                    />
                  </Field>
                  <Field
                    label="Tổng giá trị"
                    name="projectTotalValue"
                    error={confirmationState.fieldErrors.projectTotalValue}
                  >
                    <Input
                      id="projectTotalValue"
                      name="projectTotalValue"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={draft.project.totalValue ?? ""}
                    />
                  </Field>
                  <Field
                    label="Tiền tệ"
                    name="projectCurrency"
                    required
                    error={confirmationState.fieldErrors.projectCurrency}
                  >
                    <Input
                      id="projectCurrency"
                      name="projectCurrency"
                      maxLength={3}
                      defaultValue={draft.project.currency}
                      required
                    />
                  </Field>
                </div>
                {draft.project.totalValue !== null ? (
                  <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    Tổng đã rà soát:{" "}
                    {formatCurrency(
                      draft.project.totalValue,
                      draft.project.currency,
                    )}
                  </div>
                ) : null}
              </ReviewSection>

              <ReviewSection
                icon={Goal}
                title="KPI"
                description="Kết quả có thể đo lường được mong đợi từ dự án này."
              >
                <Field
                  label="Chỉ số thành công"
                  name="projectKpi"
                  error={confirmationState.fieldErrors.projectKpi}
                >
                  <Textarea
                    id="projectKpi"
                    name="projectKpi"
                    className="min-h-24"
                    defaultValue={draft.project.kpi}
                    placeholder="Thêm KPI hoặc kết quả mong đợi…"
                  />
                </Field>
              </ReviewSection>

              <ReviewSection
                icon={TriangleAlert}
                title="Thông tin còn thiếu"
                description="Các mục chưa được nêu rõ trong yêu cầu. Chỉnh sửa danh sách này nếu cần."
              >
                {draft.missingFields.length ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {draft.missingFields.map((field) => (
                      <span
                        key={field}
                        className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mb-4 text-sm font-medium text-emerald-700">
                    Hiện không có thông tin quan trọng nào bị đánh dấu là còn
                    thiếu.
                  </p>
                )}
                <Field
                  label="Trường còn thiếu (mỗi dòng một trường)"
                  name="missingFields"
                  error={confirmationState.fieldErrors.missingFields}
                >
                  <Textarea
                    id="missingFields"
                    name="missingFields"
                    className="min-h-24"
                    defaultValue={draft.missingFields.join("\n")}
                  />
                </Field>
              </ReviewSection>

              <ReviewSection
                icon={FileCheck2}
                title="Tài liệu được đề xuất"
                description="Được lưu cùng dự án để bạn tạo bản nháp có thể chỉnh sửa trong quy trình Tài liệu."
              >
                <Field
                  label="Đề xuất tài liệu (mỗi dòng một tài liệu)"
                  name="suggestedDocuments"
                  error={confirmationState.fieldErrors.suggestedDocuments}
                >
                  <Textarea
                    id="suggestedDocuments"
                    name="suggestedDocuments"
                    className="min-h-32"
                    defaultValue={draft.suggestedDocuments.join("\n")}
                    placeholder="Đề xuất&#10;Báo giá&#10;Hợp đồng dịch vụ"
                  />
                </Field>
              </ReviewSection>
            </div>

            <Card className="flex flex-col gap-4 border-indigo-200 bg-indigo-50/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="font-bold text-slate-950">
                  Sẵn sàng tạo quy trình?
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Khách hàng, dự án, ngữ cảnh AI và hoạt động sẽ được ghi trong
                  một giao dịch.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  <RefreshCcw className="size-4" /> Làm lại
                </button>
                <Button type="submit" size="lg" disabled={confirming}>
                  {confirming ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {confirming ? "Đang tạo…" : "Tạo khách hàng và dự án"}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      ) : null}
    </div>
  );
}
