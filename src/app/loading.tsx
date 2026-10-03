export default function Loading() {
  return (
    <div className="animate-pulse space-y-7" aria-label="Loading page">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-32 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-4 w-28 rounded bg-slate-100" />
            <div className="mt-4 h-7 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="h-96 rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}
