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
    <nav className="pb-safe fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className="tap-highlight flex flex-1 flex-col items-center gap-0.5 py-1.5"
            >
              {({ isActive }) => (
                <>
                  {t.center ? (
                    <span className="flex h-11 w-11 -translate-y-2 items-center justify-center rounded-full bg-stone-900 text-white shadow-lg active:scale-95">
                      <Icon className="h-5 w-5" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <Icon className={`h-5 w-5 transition ${isActive ? "text-stone-900" : "text-stone-400"}`} strokeWidth={isActive ? 2.5 : 2} />
                  )}
                  <span className={`text-[10px] font-medium ${isActive ? "text-stone-900" : "text-stone-400"} ${t.center ? "-translate-y-1.5" : ""}`}>
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