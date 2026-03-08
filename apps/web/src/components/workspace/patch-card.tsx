"use client";

import type { PatchProposal } from "@forge-code/shared-types";
import { ChromeCard } from "@/components/ui/chrome-card";
import { Badge } from "@/components/ui/badge";

interface PatchCardProps {
  patch: PatchProposal;
  onClick?: () => void;
}

const statusVariant: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  pending: "accent",
  approved: "success",
  rejected: "danger",
  applied: "neutral",
};

export function PatchCard({ patch, onClick }: PatchCardProps) {
  return (
    <ChromeCard hover className="p-4" onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-text-primary">{patch.title}</h3>
          <p className="mt-1 text-xs text-text-tertiary">
            {patch.changes?.length ?? 0} file{(patch.changes?.length ?? 0) !== 1 ? "s" : ""} changed
          </p>
        </div>
        <Badge variant={statusVariant[patch.status] ?? "neutral"}>
          {patch.status}
        </Badge>
      </div>
    </ChromeCard>
  );
}
