"use client";

import { type HTMLAttributes } from "react";
import { cn } from "./cn";

interface ChromeCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function ChromeCard({ className, hover, children, ...props }: ChromeCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] bg-surface",
        "border-[0.5px] border-border-light",
        hover && "cursor-pointer transition-colors hover:bg-surface-elevated",
        className,
      )}
      {...props}
    >
      {/* Top gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      {children}
    </div>
  );
}
