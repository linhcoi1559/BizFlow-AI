"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createDocumentAction } from "@/app/documents/actions";
import { buttonVariants } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/feedback";
import { Field, Select } from "@/components/ui/form-fields";
import { FormSubmit } from "@/components/ui/form-submit";
import { initialActionState } from "@/lib/action-state";
import { titleCase } from "@/lib/utils";

export function CreateDocumentForm({
  projects,
  templates,
  selectedProjectId,
  selectedTemplateId,
}: {
  projects: { id: string; name: string; clientName: string }[];
  templates: { id: string; name: string; type: string; version: number }[];
  selectedProjectId?: string;
  selectedTemplateId?: string;
}) {
  const [state, formAction] = useActionState(createDocumentAction, initialActionState);

  return (
    <form action={formAction} noValidate className="space-y-6">
      {state.status === "error" ? <ErrorBanner>{state.message}</ErrorBanner> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Dự án" name="projectId" required error={state.fieldErrors.projectId}>
          <Select id="projectId" name="projectId" defaultValue={selectedProjectId || ""} required>
            <option value="" disabled>Chọn dự án</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name} · {project.clientName}</option>
            ))}
          </Select>
        </Field>
        <Field label="Mẫu tài liệu" name="templateId" required error={state.fieldErrors.templateId}>
          <Select id="templateId" name="templateId" defaultValue={selectedTemplateId || ""} required>
            <option value="" disabled>Chọn mẫu tài liệu</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {titleCase(template.type)} · {template.name} · v{template.version}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm leading-6 text-slate-600">
        BizFlow tạo bản nháp có thể chỉnh sửa từ dự án và mẫu đã chọn. Hệ thống chỉ tạo DOCX hoặc PDF sau khi bản nháp được rà soát và phê duyệt rõ ràng.
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
        <Link href={selectedProjectId ? `/projects/${selectedProjectId}?tab=documents` : "/documents"} className={buttonVariants({ variant: "secondary" })}>Hủy</Link>
        <FormSubmit label="Tạo bản nháp" pendingLabel="Đang tạo bản nháp…" />
      </div>
    </form>
  );
}
