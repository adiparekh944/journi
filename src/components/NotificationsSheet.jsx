import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Award, Heart, MessageCircle, UserPlus } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ICONS = {
  like: { Icon: Heart, tone: "bg-rose-100 text-rose-600" },
  comment: { Icon: MessageCircle, tone: "bg-sky-100 text-sky-600" },
  follow: { Icon: UserPlus, tone: "bg-emerald-100 text-emerald-600" },
  follow_request: { Icon: UserPlus, tone: "bg-amber-100 text-amber-700" },
  badge: { Icon: Award, tone: "bg-violet-100 text-violet-600" },
};

function line(item) {
  switch (item.kind) {
    case "like":
      return item.place
        ? `${item.actor} liked your rating of ${item.place}`
        : `${item.actor} liked your post`;
    case "comment":
      return item.place
        ? `${item.actor} commented on ${item.place}`
        : `${item.actor} commented on your post`;
    case "follow":
      return `${item.actor} started following you`;
    case "follow_request":
      return `${item.actor} asked to follow you`;
    case "badge":
      return `You earned ${item.title}`;
    default:
      return "New activity";
  }
}

function timeAgo(value) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "";
  }
}

export default function NotificationsSheet({ open, onOpenChange, notifications }) {
  const { items, loading, isUnread, markAllRead, unreadCount } = notifications;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        // Opening the panel is what marks everything read.
        if (next) markAllRead();
        onOpenChange(next);
      }}
    >
      <SheetContent side="right" className="w-full max-w-sm p-0">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold">
            Activity
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                {unreadCount} new
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="h-[calc(100vh-4.5rem)] overflow-y-auto">
          {loading ? (
            <ul className="space-y-3 p-5">
              {[0, 1, 2, 3, 4].map((row) => (
                <li key={row} className="flex gap-3">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Heart className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">Nothing yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Likes, comments, new followers and badges will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const { Icon, tone } = ICONS[item.kind] ?? ICONS.like;
                return (
                  <li
                    key={item.id}
                    className={`flex gap-3 px-5 py-3.5 ${
                      isUnread(item) ? "bg-primary/5" : ""
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-foreground">
                        {line(item)}
                      </p>
                      {item.body && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {item.kind === "comment" ? `“${item.body}”` : item.body}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {timeAgo(item.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
