"use client";

import { useEffect, useState } from "react";
import { cn } from "./cn";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

let addToast: (msg: string, type?: "success" | "error" | "info") => void;

export function useToast() {
  return {
    toast: (msg: string, type: "success" | "error" | "info" = "info") => {
      addToast?.(msg, type);
    },
  };
}

const typeStyles = {
  success: "bg-success/10 border-success/20 text-success",
  error: "bg-danger/10 border-danger/20 text-danger",
  info: "bg-accent-soft border-accent/20 text-accent",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToast = (message, type = "info") => {
      const id = Date.now().toString();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => {
        setToasts((t) => t.filter((item) => item.id !== id));
      }, 4000);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "animate-fade-in rounded-xl border px-4 py-2.5 text-sm shadow-lg",
            typeStyles[t.type],
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
