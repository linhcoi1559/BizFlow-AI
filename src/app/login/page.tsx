import Link from "next/link";

import { loginAction } from "@/app/auth/actions";
import { AuthCard, authButtonClassName, authInputClassName } from "@/components/auth/auth-card";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : undefined;
  const message = typeof query.message === "string" ? query.message : undefined;
  const next = typeof query.next === "string" && query.next.startsWith("/") ? query.next : "/";

  return (
    <AuthCard
      title="Chào mừng bạn trở lại"
      description="Đăng nhập bằng tài khoản tổ chức để tiếp tục sử dụng BizFlow AI."
      error={error}
      message={message}
      footer={
        <>
          Bạn đã nhận được lời mời?{" "}
          <Link href="/signup" className="font-bold text-indigo-600 hover:text-indigo-700">
            Kích hoạt tài khoản
          </Link>
        </>
      }
    >
      <form action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input className={authInputClassName} name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Mật khẩu
          <input className={authInputClassName} name="password" type="password" autoComplete="current-password" minLength={8} required />
        </label>
        <button className={authButtonClassName} type="submit">Đăng nhập</button>
      </form>
    </AuthCard>
  );
}
