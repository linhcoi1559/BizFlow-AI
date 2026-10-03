import { CircleDollarSign } from "lucide-react";
import Link from "next/link";

import { PaymentsTable } from "@/components/execution/project-execution-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Thanh toán" };

export default async function PaymentsPage() {
  const organization = await getCurrentOrganization();
  const payments = await prisma.paymentMilestone.findMany({
    where: { organizationId: organization.id },
    include: {
      project: { select: { name: true } },
      client: { select: { companyName: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  const scheduled = payments.filter((payment) => !["paid", "waived"].includes(payment.status));
  const paid = payments.filter((payment) => payment.status === "paid");
  const overdue = scheduled.filter((payment) => payment.dueDate && payment.dueDate < new Date());
  const summarize = (items: typeof payments) => {
    const totals = new Map<string, number>();
    for (const payment of items) {
      totals.set(payment.currency, (totals.get(payment.currency) || 0) + Number(payment.amount));
    }
    return [...totals.entries()].map(([currency, total]) => formatCurrency(total, currency)).join(" · ") || formatCurrency(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thanh toán"
        description="Lịch thanh toán toàn danh mục được tạo từ các kế hoạch dự án đã kích hoạt."
        actions={<Link href="/projects" className={buttonVariants()}><CircleDollarSign className="size-4" /> Mở dự án</Link>}
      />
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-slate-500">Chưa thu</p><p className="mt-2 text-2xl font-extrabold text-slate-950">{summarize(scheduled)}</p><p className="mt-2 text-xs text-slate-400">{scheduled.length} cột mốc</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Đã thu</p><p className="mt-2 text-2xl font-extrabold text-emerald-700">{summarize(paid)}</p><p className="mt-2 text-xs text-slate-400">{paid.length} cột mốc đã thanh toán</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Quá hạn</p><p className="mt-2 text-2xl font-extrabold text-rose-700">{summarize(overdue)}</p><p className="mt-2 text-xs text-slate-400">{overdue.length} mục cần chú ý</p></Card>
      </section>
      <PaymentsTable payments={payments} showContext />
    </div>
  );
}
