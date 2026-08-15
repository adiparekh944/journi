import React from "react";
import { Bell, Menu } from "lucide-react";

export default function TopBar({ title = "Journi" }) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your city journal</p>
        <h1 className="font-display text-[2rem] font-semibold leading-none tracking-tight text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-1.5">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-secondary ring-2 ring-card" />
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
