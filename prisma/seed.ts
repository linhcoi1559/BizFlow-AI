import {
  ActivityType,
  ClientStatus,
  Prisma,
  PrismaClient,
  ProjectStatus,
} from "@prisma/client";

import { starterTemplates } from "../src/services/documents/template-library";

const prisma = new PrismaClient();

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function main() {
  if (!process.env.DATABASE_URL?.startsWith("file:")) {
    throw new Error("Demo seed chỉ được chạy trên SQLite cục bộ; PostgreSQL/Supabase phải dùng db:bootstrap.");
  }
  await prisma.reminder.deleteMany();
  await prisma.paymentMilestone.deleteMany();
  await prisma.task.deleteMany();
  await prisma.planItem.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.template.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const organization = await prisma.organization.create({
    data: {
      name: "BizFlow Agency Mẫu",
      companyProfile: {
        create: {
          companyName: "BizFlow Marketing Việt Nam",
          taxCode: "0101234567",
          address: "Quận Ba Đình, Hà Nội, Việt Nam",
          representativeName: "Nguyễn Minh",
          representativeTitle: "Giám đốc điều hành",
          email: "hello@bizflow.demo",
          phone: "+84 24 3762 8899",
          website: "https://bizflow.demo",
          bankName: "Vietcombank - Chi nhánh Hà Nội",
          bankAccount: "0011001234567",
        },
      },
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: "minh@bizflow.demo",
      displayName: "Nguyễn Minh",
    },
  });

  await prisma.organizationMembership.create({
    data: {
      organizationId: organization.id,
      userId: demoUser.id,
      role: "owner",
      status: "active",
      joinedAt: new Date(),
    },
  });

  await prisma.template.createMany({
    data: starterTemplates.map((template) => ({
      organizationId: organization.id,
      templateKey: template.templateKey,
      name: template.name,
      description: template.description,
      type: template.type,
      changeNote: "Mẫu khởi đầu",
      content: template.content as Prisma.InputJsonValue,
    })),
  });

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        organizationId: organization.id,
        companyName: "Nova Beauty JSC",
        taxCode: "0109876543",
        address: "Quận Cầu Giấy, Hà Nội, Việt Nam",
        representativeName: "Trần Linh",
        representativeTitle: "Giám đốc Marketing",
        email: "linh.tran@novabeauty.vn",
        phone: "+84 912 345 678",
        website: "https://novabeauty.vn",
        notes: "Khách hàng ngành làm đẹp ưu tiên, tập trung vào marketing hiệu suất.",
        status: ClientStatus.active,
      },
    }),
    prisma.client.create({
      data: {
        organizationId: organization.id,
        companyName: "GreenHub Vietnam",
        taxCode: "0316547890",
        address: "Quận 1, Thành phố Hồ Chí Minh, Việt Nam",
        representativeName: "Phạm Anh",
        representativeTitle: "Đồng sáng lập",
        email: "anh@greenhub.vn",
        phone: "+84 903 220 118",
        website: "https://greenhub.vn",
        status: ClientStatus.active,
      },
    }),
    prisma.client.create({
      data: {
        organizationId: organization.id,
        companyName: "TechVision Solutions",
        taxCode: "0107712345",
        address: "Quận Nam Từ Liêm, Hà Nội, Việt Nam",
        representativeName: "Lê Đức",
        representativeTitle: "Giám đốc Công nghệ",
        email: "duc.le@techvision.io",
        phone: "+84 988 440 221",
        website: "https://techvision.io",
        status: ClientStatus.active,
      },
    }),
    prisma.client.create({
      data: {
        organizationId: organization.id,
        companyName: "Aurora Education",
        taxCode: "0318899001",
        address: "Thành phố Thủ Đức, Thành phố Hồ Chí Minh, Việt Nam",
        representativeName: "Võ Mai",
        representativeTitle: "Trưởng bộ phận Tăng trưởng",
        email: "mai.vo@aurora.edu.vn",
        phone: "+84 907 881 332",
        website: "https://aurora.edu.vn",
        status: ClientStatus.active,
      },
    }),
  ]);

  const [nova, greenHub, techVision, aurora] = clients;

  const projectInputs = [
    {
      client: nova,
      name: "Chiến dịch tăng trưởng TikTok Nova Beauty",
      description:
        "Chương trình quảng cáo TikTok ba tháng, kết hợp thử nghiệm nội dung, tối ưu truyền thông và đánh giá chất lượng khách hàng tiềm năng hằng tuần.",
      serviceType: "Quảng cáo TikTok",
      status: ProjectStatus.active,
      startDate: date("2026-08-01"),
      endDate: date("2026-10-31"),
      totalValue: 90000000,
      ownerName: "Nguyễn Hà",
      progress: 72,
      kpi: "3.000 khách hàng tiềm năng đạt chuẩn",
    },
    {
      client: greenHub,
      name: "Chiến dịch nhận diện thương hiệu GreenHub",
      description:
        "Chiến dịch mạng xã hội tích hợp nhằm tăng độ phủ và khả năng ghi nhớ dòng sản phẩm bền vững của GreenHub.",
      serviceType: "Marketing tích hợp",
      status: ProjectStatus.active,
      startDate: date("2026-09-01"),
      endDate: date("2026-11-15"),
      totalValue: 120000000,
      ownerName: "Nguyễn Hà",
      progress: 38,
      kpi: "5 triệu lượt hiển thị đạt chuẩn",
    },
    {
      client: techVision,
      name: "Thiết kế lại website TechVision",
      description:
        "Chiến lược UX, thiết kế giao diện và triển khai Next.js cho website sản phẩm B2B hiện đại.",
      serviceType: "Thiết kế và phát triển web",
      status: ProjectStatus.planning,
      startDate: date("2026-10-12"),
      endDate: date("2027-01-22"),
      totalValue: 185000000,
      ownerName: "Trần Khoa",
      progress: 18,
      kpi: "Ra mắt với điểm Lighthouse trên 90",
    },
    {
      client: aurora,
      name: "Thu hút khách hàng tiềm năng cho Aurora Education",
      description:
        "Truyền thông trả phí và tối ưu trang đích cho kỳ tuyển sinh mùa thu năm 2026.",
      serviceType: "Thu hút khách hàng tiềm năng",
      status: ProjectStatus.active,
      startDate: date("2026-07-15"),
      endDate: date("2026-10-10"),
      totalValue: 75000000,
      ownerName: "Phạm Nhi",
      progress: 56,
      kpi: "1.200 lượt tư vấn tuyển sinh",
    },
    {
      client: nova,
      name: "Ra mắt mùa hè của Nova Beauty",
      description: "Chiến lược ra mắt và kích hoạt nhà sáng tạo cho dòng chăm sóc da mới.",
      serviceType: "Ra mắt sản phẩm",
      status: ProjectStatus.completed,
      startDate: date("2026-04-01"),
      endDate: date("2026-06-30"),
      totalValue: 68000000,
      ownerName: "Phạm Nhi",
      progress: 100,
      kpi: "2.000 đơn hàng trong quý ra mắt",
    },
    {
      client: greenHub,
      name: "Dịch vụ nội dung định kỳ GreenHub",
      description: "Dịch vụ chiến lược và sản xuất nội dung hằng tháng.",
      serviceType: "Marketing nội dung",
      status: ProjectStatus.draft,
      startDate: date("2026-11-01"),
      endDate: date("2027-01-31"),
      totalValue: 60000000,
      ownerName: "Nguyễn Minh",
      progress: 0,
      kpi: "36 nội dung sẵn sàng đăng tải",
    },
  ];

  const projects = [];
  for (const input of projectInputs) {
    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        clientId: input.client.id,
        name: input.name,
        description: input.description,
        serviceType: input.serviceType,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        totalValue: input.totalValue,
        currency: "VND",
        ownerName: input.ownerName,
        progress: input.progress,
        kpi: input.kpi,
      },
    });
    projects.push(project);
  }

  const activePlan = await prisma.plan.create({
    data: {
      organizationId: organization.id,
      clientId: nova.id,
      projectId: projects[0].id,
      title: "Kế hoạch triển khai chiến dịch TikTok Nova Beauty",
      status: "active",
      notes: "Kế hoạch triển khai đã được duyệt cho chiến dịch đang hoạt động.",
      activatedAt: new Date(Date.UTC(2026, 7, 1, 3, 0, 0)),
      items: {
        create: [
          { title: "Khởi động và thiết lập theo dõi", description: "Xác nhận phạm vi chiến dịch, cách theo dõi, quy trình nội dung và lịch báo cáo hằng tuần.", ownerName: "Nguyễn Hà", startDate: date("2026-08-01"), dueDate: date("2026-08-05"), priority: "high", status: "completed", paymentPercent: 20, position: 1 },
          { title: "Đợt thử nghiệm nội dung", description: "Triển khai và đánh giá ma trận thử nghiệm nội dung đầu tiên trên các nhóm đối tượng ưu tiên.", ownerName: "Phạm Nhi", startDate: date("2026-08-06"), dueDate: date("2026-09-05"), priority: "high", status: "completed", paymentPercent: 40, position: 2 },
          { title: "Tối ưu hiệu suất", description: "Mở rộng các biến thể hiệu quả và cải thiện chất lượng khách hàng tiềm năng qua phản hồi hằng tuần.", ownerName: "Nguyễn Hà", startDate: date("2026-09-06"), dueDate: date("2026-10-10"), priority: "high", status: "active", paymentPercent: 25, position: 3 },
          { title: "Báo cáo và bàn giao cuối cùng", description: "Hoàn tất báo cáo chiến dịch, phiên chia sẻ insight và bàn giao tài sản cuối cùng.", ownerName: "Nguyễn Hà", startDate: date("2026-10-11"), dueDate: date("2026-10-31"), priority: "medium", status: "pending", paymentPercent: 15, position: 4 },
        ],
      },
    },
    include: { items: { orderBy: { position: "asc" } } },
  });

  const seededTasks = [];
  const seededPayments = [];
  const taskStatuses = ["completed", "completed", "in_progress", "todo"] as const;
  const paymentStatuses = ["paid", "paid", "invoiced", "scheduled"] as const;
  for (const [index, item] of activePlan.items.entries()) {
    const task = await prisma.task.create({
      data: {
        organizationId: organization.id,
        clientId: nova.id,
        projectId: projects[0].id,
        planItemId: item.id,
        title: item.title,
        description: item.description,
        ownerName: item.ownerName,
        priority: item.priority,
        status: taskStatuses[index],
        startDate: item.startDate,
        dueDate: item.dueDate,
        completedAt: taskStatuses[index] === "completed" ? item.dueDate : null,
      },
    });
    const payment = await prisma.paymentMilestone.create({
      data: {
        organizationId: organization.id,
        clientId: nova.id,
        projectId: projects[0].id,
        planItemId: item.id,
        referenceNumber: `PAY-2026-NOVA-${index + 1}`,
        title: item.title,
        amount: Number(projects[0].totalValue) * Number(item.paymentPercent) / 100,
        currency: projects[0].currency,
        dueDate: item.dueDate,
        status: paymentStatuses[index],
        invoiceNumber: index < 3 ? `INV-2026-${String(index + 1).padStart(3, "0")}` : null,
        paidAt: paymentStatuses[index] === "paid" ? item.dueDate : null,
      },
    });
    seededTasks.push(task);
    seededPayments.push(payment);
  }

  await prisma.project.update({
    where: { id: projects[0].id },
    data: { progress: 50 },
  });

  await prisma.reminder.createMany({
    data: [
      {
        organizationId: organization.id,
        clientId: nova.id,
        projectId: projects[0].id,
        taskId: seededTasks[2].id,
        type: "task",
        title: "Rà soát tiến độ tối ưu hiệu suất",
        dueAt: new Date(Date.UTC(2026, 9, 8, 9, 0, 0)),
      },
      {
        organizationId: organization.id,
        clientId: nova.id,
        projectId: projects[0].id,
        paymentMilestoneId: seededPayments[2].id,
        type: "payment",
        title: "Theo dõi hóa đơn cột mốc tối ưu",
        dueAt: new Date(Date.UTC(2026, 9, 10, 9, 0, 0)),
      },
    ],
  });

  await prisma.plan.create({
    data: {
      organizationId: organization.id,
      clientId: techVision.id,
      projectId: projects[2].id,
      title: "Kế hoạch triển khai thiết kế lại website TechVision",
      notes: "Bản xem trước có thể chỉnh sửa, đang chờ rà soát và kích hoạt.",
      items: {
        create: [
          { title: "Khám phá và định hướng UX", description: "Xác nhận nhóm người dùng, ưu tiên nội dung, sơ đồ trang và định hướng UX.", ownerName: "Trần Khoa", startDate: date("2026-10-12"), dueDate: date("2026-10-30"), priority: "high", paymentPercent: 20, position: 1 },
          { title: "Thiết kế giao diện", description: "Thiết kế và rà soát các trang đáp ứng cùng hệ thống hình ảnh cốt lõi.", ownerName: "Trần Khoa", startDate: date("2026-10-31"), dueDate: date("2026-11-30"), priority: "high", paymentPercent: 35, position: 2 },
          { title: "Triển khai Next.js", description: "Xây dựng trải nghiệm đã duyệt và kết nối nội dung chính thức.", ownerName: "Trần Khoa", startDate: date("2026-12-01"), dueDate: date("2027-01-10"), priority: "high", paymentPercent: 35, position: 3 },
          { title: "Đảm bảo chất lượng và ra mắt", description: "Hoàn tất QA, kiểm tra hiệu suất, bàn giao và ra mắt chính thức.", ownerName: "Trần Khoa", startDate: date("2027-01-11"), dueDate: date("2027-01-22"), priority: "medium", paymentPercent: 10, position: 4 },
        ],
      },
    },
  });

  const activityData = [
    ...clients.map((client, index) => ({
      organizationId: organization.id,
      clientId: client.id,
      type: ActivityType.client_created,
      message: `Khách hàng ${client.companyName} đã được tạo`,
      createdAt: new Date(Date.UTC(2026, 6, 4 + index * 5, 3, 0, 0)),
    })),
    ...projects.map((project, index) => ({
      organizationId: organization.id,
      projectId: project.id,
      clientId: projectInputs[index].client.id,
      type: ActivityType.project_created,
      message: `Dự án ${project.name} đã được tạo`,
      createdAt: new Date(Date.UTC(2026, 7, 2 + index * 7, 7, 30, 0)),
    })),
    {
      organizationId: organization.id,
      projectId: projects[0].id,
      clientId: nova.id,
      type: ActivityType.project_updated,
      message: "Tiến độ chiến dịch TikTok Nova Beauty đã được cập nhật thành 72%",
      createdAt: new Date(Date.UTC(2026, 8, 29, 9, 15, 0)),
    },
    {
      organizationId: organization.id,
      projectId: projects[3].id,
      clientId: aurora.id,
      type: ActivityType.project_updated,
      message: "Chiến dịch Aurora Education đã bước vào đợt bàn giao cuối cùng",
      createdAt: new Date(Date.UTC(2026, 8, 30, 2, 45, 0)),
    },
    {
      organizationId: organization.id,
      projectId: projects[0].id,
      clientId: nova.id,
      type: ActivityType.plan_activated,
      message: "Kế hoạch triển khai chiến dịch TikTok Nova Beauty đã được kích hoạt với 4 công việc và cột mốc thanh toán",
      createdAt: new Date(Date.UTC(2026, 7, 1, 3, 0, 0)),
    },
    {
      organizationId: organization.id,
      projectId: projects[2].id,
      clientId: techVision.id,
      type: ActivityType.plan_created,
      message: "Kế hoạch thiết kế lại website TechVision đã được tạo ở trạng thái bản nháp có thể chỉnh sửa",
      createdAt: new Date(Date.UTC(2026, 8, 30, 5, 0, 0)),
    },
  ];

  await prisma.activity.createMany({ data: activityData });

  console.log(
    `Đã tạo dữ liệu mẫu cho ${organization.name}: ${clients.length} khách hàng, ${projects.length} dự án, ${starterTemplates.length} mẫu, 2 kế hoạch, 4 công việc, 4 cột mốc thanh toán, 2 lời nhắc và ${activityData.length} hoạt động.`,
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
