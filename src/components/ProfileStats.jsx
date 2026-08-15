import React from "react";

export default function ProfileStats({ stats }) {
  return (
    <div className="flex gap-6">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-lg font-bold text-stone-900">{s.value}</div>
          <div className="text-xs text-stone-500">{s.label}</div>
        </div>
      ))}
    </div>
  );
}