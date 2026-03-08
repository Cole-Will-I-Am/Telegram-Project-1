"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="glass-bubble inline-flex items-center gap-1 rounded-2xl rounded-tl-md px-4 py-3">
        <span className="animate-typing-dot h-1.5 w-1.5 rounded-full bg-accent-gradient" />
        <span className="animate-typing-dot h-1.5 w-1.5 rounded-full bg-accent-gradient" />
        <span className="animate-typing-dot h-1.5 w-1.5 rounded-full bg-accent-gradient" />
      </div>
    </div>
  );
}
