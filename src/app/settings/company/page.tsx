import { Building2, FileText, ShieldCheck } from "lucide-react";

import { CompanyProfileForm } from "@/components/settings/company-profile-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MEMBER_ADMIN_ROLES, requireOrganizationRole } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Cài đặt công ty" };

export default async function CompanySettingsPage() {
  const { organization } = await requireOrganizationRole(MEMBER_ADMIN_ROLES);
  const profile = await prisma.companyProfile.findUnique({
    where: { organizationId: organization.id },
  });

  const values = profile ?? {
    companyName: organization.name,
    taxCode: null,
    address: null,
    representativeName: null,
    representativeTitle: null,
    email: null,
    phone: null,
    website: null,
    bankName: null,
    bankAccount: null,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cài đặt"
        title="Hồ sơ công ty"
        description="Quản lý thông tin pháp lý và thanh toán dùng trong đề xuất, hợp đồng và hóa đơn."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-5 sm:p-7">
          <CompanyProfileForm values={values} />
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="size-5" />
            </div>
            <h2 className="mt-4 text-sm font-bold text-slate-900">Một nguồn dữ liệu chuẩn</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Giữ hồ sơ chính xác để các tài liệu kinh doanh luôn sử dụng thông tin công ty nhất quán.
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Bảo vệ theo tổ chức</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Tư cách thành viên và kiểm tra vai trò phía máy chủ bảo vệ mọi thay đổi dữ liệu.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex gap-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-violet-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Sẵn sàng tạo tài liệu</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Cấu trúc dữ liệu tách biệt thông tin tổ chức với hồ sơ khách hàng và dự án.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
