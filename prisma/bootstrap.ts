import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organizationName = process.env.BIZFLOW_ORGANIZATION_NAME?.trim();
  const ownerEmail = process.env.BIZFLOW_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();

  if (!organizationName || !ownerEmail) {
    throw new Error(
      "Hãy đặt BIZFLOW_ORGANIZATION_NAME và BIZFLOW_BOOTSTRAP_OWNER_EMAIL trước khi khởi tạo.",
    );
  }

  const result = await prisma.$transaction(async (transaction) => {
    const organizations = await transaction.organization.findMany({
      where: { name: organizationName },
      take: 2,
    });
    if (organizations.length > 1) {
      throw new Error("Tên tổ chức không duy nhất; không thể xác định workspace khởi tạo an toàn.");
    }
    const existingOrganization = organizations[0];
    if (!existingOrganization && await transaction.organization.count()) {
      throw new Error("Database đã có workspace khác. Hãy kiểm tra BIZFLOW_ORGANIZATION_NAME; bootstrap không tự chọn tổ chức đầu tiên.");
    }
    const organization =
      existingOrganization ??
      (await transaction.organization.create({
        data: {
          name: organizationName,
          companyProfile: { create: { companyName: organizationName } },
        },
      }));
    const user = await transaction.user.upsert({
      where: { email: ownerEmail },
      create: { email: ownerEmail },
      update: {},
    });
    const existingMembership = await transaction.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    });
    if (existingMembership && existingMembership.role !== "owner") {
      throw new Error("Thành viên đã có quyền khác; bootstrap không tự nâng quyền thành chủ sở hữu.");
    }
    const membership = await transaction.organizationMembership.upsert({
      where: {
        organizationId_userId: { organizationId: organization.id, userId: user.id },
      },
      create: {
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
        status: "invited",
      },
      update: {},
    });
    return { organization, membership };
  });

  console.log(
    `Khởi tạo đã sẵn sàng cho ${result.organization.name}. Kích hoạt ${ownerEmail} tại /signup (${result.membership.status}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
