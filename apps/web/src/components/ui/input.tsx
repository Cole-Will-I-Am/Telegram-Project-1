"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl bg-surface px-3 text-sm text-text-primary",
          "border border-border-light placeholder:text-text-tertiary",
          "outline-none transition-colors duration-150",
          "focus:border-accent/40 focus:ring-1 focus:ring-accent/20",
          error && "border-danger/40 focus:border-danger/60 focus:ring-danger/20",
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  ),
);
Input.displayName = "Input";
