import { Activity } from "lucide-react";

import { ActivityList } from "@/components/activity-list";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Hoạt động" };

export default async function ActivityPage() {
  const organization = await getCurrentOrganization();
  const activities = await prisma.activity.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hoạt động không gian làm việc"
        description="Lịch sử thay đổi theo thời gian của khách hàng, dự án và hồ sơ công ty."
      />
      {activities.length ? (
        <Card className="p-5 sm:p-7">
          <div className="max-w-3xl"><ActivityList activities={activities} /></div>
        </Card>
      ) : (
        <EmptyState
          icon={Activity}
          title="Chưa có hoạt động"
          description="Các thay đổi về khách hàng, dự án và cài đặt công ty sẽ xuất hiện tại đây."
        />
      )}
    </div>
  );
}
