import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  showLabel = true,
  className,
}: {
  value: number;
  showLabel?: boolean;
  className?: string;
}) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex min-w-28 items-center gap-2.5", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            normalized === 100 ? "bg-emerald-500" : "bg-indigo-500",
          )}
          style={{ width: `${normalized}%` }}
        />
      </div>
      {showLabel ? (
        <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-600">
          {normalized}%
        </span>
      ) : null}
    </div>
  );
}
