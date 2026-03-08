"use client";

import { Button } from "@/components/ui/button";

interface PatchActionBarProps {
  onApprove: () => void;
  onReject: () => void;
}

export function PatchActionBar({ onApprove, onReject }: PatchActionBarProps) {
  return (
    <div className="flex gap-2 border-t border-border p-3">
      <Button variant="danger" size="md" className="flex-1" onClick={onReject}>
        Reject
      </Button>
      <Button variant="primary" size="md" className="flex-1" onClick={onApprove}>
        Approve
      </Button>
    </div>
  );
}
