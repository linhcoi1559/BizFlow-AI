import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AuthConfigurationError, resolveAuthMode } from "@/lib/auth-mode";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

const publicPaths = ["/login", "/signup", "/access-denied", "/configuration-error"];

function isPublicPath(pathname: string) {
  return publicPaths.includes(pathname) || pathname.startsWith("/auth/");
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function proxy(request: NextRequest) {
  let authMode;
  try {
    authMode = resolveAuthMode();
  } catch (error) {
    if (!(error instanceof AuthConfigurationError)) throw error;
    if (request.nextUrl.pathname === "/configuration-error") {
      return NextResponse.next({ request });
    }
    const configurationUrl = request.nextUrl.clone();
    configurationUrl.pathname = "/configuration-error";
    configurationUrl.search = "";
    return NextResponse.redirect(configurationUrl);
  }

  if (authMode === "demo") return NextResponse.next({ request });
  if (request.nextUrl.pathname === "/configuration-error") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  const { authenticated, response } = await refreshSupabaseSession(request);
  const pathname = request.nextUrl.pathname;

  if (!authenticated && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  if (authenticated && (pathname === "/login" || pathname === "/signup")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return copyCookies(response, NextResponse.redirect(homeUrl));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
