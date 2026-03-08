"use client";

import type { ActivityEvent } from "@forge-code/shared-types";
import { cn } from "@/components/ui/cn";

interface ActivityFeedProps {
  events: ActivityEvent[];
  className?: string;
}

const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
  message_sent: { icon: "💬", color: "text-accent", label: "sent a message" },
  file_created: { icon: "📄", color: "text-success", label: "created a file" },
  file_updated: { icon: "✏️", color: "text-accent", label: "updated a file" },
  patch_proposed: { icon: "🔧", color: "text-accent", label: "proposed changes" },
  patch_approved: { icon: "✅", color: "text-success", label: "approved a patch" },
  patch_rejected: { icon: "❌", color: "text-danger", label: "rejected a patch" },
  patch_applied: { icon: "🚀", color: "text-success", label: "applied a patch" },
  member_joined: { icon: "👋", color: "text-accent", label: "joined the workspace" },
};

export function ActivityFeed({ events, className }: ActivityFeedProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {events.map((event) => {
        const config = typeConfig[event.type] || {
          icon: "•",
          color: "text-text-secondary",
          label: event.type,
        };

        return (
          <div key={event.id} className="flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-white/[0.02]">
            <span className="mt-0.5 text-xs">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs">
                <span className="font-medium text-text-primary">
                  {event.user?.displayName || "Someone"}
                </span>{" "}
                <span className="text-text-secondary">{config.label}</span>
              </p>
              <time className="text-[10px] text-text-tertiary">
                {new Date(event.createdAt).toLocaleString()}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}
