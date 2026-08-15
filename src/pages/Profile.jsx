import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useJourni } from "@/lib/JourniDataContext";
import { Image } from "@/components/ui/image";
import CategoryIcon from "@/components/CategoryIcon";
import ScoreBadge from "@/components/ScoreBadge";
import ProfileStats from "@/components/ProfileStats";
import ActivityTiles from "@/components/ActivityTiles";
import GoalCard from "@/components/GoalCard";
import { rankVisits } from "@/../base44/shared/scoring";
import { Settings, Share2, MoreHorizontal, Check, UserPlus, List, Bookmark, Heart } from "lucide-react";

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me, logout } = useAuth();
  const { visits: myVisits, wantToGo } = useJourni();
  const targetId = userId || me?.id;
  const isMe = !userId || userId === me?.id;

  const [profile, setProfile] = useState(null);
  const [visits, setVisits] = useState([]);
  const [followStatus, setFollowStatus] = useState(null);
  const [editing, setEditing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const load = async () => {
    if (!targetId) return;
    try {
      const u = await base44.entities.User.filter({ id: targetId });
      setProfile(u?.[0] || null);
      const v = await base44.entities.Visit.filter({ user_id: targetId }, "-score", 200);
      setVisits(v || []);
      const [folls, fwing] = await Promise.all([
        base44.entities.Follow.filter({ following_id: targetId, status: "accepted" }),
        base44.entities.Follow.filter({ follower_id: targetId, status: "accepted" }),
      ]);
      setFollowers(folls?.length || 0);
      setFollowing(fwing?.length || 0);
      if (!isMe) {
        const f = await base44.entities.Follow.filter({ follower_id: me.id, following_id: targetId });
        setFollowStatus(f?.[0]?.status || null);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [targetId, isMe]);

  const ranked = rankVisits(visits);
  const topPicks = ranked.slice(0, 3);
  const stats = [
    { label: "Followers", value: followers },
    { label: "Following", value: following },
    { label: "Places", value: visits.length },
  ];

  const follow = async () => {
    if (followStatus) return;
    const created = await base44.entities.Follow.create({ follower_id: me.id, following_id: targetId, status: profile?.is_private ? "pending" : "accepted" });
    setFollowStatus(created.status);
  };
  const unfollow = async () => {
    const f = await base44.entities.Follow.filter({ follower_id: me.id, following_id: targetId });
    if (f?.[0]) await base44.entities.Follow.delete(f[0].id);
    setFollowStatus(null);
  };
  const saveProfile = async (data) => {
    await base44.auth.updateMe(data);
    setProfile({ ...profile, ...data });
    setEditing(false);
  };

  if (!profile) return <div className="px-4 pt-10 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="px-5 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Journi member</p>
          <h1 className="font-display text-2xl font-semibold leading-none text-foreground">{isMe ? "Profile" : "User"}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-muted-foreground"><Share2 className="h-5 w-5" /></button>
          {isMe && <button onClick={() => setEditing(true)} className="p-2 text-muted-foreground"><Settings className="h-5 w-5" /></button>}
        </div>
      </header>

      <div className="flex flex-col items-center">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-muted ring-4 ring-secondary/35">
          {profile.avatar_url ? <Image src={profile.avatar_url} alt="" fittingType="fill" className="h-full w-full" /> : <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">{(profile.display_name || profile.username || "?")[0]}</div>}
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold text-foreground">{profile.display_name || profile.username}</h2>
        <div className="text-sm text-muted-foreground">@{profile.username}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">Member since {new Date(profile.created_date || Date.now()).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
      </div>

      <div className="mt-4 flex justify-center">
        <ProfileStats stats={stats} />
      </div>

      {isMe ? (
        <div className="mt-4 flex gap-2">
          <button onClick={() => setEditing(true)} className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground">Edit profile</button>
          <button onClick={() => navigate("/list")} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">Share profile</button>
        </div>
      ) : (
        <div className="mt-4">
          {followStatus === "accepted" ? (
            <button onClick={unfollow} className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border py-2.5 text-sm font-medium text-foreground"><Check className="h-4 w-4" /> Following</button>
          ) : followStatus === "pending" ? (
            <button disabled className="w-full rounded-full border border-border py-2.5 text-sm font-medium text-muted-foreground">Requested</button>
          ) : (
            <button onClick={follow} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"><UserPlus className="h-4 w-4" /> Follow</button>
          )}
        </div>
      )}

      <div className="mt-6 space-y-0">
        <NavRow icon={List} label="Been" count={visits.length} onClick={() => navigate(isMe ? "/list" : `/u/${targetId}`)} />
        {isMe && <NavRow icon={Bookmark} label="Want to Try" count={wantToGo.length} onClick={() => navigate("/want-to-go")} />}
        <NavRow icon={Heart} label="Recs for You" onClick={() => navigate("/search")} />
      </div>

      <div className="mt-6">
        <ActivityTiles visits={visits} />
      </div>

      {isMe && (
        <div className="mt-4">
          <GoalCard />
        </div>
      )}

      {isMe && (
        <button onClick={() => logout()} className="mt-4 w-full rounded-full py-2.5 text-sm font-medium text-muted-foreground">Log out</button>
      )}

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Top picks</h3>
        {topPicks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No visits yet.</div>
        ) : (
          <div className="space-y-2">
            {topPicks.map((v, i) => (
              <button key={v.id} onClick={() => navigate(`/place/${v.place_id}`)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-left">
                <span className="w-4 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="h-11 w-11 overflow-hidden rounded-xl bg-muted">
                  {/* Fall back to the place photo: most visits carry no user
                      upload, and an empty tile reads as a broken image. */}
                  {(v.photos?.[0] || v.place_hero_image_url) ? (
                    <Image src={v.photos?.[0] || v.place_hero_image_url} alt="" fittingType="fill" className="h-full w-full" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <CategoryIcon category={v.place_category} className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1"><div className="line-clamp-1 text-sm font-semibold text-foreground">{v.place_name}</div><div className="text-xs text-muted-foreground">{v.place_neighborhood}</div></div>
                <ScoreBadge score={v.score} size="sm" />
              </button>
            ))}
          </div>
        )}
      </section>

      {editing && <EditProfileModal profile={profile} onSave={saveProfile} onClose={() => setEditing(false)} />}
    </div>
  );
}

function NavRow({ icon: Icon, label, count, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-border py-3 text-left">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      {count != null && <span className="text-sm text-muted-foreground">{count}</span>}
      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function EditProfileModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({
    display_name: profile.display_name || "",
    username: profile.username || "",
    bio: profile.bio || "",
    home_city: profile.home_city || "New York City",
    is_private: profile.is_private || false,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 pb-safe" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit profile</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground">Cancel</button>
        </div>
        <div className="space-y-3">
          <Input label="Display name" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
          <Input label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
          <Input label="Bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} />
          <button onClick={() => setForm({ ...form, is_private: !form.is_private })} className="flex w-full items-center justify-between rounded-2xl border border-border p-3">
            <span className="text-sm font-medium text-foreground">Private account</span>
            <span className={`flex h-6 w-11 items-center rounded-full p-0.5 ${form.is_private ? "bg-primary" : "bg-muted"}`}><span className={`h-5 w-5 rounded-full bg-card transition ${form.is_private ? "translate-x-5" : ""}`} /></span>
          </button>
          <button onClick={() => onSave(form)} className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">Save</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-2xl border border-border bg-stone-50 px-3 text-sm focus:outline-none" />
    </div>
  );
}
