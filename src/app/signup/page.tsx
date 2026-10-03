import Link from "next/link";

import { signupAction } from "@/app/auth/actions";
import { AuthCard, authButtonClassName, authInputClassName } from "@/components/auth/auth-card";

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : undefined;

  return (
    <AuthCard
      title="Kích hoạt lời mời"
      description="Sử dụng đúng địa chỉ email mà quản trị viên BizFlow đã mời."
      error={error}
      footer={
        <>
          Đã kích hoạt tài khoản?{" "}
          <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-700">Đăng nhập</Link>
        </>
      }
    >
      <form action={signupAction} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Họ và tên
          <input className={authInputClassName} name="displayName" autoComplete="name" minLength={2} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Email được mời
          <input className={authInputClassName} name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Mật khẩu
          <input className={authInputClassName} name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <button className={authButtonClassName} type="submit">Tạo tài khoản</button>
      </form>
    </AuthCard>
  );
}
