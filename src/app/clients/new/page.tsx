import Link from "next/link";

import { ClientForm } from "@/components/clients/client-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Khách hàng mới" };

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Quản lý khách hàng"
        title="Tạo khách hàng mới"
        description="Thêm thông tin công ty và người liên hệ chính. Bạn có thể tạo dự án ngay sau đó."
        actions={
          <Link href="/clients" className={buttonVariants({ variant: "secondary" })}>
            Quay lại danh sách khách hàng
          </Link>
        }
      />
      <Card className="p-5 sm:p-7"><ClientForm mode="create" /></Card>
    </div>
  );
}
