"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileDrawer } from "./mobile-drawer";
import { useUIStore } from "@/stores/ui";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-dvh overflow-hidden bg-bg-primary">
      {/* Desktop sidebar */}
      <aside className="hidden w-[280px] flex-shrink-0 border-r border-border bg-bg-secondary md:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer open={sidebarOpen} />

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
