"use client";

import { useUIStore } from "@/stores/ui";
import { Sidebar } from "./sidebar";

interface MobileDrawerProps {
  open: boolean;
}

export function MobileDrawer({ open }: MobileDrawerProps) {
  const closeSidebar = useUIStore((s) => s.closeSidebar);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={closeSidebar} />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-slide-up rounded-t-2xl border-t border-border-light bg-bg-secondary">
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-white/10" />
        </div>
        <div className="h-[calc(85vh-24px)] overflow-hidden">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
