"use client";

import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { ChromeCard } from "@/components/ui/chrome-card";
import { Avatar } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Divider } from "@/components/ui/divider";

export default function SettingsPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">Settings</h2>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-md space-y-4">
          {/* Profile */}
          <ChromeCard className="p-4">
            <Label>Profile</Label>
            <div className="mt-3 flex items-center gap-3">
              <Avatar
                src={user?.avatarUrl}
                name={user?.displayName || "User"}
                size="lg"
              />
              <div>
                <p className="font-medium">{user?.displayName}</p>
                {user?.username && (
                  <p className="text-sm text-text-secondary">@{user.username}</p>
                )}
              </div>
            </div>
          </ChromeCard>

          {/* Model */}
          <ChromeCard className="p-4">
            <Label>Model</Label>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-sm">Forge Code</span>
              <span className="ml-auto text-xs text-text-tertiary">
                AI-powered
              </span>
            </div>
          </ChromeCard>

          <Divider />

          <Button variant="danger" size="sm" className="w-full" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
