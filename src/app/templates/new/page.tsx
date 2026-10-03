import Link from "next/link";

import { TemplateForm } from "@/components/templates/template-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { starterTemplates } from "@/services/documents/template-library";
import type { DocumentTypeValue } from "@/services/documents/schemas";

export const metadata = { title: "Mẫu tài liệu mới" };

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const allowed = ["proposal", "quotation", "contract", "other"] as const;
  const safeType: DocumentTypeValue = allowed.includes(type as DocumentTypeValue)
    ? (type as DocumentTypeValue)
    : "proposal";
  const starter = starterTemplates.find((item) => item.type === safeType) ?? starterTemplates[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Hệ thống tài liệu"
        title="Tạo mẫu tài liệu"
        description="Xác định cấu trúc có thể chỉnh sửa và các biến dùng để tạo bản nháp tài liệu sau này."
        actions={<Link href="/templates" className={buttonVariants({ variant: "secondary" })}>Quay lại mẫu tài liệu</Link>}
      />
      <Card className="p-5 sm:p-7">
        <TemplateForm
          mode="create"
          value={{ name: `${starter.name} - Bản sao`, description: starter.description, type: safeType, content: starter.content }}
        />
      </Card>
    </div>
  );
}
