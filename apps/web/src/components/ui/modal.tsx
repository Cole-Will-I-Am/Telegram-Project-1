"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "./cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Content */}
      <div
        className={cn(
          "glass-card relative z-10 w-full max-w-md animate-fade-in p-6",
          className,
        )}
      >
        {title && (
          <h2 className="mb-4 text-lg font-semibold tracking-title">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
