import React, { useState } from "react";
import { Trophy } from "lucide-react";

export default function GoalCard() {
  const [goal, setGoal] = useState(null);
  const options = [20, 50, 100];
  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20">
          <Trophy className="h-5 w-5 text-secondary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">Set your 2026 goal</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">How many NYC spots do you want to visit in 2026?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((n) => (
              <button
                key={n}
                onClick={() => setGoal(n)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium ${goal === n ? "bg-primary text-white" : "border border-border text-muted-foreground"}`}
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