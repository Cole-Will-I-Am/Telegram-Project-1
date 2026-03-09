"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { getInitData, initTelegram, isTelegramEnvironment } from "@/lib/telegram";

type BootState = "checking" | "authenticating" | "telegram-missing-init" | "browser";

export default function AuthPage() {
  const router = useRouter();
  const { login, loading, token } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [bootState, setBootState] = useState<BootState>("checking");

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || "manticode_bot";
  const miniAppLink = `https://t.me/${botUsername}?startapp=1`;
  const devLoginEnabled =
    (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN || "false").toLowerCase() === "true";

  useEffect(() => {
    if (token) {
      router.replace("/chat");
      return;
    }

    let mounted = true;

    initTelegram().then(() => {
      if (!mounted) return;
      if (!isTelegramEnvironment()) {
        setBootState("browser");
        return;
      }

      const initData = getInitData();
      if (!initData) {
        setBootState("telegram-missing-init");
        return;
      }

      setBootState("authenticating");
      login(initData)
        .then(() => router.replace("/chat"))
        .catch((e) => {
          setError(e.message);
          setBootState("telegram-missing-init");
        });
    });

    return () => {
      mounted = false;
    };
  }, [token, login, router]);

  const handleDevLogin = async () => {
    try {
      await login("dev-mode");
      router.replace("/chat");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const isLoading = loading || bootState === "checking" || bootState === "authenticating";

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-bg-primary p-6">
      {/* Glow background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.06] blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        {/* Logo & branding */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-gradient shadow-lg shadow-accent/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="bg-accent-gradient bg-clip-text text-3xl font-bold text-transparent">
              Forge Code
            </h1>
            <p className="tracking-label text-text-tertiary">AI Coding Assistant</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full rounded-xl bg-danger/10 px-4 py-3 text-center text-sm text-danger">
            {error}
          </div>
        )}

        {/* States */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            <p className="text-sm text-text-secondary">Authenticating...</p>
          </div>
        ) : bootState === "browser" ? (
          <div className="flex w-full flex-col items-center gap-4">
            {/* Feature list */}
            <div className="glass-card w-full space-y-3 px-5 py-4">
              {[
                { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "AI-powered code generation" },
                { icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", label: "Chat with your codebase" },
                { icon: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z", label: "Edit & review patches" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#617AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={f.icon} />
                    </svg>
                  </div>
                  <span className="text-sm text-text-secondary">{f.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href={miniAppLink}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-accent-gradient text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-transform active:scale-[0.98]"
            >
              Open in Telegram
            </a>

            {devLoginEnabled && (
              <Button variant="secondary" size="sm" onClick={handleDevLogin}>
                Dev Login
              </Button>
            )}

            <p className="text-center text-xs text-text-tertiary">
              Open from @{botUsername} for automatic login
            </p>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <p className="text-sm text-text-secondary">
              Open this app from @{botUsername} via the bot menu button.
            </p>
            <a
              href={miniAppLink}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-accent-gradient text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-transform active:scale-[0.98]"
            >
              Open Mini App
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
