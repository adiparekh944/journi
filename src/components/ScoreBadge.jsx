import React from "react";
import { scoreColor } from "@/../base44/shared/scoring";

export default function ScoreBadge({ score, size = "md", className = "" }) {
  const band = scoreColor(score);
  const sizes = {
    xs: "h-6 min-w-6 text-[11px] px-1",
    sm: "h-7 min-w-7 text-xs px-1.5",
    md: "h-9 min-w-9 text-sm px-2",
    lg: "h-12 min-w-12 text-base px-2.5",
  };
  const label = score == null ? "–" : Number(score).toFixed(1);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold tabular-nums score-${band} ${sizes[size]} ${className}`}
    >
      {label}
    </span>
  );
}