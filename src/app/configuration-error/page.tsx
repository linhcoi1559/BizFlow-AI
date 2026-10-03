import { ShieldAlert } from "lucide-react";

export default function ConfigurationErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-xl rounded-2xl bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-950">
          Cần cấu hình xác thực
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          BizFlow đang bảo vệ dữ liệu không gian làm việc vì cấu hình xác thực production chưa đầy đủ.
          Hãy cấu hình đủ hai biến Supabase công khai, hoặc chỉ bật chế độ demo trong môi trường thử nghiệm an toàn.
        </p>
      </section>
    </main>
  );
}
