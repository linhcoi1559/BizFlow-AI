import { CheckCircle2, Download, FileClock, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { approveDocumentAction, submitDocumentForReviewAction } from "@/app/documents/actions";
import { DocumentEditor } from "@/components/documents/document-editor";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBanner, SuccessBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form-fields";
import { FormSubmit } from "@/components/ui/form-submit";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/utils";
import { documentContentSchema } from "@/services/documents/schemas";

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    version?: string;
    created?: string;
    saved?: string;
    submitted?: string;
    approved?: string;
    approvalError?: string;
  }>;
}) {
  const [{ id }, query, organization] = await Promise.all([params, searchParams, getCurrentOrganization()]);
  const document = await prisma.document.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      client: true,
      project: true,
      template: { select: { name: true, version: true } },
      versions: { orderBy: { version: "desc" } },
    },
  });
  if (!document) notFound();

  const requestedVersion = Number(query.version);
  const selectedVersion = document.versions.find((item) => item.version === requestedVersion)
    ?? document.versions.find((item) => item.version === document.currentVersion);
  if (!selectedVersion) throw new Error("Không tìm thấy phiên bản tài liệu hiện tại.");
  const parsedContent = documentContentSchema.safeParse(selectedVersion.content);
  if (!parsedContent.success) throw new Error("Nội dung tài liệu không hợp lệ và không thể hiển thị.");
  const historical = selectedVersion.version !== document.currentVersion;

  return (
    <div className="space-y-6">
      {query.created ? <SuccessBanner>Đã tạo bản nháp tài liệu. Hãy kiểm tra trước khi gửi duyệt.</SuccessBanner> : null}
      {query.saved ? <SuccessBanner>Đã lưu phiên bản tài liệu mới và chuyển về trạng thái Bản nháp.</SuccessBanner> : null}
      {query.submitted ? <SuccessBanner>Đã gửi tài liệu để duyệt.</SuccessBanner> : null}
      {query.approved ? <SuccessBanner>Đã phê duyệt tài liệu. Bạn có thể xuất DOCX và PDF.</SuccessBanner> : null}
      {query.approvalError ? <ErrorBanner>Nhập tên người phê duyệt tài liệu.</ErrorBanner> : null}
      <PageHeader
        eyebrow={`${titleCase(document.type)} · ${document.referenceNumber}`}
        title={document.title}
        description={`${document.client.companyName} · ${document.project.name}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={document.status} />
            <Link href="/documents" className={buttonVariants({ variant: "secondary", size: "sm" })}>Tất cả tài liệu</Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <Card className="p-5 sm:p-7">
          {historical ? (
            <div className="space-y-7">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="font-bold text-slate-900">Bản chụp phiên bản {selectedVersion.version}</h2>
                <p className="mt-1 text-sm text-slate-500">Phiên bản lịch sử không thể chỉnh sửa và được hiển thị để kiểm tra.</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tiêu đề</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{parsedContent.data.title}</p>
              </div>
              {parsedContent.data.sections.map((section) => (
                <section key={section.key}>
                  <h3 className="font-bold text-slate-900">{section.heading}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{section.body}</p>
                </section>
              ))}
              <section>
                <h3 className="font-bold text-slate-900">Chi tiết thương mại</h3>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Mô tả</th><th className="px-4 py-3">Số lượng</th><th className="px-4 py-3">Đơn vị</th><th className="px-4 py-3">Đơn giá</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{parsedContent.data.lineItems.map((item, index) => <tr key={`${item.description}-${index}`}><td className="px-4 py-3 font-medium text-slate-700">{item.description}</td><td className="px-4 py-3">{item.quantity}</td><td className="px-4 py-3">{item.unit}</td><td className="px-4 py-3">{formatCurrency(item.unitPrice, parsedContent.data.currency)}</td></tr>)}</tbody>
                  </table>
                </div>
              </section>
              <Link href={`/documents/${document.id}`} className={buttonVariants({ variant: "secondary" })}>Về phiên bản hiện tại</Link>
            </div>
          ) : (
            <DocumentEditor
              documentId={document.id}
              projectId={document.projectId}
              currentVersion={document.currentVersion}
              content={parsedContent.data}
            />
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900">Rà soát và phê duyệt</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Chức năng xuất tệp bị khóa cho đến khi phiên bản hiện tại được phê duyệt rõ ràng.
            </p>
            {document.status === "draft" ? (
              <form action={submitDocumentForReviewAction} className="mt-5">
                <input type="hidden" name="id" value={document.id} />
                <FormSubmit label="Gửi duyệt" pendingLabel="Đang gửi…" />
              </form>
            ) : null}
            {document.status === "in_review" ? (
              <form action={approveDocumentAction} className="mt-5 space-y-3">
                <input type="hidden" name="id" value={document.id} />
                <label htmlFor="approvedByName" className="text-sm font-semibold text-slate-700">Người phê duyệt</label>
                <Input id="approvedByName" name="approvedByName" placeholder="Tên người duyệt" required />
                <FormSubmit label="Phê duyệt phiên bản hiện tại" pendingLabel="Đang phê duyệt…" />
              </form>
            ) : null}
            {document.status === "approved" ? (
              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <span>Được {document.approvedByName} phê duyệt lúc {formatDateTime(document.approvedAt!)}</span>
                </div>
                <Link href={`/documents/${document.id}/export/docx`} className={buttonVariants({ className: "w-full" })}><Download className="size-4" /> Tải DOCX</Link>
                <Link href={`/documents/${document.id}/export/pdf`} className={buttonVariants({ variant: "secondary", className: "w-full" })}><Download className="size-4" /> Tải PDF</Link>
                <p className="text-xs leading-5 text-slate-400">Lưu chỉnh sửa mới sẽ tạo phiên bản Bản nháp và thu hồi phê duyệt này.</p>
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2"><FileClock className="size-4 text-indigo-600" /><h2 className="font-bold text-slate-900">Lịch sử phiên bản</h2></div>
            <div className="mt-4 space-y-2">
              {document.versions.map((version) => (
                <Link
                  key={version.id}
                  href={version.version === document.currentVersion ? `/documents/${document.id}` : `/documents/${document.id}?version=${version.version}`}
                  className={`block rounded-lg border px-3 py-2.5 text-sm ${version.version === selectedVersion.version ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <span className="font-bold text-slate-800">Phiên bản {version.version}</span>
                  {version.version === document.currentVersion ? <span className="ml-2 text-xs font-bold text-indigo-600">Hiện tại</span> : null}
                  <span className="mt-1 block text-xs text-slate-400">{version.changeNote || "Cập nhật tài liệu"}</span>
                  <span className="mt-1 block text-[11px] text-slate-400">{formatDateTime(version.createdAt)}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Link href={`/projects/${document.projectId}?tab=documents`} className={buttonVariants({ variant: "ghost", className: "w-full" })}>
            <Send className="size-4" /> Mở tài liệu dự án
          </Link>
        </div>
      </div>
    </div>
  );
}
