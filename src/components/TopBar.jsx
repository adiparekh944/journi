import React, { useState } from "react";
import { Bell, Menu } from "lucide-react";

import AppMenu from "@/components/AppMenu";
import NotificationsSheet from "@/components/NotificationsSheet";
import { useNotifications } from "@/lib/useNotifications";

export default function TopBar({ title = "Journi" }) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notifications = useNotifications();

  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your city journal</p>
          <h1 className="font-display text-[2rem] font-semibold leading-none tracking-tight text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActivityOpen(true)}
            aria-label={
              notifications.unreadCount > 0
                ? `Activity, ${notifications.unreadCount} unread`
                : "Activity"
            }
            className="tap-highlight relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
          >
            <Bell className="h-5 w-5" />
            {notifications.unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-semibold tabular-nums text-secondary-foreground ring-2 ring-card">
                {notifications.unreadCount > 9 ? "9+" : notifications.unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
            className="tap-highlight flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <NotificationsSheet
        open={activityOpen}
        onOpenChange={setActivityOpen}
        notifications={notifications}
      />
      <AppMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
