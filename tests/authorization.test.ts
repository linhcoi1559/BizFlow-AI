import assert from "node:assert/strict";
import test from "node:test";

import type { MembershipRole } from "@prisma/client";

import {
  ALL_MEMBER_ROLES,
  DOCUMENT_REVIEWER_ROLES,
  FINANCE_ROLES,
  MEMBER_ADMIN_ROLES,
  WORKSPACE_EDITOR_ROLES,
  canAssignOrganizationRole,
  canManageMembership,
  hasOrganizationRole,
} from "../src/lib/authorization";

const roles: MembershipRole[] = ["owner", "admin", "manager", "finance", "reviewer", "member"];

test("all active roles can use standard member operations", () => {
  for (const role of roles) assert.equal(hasOrganizationRole(role, ALL_MEMBER_ROLES), true);
});

test("capability role groups follow least privilege", () => {
  assert.deepEqual(WORKSPACE_EDITOR_ROLES, ["owner", "admin", "manager"]);
  assert.deepEqual(DOCUMENT_REVIEWER_ROLES, ["owner", "admin", "reviewer"]);
  assert.deepEqual(FINANCE_ROLES, ["owner", "admin", "finance"]);
  assert.deepEqual(MEMBER_ADMIN_ROLES, ["owner", "admin"]);
});

test("only owners can assign owner role", () => {
  for (const role of roles) {
    assert.equal(canAssignOrganizationRole(role, "owner"), role === "owner");
  }
  assert.equal(canAssignOrganizationRole("admin", "manager"), true);
  assert.equal(canAssignOrganizationRole("manager", "member"), false);
});

test("members cannot modify themselves and admins cannot modify owners", () => {
  assert.equal(
    canManageMembership(
      { userId: "owner-1", role: "owner" },
      { userId: "owner-1", role: "owner" },
    ),
    false,
  );
  assert.equal(
    canManageMembership(
      { userId: "admin-1", role: "admin" },
      { userId: "owner-1", role: "owner" },
    ),
    false,
  );
  assert.equal(
    canManageMembership(
      { userId: "admin-1", role: "admin" },
      { userId: "member-1", role: "member" },
    ),
    true,
  );
});
