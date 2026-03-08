"use client";

import { type HTMLAttributes } from "react";
import { cn } from "./cn";

export function GlassBubble({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-bubble rounded-2xl rounded-tl-md px-4 py-3",
        "max-w-[75%]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
