"use client";

interface ActionChipsProps {
  onSelect: (prompt: string) => void;
}

const CHIPS = [
  { label: "Explain", prompt: "Explain this code in detail" },
  { label: "Fix", prompt: "Find and fix bugs in this code" },
  { label: "Refactor", prompt: "Refactor this code for clarity and performance" },
  { label: "Tests", prompt: "Write comprehensive tests for this code" },
];

export function ActionChips({ onSelect }: ActionChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
      {CHIPS.map((chip) => (
        <button
          key={chip.label}
          onClick={() => onSelect(chip.prompt)}
          className="flex-shrink-0 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
