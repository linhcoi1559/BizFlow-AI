import { ShieldCheck, UserPlus, UsersRound } from "lucide-react";

import { inviteMemberAction, updateMemberAction } from "@/app/settings/members/actions";
import { MEMBER_ADMIN_ROLES, requireOrganizationRole } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { titleCase } from "@/lib/utils";

const roles = ["owner", "admin", "manager", "finance", "reviewer", "member"] as const;
const statuses = ["invited", "active", "suspended"] as const;
const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

type MembersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const [context, query] = await Promise.all([
    requireOrganizationRole(MEMBER_ADMIN_ROLES),
    searchParams,
  ]);
  const memberships = await prisma.organizationMembership.findMany({
    where: { organizationId: context.organization.id },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: { user: true },
  });
  const error = typeof query.error === "string" ? query.error : null;
  const message = typeof query.message === "string" ? query.message : null;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
          <UsersRound className="size-4" /> Quyền truy cập tổ chức
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Thành viên và vai trò</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Mời đồng đội qua email và chỉ cấp vai trò tối thiểu cần thiết. Lời mời sẽ được kích hoạt sau khi họ tạo tài khoản Supabase bằng đúng email đó.
        </p>
      </header>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><UserPlus className="size-5" /></span>
          <div>
            <h2 className="font-bold text-slate-950">Mời thành viên</h2>
            <p className="text-sm text-slate-500">Không sử dụng service-role key; thao tác này chỉ cấp quyền trước cho email.</p>
          </div>
        </div>
        <form action={inviteMemberAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
          <label className="text-sm font-semibold text-slate-700">Họ tên<input className={`mt-1.5 ${inputClassName}`} name="displayName" maxLength={100} /></label>
          <label className="text-sm font-semibold text-slate-700">Email<input className={`mt-1.5 ${inputClassName}`} name="email" type="email" required /></label>
          <label className="text-sm font-semibold text-slate-700">Vai trò<select className={`mt-1.5 ${inputClassName}`} name="role" defaultValue="member">{roles.filter((role) => context.membership.role === "owner" || role !== "owner").map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</select></label>
          <button className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700" type="submit">Tạo lời mời</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div><h2 className="font-bold text-slate-950">Thành viên không gian làm việc</h2><p className="text-sm text-slate-500">{memberships.length} thành viên</p></div>
          <ShieldCheck className="size-5 text-emerald-600" />
        </div>
        <div className="divide-y divide-slate-100">
          {memberships.map((membership) => {
            const isSelf = membership.userId === context.user.id;
            const canEdit = !isSelf && (context.membership.role === "owner" || membership.role !== "owner");
            return (
              <form action={updateMemberAction} key={membership.id} className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto] lg:items-center">
                <input type="hidden" name="membershipId" value={membership.id} />
                <div className="min-w-0"><p className="truncate font-bold text-slate-900">{membership.user.displayName || membership.user.email}{isSelf ? " (bạn)" : ""}</p><p className="truncate text-sm text-slate-500">{membership.user.email}</p></div>
                <select className={inputClassName} name="role" defaultValue={membership.role} disabled={!canEdit}>{roles.filter((role) => context.membership.role === "owner" || role !== "owner").map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</select>
                <select className={inputClassName} name="status" defaultValue={membership.status} disabled={!canEdit}>{statuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select>
                {canEdit ? <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50" type="submit">Lưu</button> : <span className="text-right text-xs font-semibold text-slate-400">Được bảo vệ</span>}
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}
