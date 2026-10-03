import { cn, titleCase } from "@/lib/utils";

const styles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  inactive: "bg-slate-100 text-slate-600 ring-slate-500/15",
  archived: "bg-slate-100 text-slate-500 ring-slate-500/15",
  draft: "bg-slate-100 text-slate-650 ring-slate-500/15",
  in_review: "bg-amber-50 text-amber-700 ring-amber-600/15",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  planning: "bg-violet-50 text-violet-700 ring-violet-600/15",
  paused: "bg-amber-50 text-amber-700 ring-amber-600/15",
  completed: "bg-blue-50 text-blue-700 ring-blue-600/15",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-600/15",
  pending: "bg-slate-100 text-slate-600 ring-slate-500/15",
  todo: "bg-slate-100 text-slate-600 ring-slate-500/15",
  in_progress: "bg-violet-50 text-violet-700 ring-violet-600/15",
  blocked: "bg-rose-50 text-rose-700 ring-rose-600/15",
  scheduled: "bg-blue-50 text-blue-700 ring-blue-600/15",
  invoiced: "bg-amber-50 text-amber-700 ring-amber-600/15",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  overdue: "bg-rose-50 text-rose-700 ring-rose-600/15",
  waived: "bg-slate-100 text-slate-500 ring-slate-500/15",
  dismissed: "bg-slate-100 text-slate-500 ring-slate-500/15",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        styles[status] ?? styles.inactive,
      )}
    >
      {titleCase(status)}
    </span>
  );
}
