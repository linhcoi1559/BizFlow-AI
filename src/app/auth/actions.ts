"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { safeReturnPath } from "@/lib/safe-return-path";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

const signupSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(2).max(100),
});

function authRedirect(pathname: string, key: "error" | "message", message: string): never {
  const params = new URLSearchParams({ [key]: message });
  redirect(`${pathname}?${params.toString()}`);
}

function signupErrorMessage(error: { message: string }) {
  const message = error.message.toLowerCase();
  if (message.includes("rate limit")) {
    return "Supabase đã đạt giới hạn gửi email. Hãy thử lại sau hoặc tắt xác nhận email trên môi trường thử nghiệm.";
  }
  if (message.includes("already registered") || message.includes("already exists")) {
    return "Email này đã có tài khoản Supabase. Hãy đăng nhập hoặc sử dụng email khác.";
  }
  if (message.includes("not authorized")) {
    return "Supabase chưa cho phép gửi email xác nhận đến địa chỉ này.";
  }
  return "Không thể tạo tài khoản lúc này. Vui lòng kiểm tra cấu hình Supabase và thử lại.";
}

export async function loginAction(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/");

  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    authRedirect("/login", "error", "Nhập email hợp lệ và mật khẩu có ít nhất 8 ký tự.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) authRedirect("/login", "error", "Email hoặc mật khẩu không chính xác.");

  redirect(safeReturnPath(formData.get("next")));
}

export async function signupAction(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/");

  const parsed = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    authRedirect("/signup", "error", "Kiểm tra lại họ tên, email và mật khẩu trước khi tiếp tục.");
  }

  const invitedUser = await prisma.user.findFirst({
    where: {
      email: parsed.data.email,
      memberships: { some: { status: "invited" } },
    },
    select: { id: true },
  });
  if (!invitedUser) {
    authRedirect("/signup", "error", "Không tìm thấy lời mời BizFlow đang hoạt động cho email này.");
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.displayName },
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });

  if (error) authRedirect("/signup", "error", signupErrorMessage(error));
  if (data.session) redirect("/");
  authRedirect("/login", "message", "Kiểm tra hộp thư để xác nhận tài khoản, sau đó đăng nhập.");
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
