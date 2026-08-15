import React from "react";
import { Trophy, Flame } from "lucide-react";

export default function ActivityTiles({ visits }) {
  const topScore = visits.length ? Math.max(...visits.map((v) => v.score || 0)).toFixed(1) : "–";
  const categories = new Set(visits.map((v) => v.place_category)).size;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-stone-200 p-4">
        <Trophy className="h-5 w-5 text-amber-500" />
        <div className="mt-2 text-lg font-bold text-stone-900">{topScore}</div>
        <div className="text-xs text-stone-500">Top score</div>
      </div>
      <div className="rounded-2xl border border-stone-200 p-4">
        <Flame className="h-5 w-5 text-orange-500" />
        <div className="mt-2 text-lg font-bold text-stone-900">{categories}</div>
        <div className="text-xs text-stone-500">Categories</div>
      </div>
    </div>
  );
}