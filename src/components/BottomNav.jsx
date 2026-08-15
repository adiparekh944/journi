import React from "react";
import { NavLink } from "react-router-dom";
import { Compass, List, Search, Map, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Feed", icon: Compass, end: true },
  { to: "/list", label: "Lists", icon: List },
  { to: "/search", label: "Search", icon: Search, center: true },
  { to: "/map", label: "Map", icon: Map },
  { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pt-2"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around rounded-2xl border border-border bg-card/95 px-2 py-1.5 shadow-[0_18px_50px_-24px_rgba(20,51,42,0.55)] backdrop-blur-xl">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className="tap-highlight flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5"
            >
              {({ isActive }) => (
                <>
                  {t.center ? (
                    <span className="flex h-9 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:scale-95">
                      <Icon className="h-5 w-5" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className={`flex h-9 w-10 items-center justify-center rounded-xl transition ${isActive ? "bg-muted text-primary" : "text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                    </span>
                  )}
                  <span className={`text-[9px] font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {t.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
