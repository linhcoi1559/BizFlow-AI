"use client";

import {
  Bell,
  BellRing,
  Blocks,
  Building2,
  CheckSquare2,
  ChevronDown,
  CircleDollarSign,
  FileStack,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { signOutAction } from "@/app/auth/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn, titleCase } from "@/lib/utils";

export type AppShellViewer = {
  displayName: string | null;
  email: string;
  role: string | null;
  organizationName: string | null;
  mode: "demo" | "supabase";
};

const navigation = [
  { label: "Tổng quan", href: "/", icon: LayoutDashboard },
  { label: "Không gian AI", href: "/ai-workspace", icon: Sparkles },
  {
    label: "Tạo hợp đồng AI",
    href: "/contracts/new",
    icon: FileStack,
    editorOnly: true,
  },
  {
    label: "Kết nối AI",
    href: "/settings/ai",
    icon: Sparkles,
    editorOnly: true,
  },
  { label: "Khách hàng", href: "/clients", icon: Building2 },
  { label: "Dự án", href: "/projects", icon: FolderKanban },
  { label: "Tài liệu", href: "/documents", icon: FileStack },
  { label: "Mẫu tài liệu", href: "/templates", icon: Blocks },
  { label: "Công việc", href: "/tasks", icon: CheckSquare2 },
  { label: "Thanh toán", href: "/payments", icon: CircleDollarSign },
  { label: "Nhắc việc", href: "/reminders", icon: BellRing },
  {
    label: "Cài đặt",
    href: "/settings/company",
    icon: Settings,
    adminOnly: true,
  },
  {
    label: "Thành viên",
    href: "/settings/members",
    icon: UsersRound,
    adminOnly: true,
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function pageTitle(pathname: string) {
  if (pathname === "/") return "Tổng quan";
  if (pathname === "/clients/new") return "Khách hàng mới";
  if (/^\/clients\/[^/]+\/edit$/.test(pathname)) return "Chỉnh sửa khách hàng";
  if (/^\/clients\/[^/]+$/.test(pathname)) return "Chi tiết khách hàng";
  if (pathname === "/projects/new") return "Dự án mới";
  if (/^\/projects\/[^/]+\/edit$/.test(pathname)) return "Chỉnh sửa dự án";
  if (/^\/projects\/[^/]+$/.test(pathname)) return "Chi tiết dự án";
  if (pathname === "/settings/ai") return "Kết nối AI";
  if (pathname === "/contracts/new") return "Tạo hợp đồng AI";
  if (pathname === "/settings/company") return "Cài đặt công ty";
  if (pathname === "/settings/members") return "Thành viên tổ chức";
  if (pathname === "/ai-workspace") return "Không gian AI";
  if (pathname === "/search") return "Tìm kiếm";
  if (pathname === "/activity") return "Hoạt động";
  return (
    pathname.split("/").filter(Boolean)[0]?.replaceAll("-", " ") ?? "BizFlow AI"
  );
}

function SidebarContent({
  pathname,
  viewer,
  close,
}: {
  pathname: string;
  viewer: AppShellViewer | null;
  close?: () => void;
}) {
  const canEdit = ["owner", "admin", "manager"].includes(viewer?.role || "");
  const canAdminister = viewer?.role === "owner" || viewer?.role === "admin";

  return (
    <>
      <div className="flex h-18 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-950/30">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-[15px] font-extrabold tracking-wide text-white">
            BIZFLOW AI
          </p>
          <p className="text-[11px] font-medium text-slate-400">
            Vận hành doanh nghiệp thông minh.
          </p>
        </div>
      </div>
      <nav
        className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
        aria-label="Điều hướng chính"
      >
        {navigation
          .filter(
            (item) =>
              (!item.adminOnly || canAdminister) &&
              (!item.editorOnly || canEdit),
          )
          .map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                )}
              >
                <item.icon
                  className="size-[18px] shrink-0"
                  aria-hidden="true"
                />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span className="size-2 rounded-full bg-emerald-400" />
            {viewer?.mode === "supabase"
              ? "Không gian bảo mật"
              : "Không gian demo"}
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">
            {viewer?.organizationName ?? "BizFlow AI"}
          </p>
        </div>
      </div>
    </>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppShell({
  children,
  viewer,
}: {
  children: ReactNode;
  viewer: AppShellViewer | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const publicPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/access-denied" ||
    pathname === "/configuration-error";
  const displayName =
    viewer?.displayName || viewer?.email || "Người dùng BizFlow";
  const canManageWorkspace = ["owner", "admin", "manager"].includes(
    viewer?.role ?? "",
  );
  const canAdminister = viewer?.role === "owner" || viewer?.role === "admin";

  if (publicPage) return children;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#111827] lg:flex">
        <SidebarContent pathname={pathname} viewer={viewer} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/45"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-[#111827] shadow-2xl">
            <button
              className="absolute right-3 top-4 z-10 flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
            >
              <X className="size-5" />
            </button>
            <SidebarContent
              pathname={pathname}
              viewer={viewer}
              close={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-18 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            className="mr-3 flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <Menu className="size-5" />
          </button>
          <p className="hidden min-w-36 text-sm font-bold capitalize text-slate-900 sm:block">
            {pageTitle(pathname)}
          </p>
          <form
            action="/search"
            method="get"
            className="mx-auto w-full max-w-md sm:px-5"
          >
            <label className="relative block">
              <span className="sr-only">Tìm khách hàng và dự án</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                type="search"
                placeholder="Tìm khách hàng và dự án…"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-12 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 md:block">
                ↵
              </kbd>
            </label>
          </form>
          <div className="ml-3 flex items-center gap-1.5">
            {canManageWorkspace ? (
              <Link
                href="/projects/new"
                className={buttonVariants({
                  size: "sm",
                  className: "hidden sm:inline-flex",
                })}
              >
                <Plus className="size-4" /> Tạo mới
              </Link>
            ) : null}
            <Link
              href="/activity"
              className="relative flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Xem hoạt động"
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-indigo-500 ring-2 ring-white" />
            </Link>
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg p-1 hover:bg-slate-100">
                <span className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                  {initials(displayName) || "BU"}
                </span>
                <ChevronDown className="hidden size-3.5 text-slate-400 sm:block" />
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {displayName}
                  </p>
                  <p className="truncate text-xs capitalize text-slate-500">
                    {viewer?.role
                      ? titleCase(viewer.role)
                      : "Thành viên không gian làm việc"}
                  </p>
                </div>
                {canAdminister ? (
                  <Link
                    href="/settings/company"
                    className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <UserRound className="size-4" /> Hồ sơ công ty
                  </Link>
                ) : null}
                {viewer?.mode === "supabase" ? (
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <LogOut className="size-4" /> Đăng xuất
                    </button>
                  </form>
                ) : null}
              </div>
            </details>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
