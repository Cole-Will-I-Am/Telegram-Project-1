"use client";

import { type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 p-8", className)}>
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="max-w-xs text-center text-sm text-text-secondary">
          {description}
        </p>
      )}
      {action && (
        <Button size="sm" className="mt-2" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
