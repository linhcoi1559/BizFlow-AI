import "server-only";

import type { Project } from "@prisma/client";

import type { DocumentContent } from "@/services/documents/schemas";

export type DefaultPlanItem = {
  title: string;
  description: string;
  ownerName: string | null;
  startDate: Date;
  dueDate: Date;
  priority: "medium" | "high";
  paymentPercent: number;
};

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function dateAtProgress(start: Date, end: Date, progress: number) {
  return new Date(start.getTime() + (end.getTime() - start.getTime()) * progress);
}

function sectionBody(content: DocumentContent | null, key: string, fallback: string) {
  return content?.sections.find((section) => section.key === key)?.body || fallback;
}

export function buildDefaultPlan(project: Project, approvedContent: DocumentContent | null) {
  const startDate = project.startDate ? new Date(project.startDate) : new Date();
  const fallbackDays = Math.max(30, (project.durationMonths || 1) * 30);
  const endDate = project.endDate ? new Date(project.endDate) : addDays(startDate, fallbackDays);
  const kickoffDue = dateAtProgress(startDate, endDate, 0.1);
  const deliveryDue = dateAtProgress(startDate, endDate, 0.55);
  const reviewDue = dateAtProgress(startDate, endDate, 0.82);

  const items: DefaultPlanItem[] = [
    {
      title: "Khởi động và thống nhất",
      description: "Xác nhận phạm vi, trách nhiệm, nhịp phối hợp, các phụ thuộc và tiêu chí nghiệm thu với tất cả bên liên quan.",
      ownerName: project.ownerName,
      startDate,
      dueDate: kickoffDue,
      priority: "high",
      paymentPercent: 20,
    },
    {
      title: "Triển khai chính",
      description: sectionBody(
        approvedContent,
        "scope",
        project.description || `Triển khai phạm vi ${project.serviceType || "dự án"} đã thống nhất.`,
      ),
      ownerName: project.ownerName,
      startDate: kickoffDue,
      dueDate: deliveryDue,
      priority: "high",
      paymentPercent: 40,
    },
    {
      title: "Rà soát và tối ưu",
      description: sectionBody(
        approvedContent,
        "kpi",
        project.kpi || "Đối chiếu sản phẩm bàn giao với kết quả đã thống nhất và hoàn tất các chỉnh sửa cần thiết.",
      ),
      ownerName: project.ownerName,
      startDate: deliveryDue,
      dueDate: reviewDue,
      priority: "medium",
      paymentPercent: 25,
    },
    {
      title: "Bàn giao và nghiệm thu cuối cùng",
      description: "Hoàn tất bàn giao, xác nhận nghiệm thu, xử lý các công việc còn lại và ghi nhận nội dung bàn giao.",
      ownerName: project.ownerName,
      startDate: reviewDue,
      dueDate: endDate,
      priority: "high",
      paymentPercent: 15,
    },
  ];

  return {
    title: `Kế hoạch triển khai ${project.name}`,
    notes: approvedContent
      ? "Bản nháp được tạo từ tài liệu đã duyệt và tiến độ dự án hiện tại. Hãy kiểm tra từng cột mốc trước khi kích hoạt."
      : "Bản nháp được tạo từ mô tả và tiến độ dự án hiện tại. Hãy kiểm tra từng cột mốc trước khi kích hoạt.",
    items,
  };
}
