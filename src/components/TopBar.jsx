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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActivityOpen(true)}
            aria-label={
              notifications.unreadCount > 0
                ? `Activity, ${notifications.unreadCount} unread`
                : "Activity"
            }
            className="tap-highlight relative p-2 text-muted-foreground"
          >
            <Bell className="h-5 w-5" />
            {notifications.unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground ring-2 ring-card">
                {notifications.unreadCount > 9 ? "9+" : notifications.unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
            className="tap-highlight p-2 text-muted-foreground"
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
