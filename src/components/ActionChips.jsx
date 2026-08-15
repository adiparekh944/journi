import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Bookmark, Navigation } from "lucide-react";

export default function ActionChips() {
  const navigate = useNavigate();
  const chips = [
    { label: "Log visit", icon: Plus, to: "/log" },
    { label: "Want to go", icon: Bookmark, to: "/want-to-go" },
    { label: "Recs nearby", icon: Navigation, to: "/search" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {chips.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.label}
            onClick={() => navigate(c.to)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground active:scale-95"
          >
            <Icon className="h-3.5 w-3.5" /> {c.label}
          </button>
        );
      })}
    </div>
  );
}