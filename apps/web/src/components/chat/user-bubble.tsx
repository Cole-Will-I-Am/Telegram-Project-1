"use client";

interface UserBubbleProps {
  content: string;
}

export function UserBubble({ content }: UserBubbleProps) {
  return (
    <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-accent-gradient px-4 py-3 shadow-lg shadow-accent/10">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
        {content}
      </p>
    </div>
  );
}
