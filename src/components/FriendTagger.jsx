import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { X } from "lucide-react";

export default function FriendTagger({ taggedIds = [], onChange }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const follows = await base44.entities.Follow.filter(
          { follower_id: user.id, status: "accepted" },
          "-created_date", 200
        );
        const ids = (follows || []).map((f) => f.following_id);
        const users = [];
        for (const uid of ids) {
          try {
            const u = await base44.entities.User.filter({ id: uid });
            if (u?.[0]) users.push(u[0]);
          } catch {}
        }
        setFriends(users);
      } catch (e) { console.error(e); }
    })();
  }, [user?.id]);

  const filtered = friends.filter(
    (f) => !taggedIds.includes(f.id) &&
    (f.full_name || f.email || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      {taggedIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {taggedIds.map((id) => {
            const f = friends.find((x) => x.id === id);
            if (!f) return null;
            const name = f.full_name || f.email;
            return (
              <span key={id} className="flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-medium text-primary">
                {name}
                <button type="button" onClick={() => onChange(taggedIds.filter((x) => x !== id))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search friends to tag…"
        className="h-11 w-full rounded-2xl border border-border bg-muted px-3 text-sm focus:outline-none"
      />
      {query && filtered.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {filtered.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { onChange([...taggedIds, f.id]); setQuery(""); }}
              className="tap-highlight flex w-full items-center gap-2 rounded-xl bg-muted p-2 text-left text-sm"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                {(f.full_name || f.email || "?")[0]}
              </div>
              {f.full_name || f.email}
            </button>
          ))}
        </div>
      )}
      {query && filtered.length === 0 && friends.length === 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">No friends yet. Follow people from their profile!</p>
      )}
      {query && filtered.length === 0 && friends.length > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">No friends match "{query}".</p>
      )}
    </div>
  );
}