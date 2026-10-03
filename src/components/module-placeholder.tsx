import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function ModulePlaceholder({
  eyebrow = "Sắp ra mắt",
  title,
  description,
  icon: Icon,
  features,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  action?: { href: string; label: string };
}) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Card className="overflow-hidden">
        <div className="grid min-h-[430px] items-center gap-10 p-7 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:p-14">
          <div>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Icon className="size-7" />
            </div>
            <h2 className="mt-6 text-xl font-extrabold tracking-tight text-slate-950">
              Được thiết kế cho giai đoạn tiếp theo
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Trang này đã có trong cấu trúc sản phẩm nhưng chưa giả lập các quy trình máy chủ chưa được triển khai.
            </p>
            {action ? (
              <Link href={action.href} className={buttonVariants({ className: "mt-6" })}>
                {action.label}
              </Link>
            ) : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Chức năng dự kiến
            </p>
            <ul className="mt-5 space-y-4">
              {features.map((feature, index) => (
                <li key={feature} className="flex gap-3 text-sm font-medium text-slate-700">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600 ring-1 ring-slate-200">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
