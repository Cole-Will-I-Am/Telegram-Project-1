"use client";

import type { PatchProposal, PatchFileChange } from "@forge-code/shared-types";
import { DiffViewer } from "./diff-viewer";
import { PatchActionBar } from "./patch-action-bar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface PatchDetailProps {
  patch: PatchProposal;
  onApprove: () => void;
  onReject: () => void;
  onApply: () => void;
}

export function PatchDetail({ patch, onApprove, onReject, onApply }: PatchDetailProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{patch.title}</h2>
          <Badge variant={patch.status === "pending" ? "accent" : patch.status === "approved" ? "success" : "neutral"}>
            {patch.status}
          </Badge>
        </div>
      </div>

      {/* Changes */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {patch.changes?.map((change) => (
          <div key={change.id}>
            <div className="mb-2 flex items-center gap-2">
              <Label>{change.filePath}</Label>
              <Badge variant={change.action === "create" ? "success" : "accent"}>
                {change.action}
              </Badge>
            </div>
            <DiffViewer diff={change.diff} />
          </div>
        ))}
      </div>

      {/* Actions */}
      {patch.status === "pending" && (
        <PatchActionBar onApprove={onApprove} onReject={onReject} />
      )}
      {patch.status === "approved" && (
        <div className="border-t border-border p-3">
          <button
            onClick={onApply}
            className="w-full rounded-xl bg-accent-gradient py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/20"
          >
            Apply Changes
          </button>
        </div>
      )}
    </div>
  );
}
