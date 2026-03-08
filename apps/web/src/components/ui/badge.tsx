"use client";

import { cn } from "./cn";

type BadgeVariant = "accent" | "success" | "danger" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  accent: "bg-accent-soft text-accent",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-white/[0.04] text-text-secondary",
};

export function Badge({ variant = "accent", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "tracking-label text-[10px] font-semibold uppercase",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
