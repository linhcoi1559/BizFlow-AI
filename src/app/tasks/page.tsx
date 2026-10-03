import { CheckSquare2, Search } from "lucide-react";
import Link from "next/link";

import { TasksTable } from "@/components/execution/project-execution-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { titleCase } from "@/lib/utils";
import { taskPriorities, taskStatuses } from "@/services/execution/schemas";

export const metadata = { title: "Công việc" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; priority?: string }>;
}) {
  const [{ q = "", status = "all", priority = "all" }, organization] = await Promise.all([
    searchParams,
    getCurrentOrganization(),
  ]);
  const safeStatus = taskStatuses.find((value) => value === status);
  const safePriority = taskPriorities.find((value) => value === priority);
  const tasks = await prisma.task.findMany({
    where: {
      organizationId: organization.id,
      ...(safeStatus ? { status: safeStatus } : {}),
      ...(safePriority ? { priority: safePriority } : {}),
      ...(q.trim() ? {
        OR: [
          { title: { contains: q.trim() } },
          { ownerName: { contains: q.trim() } },
          { project: { name: { contains: q.trim() } } },
          { client: { companyName: { contains: q.trim() } } },
        ],
      } : {}),
    },
    include: {
      project: { select: { name: true } },
      client: { select: { companyName: true } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Công việc"
        description="Theo dõi công việc được phân công và lên lịch trên mọi dự án đang hoạt động."
        actions={<Link href="/projects" className={buttonVariants()}><CheckSquare2 className="size-4" /> Mở dự án</Link>}
      />
      <Card className="p-4">
        <form method="get" className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto_auto]">
          <label className="relative"><span className="sr-only">Tìm công việc</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="search" name="q" defaultValue={q} placeholder="Tìm công việc, người phụ trách, dự án…" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
          <select name="status" defaultValue={status} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><option value="all">Tất cả trạng thái</option>{taskStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select>
          <select name="priority" defaultValue={priority} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><option value="all">Tất cả mức ưu tiên</option>{taskPriorities.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select>
          <button className={buttonVariants({ variant: "secondary" })}>Áp dụng bộ lọc</button>
          {q || status !== "all" || priority !== "all" ? <Link href="/tasks" className={buttonVariants({ variant: "ghost" })}>Xóa bộ lọc</Link> : null}
        </form>
      </Card>
      <TasksTable tasks={tasks} showContext />
    </div>
  );
}
