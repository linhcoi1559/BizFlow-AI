import { ShieldX } from "lucide-react";

import { signOutAction } from "@/app/auth/actions";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <ShieldX className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-950">Cần quyền truy cập không gian làm việc</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Tài khoản đã được xác thực nhưng chưa có tư cách thành viên đang hoạt động trong tổ chức BizFlow. Hãy nhờ chủ sở hữu hoặc quản trị viên mời email này.
        </p>
        <form action={signOutAction} className="mt-6">
          <button className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800" type="submit">
            Đăng xuất
          </button>
        </form>
      </section>
    </main>
  );
}
