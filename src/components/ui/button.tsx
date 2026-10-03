import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-60",
    {
      "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700":
        variant === "primary",
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950":
        variant === "secondary",
      "text-slate-600 hover:bg-slate-100 hover:text-slate-950":
        variant === "ghost",
      "bg-rose-600 text-white hover:bg-rose-700": variant === "danger",
      "h-9 px-3 text-sm": size === "sm",
      "h-10 px-4 text-sm": size === "md",
      "h-11 px-5 text-sm": size === "lg",
      "size-10": size === "icon",
    },
    className,
  );
}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
