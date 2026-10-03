import { BellRing } from "lucide-react";
import Link from "next/link";

import { RemindersPanel } from "@/components/execution/project-execution-tabs";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Nhắc việc" };

export default async function RemindersPage() {
  const organization = await getCurrentOrganization();
  const reminders = await prisma.reminder.findMany({
    where: { organizationId: organization.id },
    include: {
      project: { select: { name: true } },
      client: { select: { companyName: true } },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhắc việc"
        description="Theo dõi công việc, thanh toán, cột mốc và nhắc việc thủ công trong toàn bộ không gian làm việc."
        actions={<Link href="/projects" className={buttonVariants()}><BellRing className="size-4" /> Thêm từ dự án</Link>}
      />
      <RemindersPanel reminders={reminders} showContext />
    </div>
  );
}
