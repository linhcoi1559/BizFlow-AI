import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type AuthMode = "demo" | "supabase";

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

type AuthEnvironment = {
  NODE_ENV?: string;
  BIZFLOW_DEMO_MODE?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export function resolveAuthMode(
  environment: AuthEnvironment = process.env,
): AuthMode {
  let supabaseConfigured = false;
  try {
    supabaseConfigured = Boolean(getSupabasePublicConfig(environment));
  } catch (error) {
    throw new AuthConfigurationError(
      error instanceof Error ? error.message : "Xác thực Supabase được cấu hình không đúng.",
    );
  }

  const demoMode = environment.BIZFLOW_DEMO_MODE?.trim().toLowerCase() === "true";
  if (supabaseConfigured && demoMode) {
    throw new AuthConfigurationError(
      "Chỉ chọn xác thực Supabase hoặc BIZFLOW_DEMO_MODE=true, không bật đồng thời cả hai.",
    );
  }
  if (supabaseConfigured) return "supabase";
  if (demoMode || environment.NODE_ENV !== "production") return "demo";

  throw new AuthConfigurationError(
    "Chưa cấu hình xác thực. Hãy đặt đủ hai biến công khai Supabase hoặc bật rõ BIZFLOW_DEMO_MODE=true cho bản triển khai dùng thử không dành cho khách hàng.",
  );
}
