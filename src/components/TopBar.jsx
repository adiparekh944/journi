import React from "react";
import { Bell, Menu } from "lucide-react";

export default function TopBar({ title = "Journi" }) {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <div className="flex items-center gap-1">
        <button className="relative p-2 text-muted-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        </button>
        <button className="p-2 text-muted-foreground">
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}