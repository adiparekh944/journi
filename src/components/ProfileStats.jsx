import React from "react";

export default function ProfileStats({ stats }) {
  return (
    <div className="flex gap-6">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-lg font-bold text-foreground">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}