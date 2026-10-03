import type { MembershipRole } from "@prisma/client";

export const WORKSPACE_EDITOR_ROLES: MembershipRole[] = ["owner", "admin", "manager"];
export const DOCUMENT_REVIEWER_ROLES: MembershipRole[] = ["owner", "admin", "reviewer"];
export const FINANCE_ROLES: MembershipRole[] = ["owner", "admin", "finance"];
export const MEMBER_ADMIN_ROLES: MembershipRole[] = ["owner", "admin"];
export const ALL_MEMBER_ROLES: MembershipRole[] = [
  "owner",
  "admin",
  "manager",
  "finance",
  "reviewer",
  "member",
];

export function hasOrganizationRole(
  role: MembershipRole,
  allowedRoles: readonly MembershipRole[],
) {
  return allowedRoles.includes(role);
}

export function canAssignOrganizationRole(
  actorRole: MembershipRole,
  assignedRole: MembershipRole,
) {
  return actorRole === "owner" || (actorRole === "admin" && assignedRole !== "owner");
}

export function canManageMembership(
  actor: { userId: string; role: MembershipRole },
  target: { userId: string; role: MembershipRole },
) {
  if (actor.userId === target.userId) return false;
  if (actor.role === "owner") return true;
  return actor.role === "admin" && target.role !== "owner";
}
