"use server";

import type { MembershipRole, MembershipStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  canAssignOrganizationRole,
  canManageMembership,
} from "@/lib/authorization";
import { MEMBER_ADMIN_ROLES, requireOrganizationRole } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

const roleSchema = z.enum(["owner", "admin", "manager", "finance", "reviewer", "member"]);
const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().max(100).optional(),
  role: roleSchema,
});
const updateSchema = z.object({
  membershipId: z.string().min(1),
  role: roleSchema,
  status: z.enum(["invited", "active", "suspended"]),
});

function membersRedirect(key: "error" | "message", message: string): never {
  const params = new URLSearchParams({ [key]: message });
  redirect(`/settings/members?${params.toString()}`);
}

export async function inviteMemberAction(formData: FormData) {
  const context = await requireOrganizationRole(MEMBER_ADMIN_ROLES);
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName") || undefined,
    role: formData.get("role"),
  });
  if (!parsed.success) membersRedirect("error", "Nhập họ tên, email và vai trò hợp lệ.");
  if (!canAssignOrganizationRole(context.membership.role, parsed.data.role)) {
    membersRedirect("error", "Chỉ chủ sở hữu mới có thể mời một chủ sở hữu khác.");
  }

  const existingMembership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: context.organization.id,
      user: { email: parsed.data.email },
    },
    select: { id: true, userId: true, role: true, status: true },
  });
  if (existingMembership && !canManageMembership(
    { userId: context.user.id, role: context.membership.role },
    { userId: existingMembership.userId, role: existingMembership.role },
  )) {
    membersRedirect("error", "Bạn không thể mời lại hoặc thay đổi quyền của thành viên này.");
  }
  if (existingMembership && existingMembership.status !== "suspended") {
    membersRedirect("error", "Email này đã là thành viên hoặc đang có lời mời chờ xử lý.");
  }

  await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.upsert({
      where: { email: parsed.data.email },
      create: {
        email: parsed.data.email,
        displayName: parsed.data.displayName || null,
      },
      update: parsed.data.displayName ? { displayName: parsed.data.displayName } : {},
    });
    await transaction.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: context.organization.id,
          userId: user.id,
        },
      },
      create: {
        organizationId: context.organization.id,
        userId: user.id,
        role: parsed.data.role,
        status: "invited",
      },
      update: {
        role: parsed.data.role,
        status: "invited",
        joinedAt: null,
      },
    });
  });

  revalidatePath("/settings/members");
  membersRedirect("message", "Đã tạo lời mời. Thành viên mới kích hoạt tại trang đăng ký; người đã có tài khoản hãy đăng nhập.");
}

export async function updateMemberAction(formData: FormData) {
  const context = await requireOrganizationRole(MEMBER_ADMIN_ROLES);
  const parsed = updateSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
    status: formData.get("status"),
  });
  if (!parsed.success) membersRedirect("error", "Chọn vai trò và trạng thái thành viên hợp lệ.");

  const target = await prisma.organizationMembership.findFirst({
    where: { id: parsed.data.membershipId, organizationId: context.organization.id },
    include: { user: true },
  });
  if (!target) membersRedirect("error", "Tư cách thành viên đã chọn không còn tồn tại.");
  if (!canManageMembership(
    { userId: context.user.id, role: context.membership.role },
    { userId: target.userId, role: target.role },
  )) {
    membersRedirect("error", "Bạn không thể chỉnh sửa thành viên này.");
  }
  if (!canAssignOrganizationRole(context.membership.role, parsed.data.role)) {
    membersRedirect("error", "Chỉ chủ sở hữu mới có thể gán vai trò chủ sở hữu.");
  }

  await prisma.organizationMembership.update({
    where: { id: target.id },
    data: {
      role: parsed.data.role as MembershipRole,
      status: parsed.data.status as MembershipStatus,
      joinedAt:
        parsed.data.status === "active" ? target.joinedAt ?? new Date() : target.joinedAt,
    },
  });

  revalidatePath("/settings/members");
  membersRedirect("message", "Đã cập nhật quyền truy cập của thành viên.");
}
