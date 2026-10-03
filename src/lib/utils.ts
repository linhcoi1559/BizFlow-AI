import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | string | { toString(): string },
  currency = "VND",
) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(Number(value));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Chưa thiết lập";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function dateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function titleCase(value: string) {
  const labels: Record<string, string> = {
    active: "Đang hoạt động",
    admin: "Quản trị viên",
    approved: "Đã phê duyệt",
    archived: "Đã lưu trữ",
    blocked: "Bị chặn",
    cancelled: "Đã hủy",
    completed: "Hoàn thành",
    contract: "Hợp đồng",
    dismissed: "Đã bỏ qua",
    draft: "Bản nháp",
    finance: "Tài chính",
    general: "Chung",
    high: "Cao",
    inactive: "Không hoạt động",
    in_progress: "Đang thực hiện",
    in_review: "Đang duyệt",
    invoiced: "Đã xuất hóa đơn",
    invited: "Đã mời",
    low: "Thấp",
    manager: "Quản lý",
    manual: "Thủ công",
    member: "Thành viên",
    medium: "Trung bình",
    milestone: "Cột mốc",
    open: "Đang mở",
    other: "Khác",
    overdue: "Quá hạn",
    owner: "Chủ sở hữu",
    paid: "Đã thanh toán",
    paused: "Tạm dừng",
    payment: "Thanh toán",
    pending: "Đang chờ",
    planning: "Đang lập kế hoạch",
    proposal: "Đề xuất",
    quotation: "Báo giá",
    reviewer: "Người duyệt",
    scheduled: "Đã lên lịch",
    suspended: "Tạm khóa",
    task: "Công việc",
    todo: "Cần làm",
    urgent: "Khẩn cấp",
    waived: "Đã miễn",
  };

  if (labels[value]) return labels[value];

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
