import { SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-center">
      <div>
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <SearchX className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold text-slate-950">Không tìm thấy dữ liệu</h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Khách hàng, dự án hoặc trang này không tồn tại trong không gian làm việc hiện tại.
        </p>
        <Link href="/" className={buttonVariants({ className: "mt-5" })}>Về trang tổng quan</Link>
      </div>
    </div>
  );
}
