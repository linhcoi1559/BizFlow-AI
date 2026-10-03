import assert from "node:assert/strict";
import test from "node:test";

import { AuthConfigurationError, resolveAuthMode } from "../src/lib/auth-mode";
import { getSupabasePublicConfig } from "../src/lib/supabase/config";

test("development defaults to demo mode without Supabase", () => {
  assert.equal(resolveAuthMode({ NODE_ENV: "development" }), "demo");
});

test("production requires explicit demo mode or complete Supabase config", () => {
  assert.throws(
    () => resolveAuthMode({ NODE_ENV: "production" }),
    AuthConfigurationError,
  );
  assert.equal(
    resolveAuthMode({ NODE_ENV: "production", BIZFLOW_DEMO_MODE: "true" }),
    "demo",
  );
});

test("complete Supabase public config enables authenticated mode", () => {
  const environment = {
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  };
  assert.equal(resolveAuthMode(environment), "supabase");
  assert.deepEqual(getSupabasePublicConfig(environment), {
    url: environment.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
});

test("partial or ambiguous auth configuration fails closed", () => {
  assert.throws(
    () =>
      resolveAuthMode({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      }),
    AuthConfigurationError,
  );
  assert.throws(
    () =>
      resolveAuthMode({
        NODE_ENV: "production",
        BIZFLOW_DEMO_MODE: "true",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    AuthConfigurationError,
  );
});
