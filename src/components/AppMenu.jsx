import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  ChevronRight,
  LogOut,
  MapPin,
  Medal,
  Settings,
  Share2,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/AuthContext";
import { useJourni } from "@/lib/JourniDataContext";

/**
 * The slide-over menu behind the header icon, following Beli's layout: an
 * identity block with the counts that matter, then grouped destinations.
 */
export default function AppMenu({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { visits, wantToGo } = useJourni();

  const go = (path) => {
    onOpenChange(false);
    navigate(path);
  };

  const boroughsCovered = new Set(
    visits.map((visit) => visit.place_borough).filter(Boolean),
  ).size;

  const groups = [
    {
      label: "Your lists",
      items: [
        { icon: MapPin, label: "Been", detail: visits.length, to: "/list" },
        {
          icon: Bookmark,
          label: "Want to go",
          detail: wantToGo.length,
          to: "/want-to-go",
        },
        { icon: Sparkles, label: "Recs for you", to: "/search" },
      ],
    },
    {
      label: "People",
      items: [
        { icon: Users, label: "Friends", to: "/profile" },
        { icon: Trophy, label: "Leaderboard", to: "/profile" },
        { icon: UserPlus, label: "Find people", to: "/search" },
      ],
    },
    {
      label: "You",
      items: [
        { icon: Medal, label: "Badges", to: "/profile" },
        { icon: Settings, label: "Settings", to: "/profile" },
      ],
    },
  ];

  const share = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) await navigator.share({ title: "Journi", url });
      else await navigator.clipboard.writeText(url);
    } catch {
      // The user dismissed the share sheet; nothing to recover from.
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xs p-0">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <button
            onClick={() => go("/profile")}
            className="tap-highlight flex w-full items-center gap-3 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
              {(user?.full_name ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {user?.full_name ?? "Your profile"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user?.username ? `@${user.username}` : user?.email}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { value: visits.length, label: "Been" },
              { value: wantToGo.length, label: "Want to go" },
              { value: `${boroughsCovered}/5`, label: "Boroughs" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-muted px-2 py-2 text-center"
              >
                <div className="text-base font-semibold tabular-nums text-foreground">
                  {stat.value}
                </div>
                <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </SheetHeader>

        <div className="h-[calc(100vh-13rem)] overflow-y-auto py-2">
          {groups.map((group) => (
            <div key={group.label} className="px-2 py-1.5">
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => go(item.to)}
                  className="tap-highlight flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted"
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">{item.label}</span>
                  {item.detail != null && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {item.detail}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ))}

          <div className="mt-1 border-t border-border px-2 pt-2">
            <button
              onClick={share}
              className="tap-highlight flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted"
            >
              <Share2 className="h-[18px] w-[18px] text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground">Invite a friend</span>
            </button>
            <button
              onClick={() => logout(true)}
              className="tap-highlight flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted"
            >
              <LogOut className="h-[18px] w-[18px] text-rose-600" />
              <span className="flex-1 text-sm text-rose-600">Log out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
