import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, organization] = await Promise.all([
    params,
    getCurrentOrganization(),
  ]);
  const client = await prisma.client.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!client) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Quản lý khách hàng"
        title={`Chỉnh sửa ${client.companyName}`}
        description="Cập nhật thông tin công ty, liên hệ và tài khoản."
        actions={
          <Link
            href={`/clients/${client.id}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Quay lại khách hàng
          </Link>
        }
      />
      <Card className="p-5 sm:p-7">
        <ClientForm mode="edit" values={client} />
      </Card>
    </div>
  );
}
