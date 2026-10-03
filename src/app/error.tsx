"use client";

import { CircleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <CircleAlert className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold text-slate-950">Đã xảy ra lỗi</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Không thể tải trang. Hãy kiểm tra kết nối cơ sở dữ liệu rồi thử lại.
        </p>
        <Button className="mt-5" onClick={reset}>Thử lại</Button>
      </div>
    </div>
  );
}
