import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { AuthConfigurationError } from "@/lib/auth-mode";
import { getOptionalViewer } from "@/lib/organization";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BizFlow AI",
    template: "%s | BizFlow AI",
  },
  description:
    "Quản lý khách hàng, dự án, tài liệu và quy trình công việc tích hợp AI cho doanh nghiệp dịch vụ.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let viewer = null;
  try {
    viewer = await getOptionalViewer();
  } catch (error) {
    if (!(error instanceof AuthConfigurationError)) throw error;
  }
  const shellViewer = viewer
    ? {
        displayName: viewer.user.displayName,
        email: viewer.user.email,
        role: viewer.membership?.role ?? null,
        organizationName: viewer.membership?.organization.name ?? null,
        mode: viewer.mode,
      }
    : null;

  return (
    <html lang="vi">
      <body>
        <AppShell viewer={shellViewer}>{children}</AppShell>
      </body>
    </html>
  );
}
