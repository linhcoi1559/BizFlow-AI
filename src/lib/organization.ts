import "server-only";

import type { MembershipRole, Organization, User } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";

import { resolveAuthMode } from "@/lib/auth-mode";
import {
  ALL_MEMBER_ROLES,
  DOCUMENT_REVIEWER_ROLES,
  FINANCE_ROLES,
  MEMBER_ADMIN_ROLES,
  WORKSPACE_EDITOR_ROLES,
  hasOrganizationRole,
} from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export {
  ALL_MEMBER_ROLES,
  DOCUMENT_REVIEWER_ROLES,
  FINANCE_ROLES,
  MEMBER_ADMIN_ROLES,
  WORKSPACE_EDITOR_ROLES,
};

type MembershipView = {
  id: string;
  role: MembershipRole;
  organization: Organization;
};

export type CurrentViewer = {
  mode: "demo" | "supabase";
  user: Pick<User, "id" | "email" | "displayName">;
  membership: MembershipView | null;
};

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function claimDisplayName(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const values = metadata as Record<string, unknown>;
  for (const key of ["full_name", "name", "display_name"]) {
    if (typeof values[key] === "string" && values[key].trim()) {
      return values[key].trim();
    }
  }
  return null;
}

async function getDemoViewer(): Promise<CurrentViewer | null> {
  const organization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      memberships: {
        where: { status: "active" },
        orderBy: { createdAt: "asc" },
        take: 1,
        include: { user: true },
      },
    },
  });
  if (!organization) {
    throw new Error(
      "Chưa có tổ chức dùng thử. Hãy chạy `npm run db:seed` trước khi dùng chế độ dùng thử.",
    );
  }

  const [membership] = organization.memberships;
  if (!membership) {
    throw new Error(
      "Tổ chức dùng thử không có thành viên hoạt động. Hãy chạy `npm run db:seed` để khôi phục.",
    );
  }

  return {
    mode: "demo",
    user: membership.user,
    membership: {
      id: membership.id,
      role: membership.role,
      organization,
    },
  };
}

async function linkInvitedUser(authUserId: string, email: string, displayName: string | null) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({ where: { email } });
    if (!user || (user.authUserId && user.authUserId !== authUserId)) return null;

    const linkedUser = await transaction.user.update({
      where: { id: user.id },
      data: {
        authUserId,
        displayName: user.displayName ?? displayName,
      },
    });
    await transaction.organizationMembership.updateMany({
      where: { userId: user.id, status: "invited" },
      data: { status: "active", joinedAt: new Date() },
    });
    return linkedUser;
  });
}

export const getOptionalViewer = cache(async (): Promise<CurrentViewer | null> => {
  if (resolveAuthMode() === "demo") return getDemoViewer();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const authUserId = data?.claims.sub;
  const rawEmail = data?.claims.email;
  if (error || !authUserId || typeof rawEmail !== "string") return null;

  const email = normalizedEmail(rawEmail);
  const displayName = claimDisplayName(data.claims.user_metadata);
  let user = await prisma.user.findUnique({ where: { authUserId } });
  if (user && normalizedEmail(user.email) === email) {
    await prisma.organizationMembership.updateMany({
      where: { userId: user.id, status: "invited" },
      data: { status: "active", joinedAt: new Date() },
    });
  }
  user ??= await linkInvitedUser(authUserId, email, displayName);

  if (!user) {
    return {
      mode: "supabase",
      user: { id: authUserId, email, displayName },
      membership: null,
    };
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: { userId: user.id, status: "active" },
    orderBy: { createdAt: "asc" },
    include: { organization: true },
  });

  return {
    mode: "supabase",
    user,
    membership: membership
      ? {
          id: membership.id,
          role: membership.role,
          organization: membership.organization,
        }
      : null,
  };
});

export const getCurrentOrganizationContext = cache(async () => {
  const viewer = await getOptionalViewer();
  if (!viewer) redirect("/login");
  if (!viewer.membership) redirect("/access-denied");

  return {
    mode: viewer.mode,
    user: viewer.user,
    membership: viewer.membership,
    organization: viewer.membership.organization,
  };
});

export const getCurrentOrganization = cache(async () => {
  const context = await getCurrentOrganizationContext();
  return context.organization;
});

export async function requireOrganizationRole(allowedRoles: MembershipRole[]) {
  const context = await getCurrentOrganizationContext();
  if (!hasOrganizationRole(context.membership.role, allowedRoles)) redirect("/access-denied");
  return context;
}
