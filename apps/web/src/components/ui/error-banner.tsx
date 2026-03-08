"use client";

import { cn } from "./cn";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onDismiss, className }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-2.5",
        "border border-danger/20 text-sm text-danger",
        className,
      )}
    >
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-danger/60 hover:text-danger">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" d="M3 3l8 8m-8 0l8-8" />
          </svg>
        </button>
      )}
    </div>
  );
}
