import React, { useState } from "react";
import { Trophy } from "lucide-react";

export default function GoalCard() {
  const [goal, setGoal] = useState(null);
  const options = [20, 50, 100];
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Trophy className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-stone-900">Set your 2026 goal</h3>
          <p className="mt-0.5 text-xs text-stone-500">How many NYC spots do you want to visit in 2026?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((n) => (
              <button
                key={n}
                onClick={() => setGoal(n)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium ${goal === n ? "bg-primary text-white" : "border border-stone-300 text-stone-600"}`}
              >
                {n}
              </button>
            ))}
            <button className="rounded-full border border-stone-300 px-4 py-1.5 text-xs font-medium text-stone-600">Customize</button>
          </div>
        </div>
      </div>
    </div>
  );
}