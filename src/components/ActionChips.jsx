import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Bookmark, Sparkles } from "lucide-react";

export default function ActionChips() {
  const navigate = useNavigate();
  const chips = [
    { label: "Log visit", icon: Plus, to: "/log", tone: "quiet" },
    { label: "Want to go", icon: Bookmark, to: "/want-to-go", tone: "quiet" },
    { label: "Plan trip", icon: Sparkles, to: "/trip-planner", tone: "accent" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {chips.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.label}
            onClick={() => navigate(c.to)}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition active:scale-[0.98] ${
              c.tone === "accent"
                ? "border-secondary bg-secondary text-secondary-foreground"
                : "border-border bg-card text-foreground"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${c.tone === "accent" ? "text-secondary-foreground" : "text-primary"}`} /> {c.label}
          </button>
        );
      })}
    </div>
  );
}
