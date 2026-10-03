import type { DocumentTypeValue, TemplateContent } from "@/services/documents/schemas";

export type StarterTemplate = {
  templateKey: string;
  name: string;
  description: string;
  type: DocumentTypeValue;
  content: TemplateContent;
};

export const starterTemplates: StarterTemplate[] = [
  {
    templateKey: "standard-proposal",
    name: "Đề xuất dịch vụ tiêu chuẩn",
    description: "Mẫu đề xuất thương mại ngắn gọn cho dịch vụ tư vấn và agency.",
    type: "proposal",
    content: {
      titlePattern: "Đề xuất cho dự án {{project.name}}",
      sections: [
        {
          key: "summary",
          heading: "Tổng quan dự án",
          body: "{{company.name}} đề xuất cung cấp dịch vụ {{project.serviceType}} cho {{client.companyName}}. Tài liệu này tóm tắt mục tiêu kinh doanh, phạm vi triển khai, tiến độ và điều khoản thương mại của dự án {{project.name}}.",
        },
        {
          key: "scope",
          heading: "Phạm vi và sản phẩm bàn giao",
          body: "Phạm vi công việc gồm: {{project.description}}\n\nDịch vụ chính: {{project.serviceType}}. Nhóm triển khai sẽ xác nhận chi tiết sản phẩm bàn giao, tiêu chí nghiệm thu và các phụ thuộc trong buổi khởi động dự án.",
        },
        {
          key: "timeline",
          heading: "Tiến độ",
          body: "Ngày bắt đầu dự kiến: {{project.startDate}}. Ngày hoàn thành dự kiến: {{project.endDate}}. Thời lượng ước tính: {{project.duration}}.",
        },
        {
          key: "kpi",
          heading: "Chỉ số thành công",
          body: "KPI chính của dự án là {{project.kpi}}. Cách đo lường và tần suất báo cáo sẽ được thống nhất trong buổi khởi động.",
        },
        {
          key: "legal",
          heading: "Điều kiện đề xuất",
          body: "Đề xuất này có hiệu lực sau khi hai bên xác nhận phạm vi cuối cùng và người đại diện có thẩm quyền ký thỏa thuận dịch vụ.",
        },
      ],
      paymentTerms: "Phí dịch vụ được xuất hóa đơn theo tiến độ dự án đã thống nhất. Thanh toán đến hạn trong vòng 15 ngày kể từ ngày nhận hóa đơn hợp lệ, trừ khi có thỏa thuận khác bằng văn bản.",
      notes: "Đề xuất có hiệu lực trong 30 ngày kể từ ngày phát hành.",
    },
  },
  {
    templateKey: "standard-quotation",
    name: "Báo giá tiêu chuẩn",
    description: "Mẫu báo giá rõ ràng gồm giá dự án, thời hạn hiệu lực và điều khoản thanh toán.",
    type: "quotation",
    content: {
      titlePattern: "Báo giá dự án {{project.name}}",
      sections: [
        {
          key: "summary",
          heading: "Tóm tắt báo giá",
          body: "{{company.name}} trân trọng gửi {{client.companyName}} báo giá dịch vụ {{project.serviceType}}.",
        },
        {
          key: "scope",
          heading: "Mô tả dịch vụ",
          body: "{{project.description}}",
        },
        {
          key: "timeline",
          heading: "Thời gian triển khai",
          body: "Thời gian cung cấp dịch vụ dự kiến: từ {{project.startDate}} đến {{project.endDate}} ({{project.duration}}).",
        },
        {
          key: "kpi",
          heading: "Kết quả dự kiến",
          body: "{{project.kpi}}",
        },
        {
          key: "legal",
          heading: "Điều kiện báo giá",
          body: "Giá chưa bao gồm thuế, trừ khi được nêu rõ. Công việc bắt đầu sau khi có xác nhận bằng văn bản và nhận đủ khoản tạm ứng theo yêu cầu.",
        },
      ],
      paymentTerms: "Lịch thanh toán: 50% khi chấp thuận và 50% khi hoàn thành, trừ khi hai bên xác nhận lịch khác bằng văn bản.",
      notes: "Báo giá có hiệu lực trong 30 ngày kể từ ngày phát hành.",
    },
  },
  {
    templateKey: "standard-service-contract",
    name: "Hợp đồng dịch vụ tiêu chuẩn",
    description: "Bản dự thảo thỏa thuận dịch vụ để rà soát trước khi ký chính thức.",
    type: "contract",
    content: {
      titlePattern: "Hợp đồng dịch vụ cho dự án {{project.name}}",
      sections: [
        {
          key: "summary",
          heading: "Các bên và mục đích",
          body: "Hợp đồng dịch vụ này được ký giữa {{company.name}}, đại diện bởi {{company.representative}}, và {{client.companyName}}, đại diện bởi {{client.representative}}, để cung cấp dịch vụ {{project.serviceType}} thuộc dự án {{project.name}}.",
        },
        {
          key: "scope",
          heading: "Dịch vụ và trách nhiệm",
          body: "Bên cung cấp dịch vụ thực hiện phạm vi sau: {{project.description}}\n\nMỗi bên có trách nhiệm cung cấp kịp thời thông tin, phê duyệt, quyền truy cập và sự phối hợp hợp lý cần thiết cho việc triển khai.",
        },
        {
          key: "timeline",
          heading: "Thời hạn và tiến độ",
          body: "Thời hạn dự kiến bắt đầu từ {{project.startDate}} và kết thúc vào {{project.endDate}}, với thời lượng ước tính {{project.duration}}.",
        },
        {
          key: "kpi",
          heading: "Hiệu quả và nghiệm thu",
          body: "Kết quả mục tiêu: {{project.kpi}}. Trừ khi có thỏa thuận khác, KPI là cơ sở đánh giá hiệu quả và không cấu thành cam kết bảo đảm kết quả thương mại.",
        },
        {
          key: "legal",
          heading: "Điều khoản chung",
          body: "Hai bên bảo vệ thông tin mật, tuân thủ pháp luật hiện hành và xác nhận bằng văn bản mọi thay đổi đáng kể về phạm vi. Các điều khoản về trách nhiệm, chấm dứt, sở hữu trí tuệ và giải quyết tranh chấp phải được hai bên rà soát trước khi ký.",
        },
      ],
      paymentTerms: "Khách hàng thanh toán các khoản phí nêu trong hợp đồng theo lịch xuất hóa đơn đã thống nhất. Hóa đơn quá hạn hoặc có tranh chấp được xử lý theo điều khoản cuối cùng đã ký.",
      notes: "Bản dự thảo phục vụ rà soát nghiệp vụ. Cần được tư vấn pháp lý phù hợp trước khi ký.",
    },
  },
];
