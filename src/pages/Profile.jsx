import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useJourni } from "@/lib/JourniDataContext";
import { Image } from "@/components/ui/image";
import ScoreBadge from "@/components/ScoreBadge";
import { rankVisits } from "@/../base44/shared/scoring";
import { Settings, List, LogOut, UserPlus, Check, Lock, Share2 } from "lucide-react";

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me, logout } = useAuth();
  const { visits: myVisits } = useJourni();
  const targetId = userId || me?.id;
  const isMe = !userId || userId === me?.id;

  const [profile, setProfile] = useState(null);
  const [visits, setVisits] = useState([]);
  const [followStatus, setFollowStatus] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    if (!targetId) return;
    try {
      const u = await base44.entities.User.filter({ id: targetId });
      setProfile(u?.[0] || null);
      const v = await base44.entities.Visit.filter({ user_id: targetId }, "-score", 200);
      setVisits(v || []);
      if (!isMe) {
        const f = await base44.entities.Follow.filter({ follower_id: me.id, following_id: targetId });
        setFollowStatus(f?.[0]?.status || null);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [targetId, isMe]);

  const ranked = rankVisits(visits);
  const topPicks = ranked.slice(0, 3);

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

  if (!profile) return <div className="px-4 pt-10 text-center text-sm text-stone-400">Loading…</div>;

  return (
    <div className="px-4 pt-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-stone-200">
            {profile.avatar_url ? <Image src={profile.avatar_url} alt="" fittingType="fill" className="h-full w-full" /> : <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-stone-500">{(profile.display_name || profile.username || "?")[0]}</div>}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-semibold text-stone-900">{profile.display_name || profile.username}</h1>
              {profile.is_private && <Lock className="h-3.5 w-3.5 text-stone-400" />}
            </div>
            <div className="text-sm text-stone-500">@{profile.username}</div>
          </div>
        </div>
        {isMe ? (
          <button onClick={() => setEditing(true)} className="tap-highlight p-2 text-stone-500"><Settings className="h-5 w-5" /></button>
        ) : null}
      </div>

      {profile.bio && <p className="mt-3 text-sm text-stone-600">{profile.bio}</p>}

      <div className="mt-4 flex gap-6">
        <Stat label="Places" value={visits.length} />
        <Stat label="Boroughs" value={new Set(visits.map((v) => v.place_borough)).size} />
        <Stat label="Top score" value={ranked[0]?.score?.toFixed(1) || "–"} />
      </div>

      {isMe ? (
        <div className="mt-4 flex gap-2">
          <button onClick={() => navigate("/list")} className="tap-highlight flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2.5 text-sm font-medium text-stone-700"><List className="h-4 w-4" /> My ranked list</button>
          <button onClick={() => logout()} className="tap-highlight flex items-center justify-center gap-1.5 rounded-full border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-500"><LogOut className="h-4 w-4" /></button>
        </div>
      ) : (
        <div className="mt-4">
          {followStatus === "accepted" ? (
            <button onClick={unfollow} className="tap-highlight flex w-full items-center justify-center gap-1.5 rounded-full border border-stone-300 py-2.5 text-sm font-medium text-stone-700"><Check className="h-4 w-4" /> Following</button>
          ) : followStatus === "pending" ? (
            <button disabled className="w-full rounded-full border border-stone-200 py-2.5 text-sm font-medium text-stone-400">Requested</button>
          ) : (
            <button onClick={follow} className="tap-highlight flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-semibold text-white"><UserPlus className="h-4 w-4" /> Follow</button>
          )}
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-stone-700">Top picks</h2>
        {topPicks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-400">No visits yet.</div>
        ) : (
          <div className="space-y-2">
            {topPicks.map((v, i) => (
              <button key={v.id} onClick={() => navigate(`/place/${v.place_id}`)} className="tap-highlight flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-card p-2.5 text-left">
                <span className="w-4 text-center text-xs font-semibold text-stone-400">{i + 1}</span>
                <div className="h-11 w-11 overflow-hidden rounded-xl bg-stone-100">
                  {v.photos?.[0] ? <Image src={v.photos[0]} alt="" fittingType="fill" className="h-full w-full" /> : null}
                </div>
                <div className="flex-1"><div className="line-clamp-1 text-sm font-semibold text-stone-900">{v.place_name}</div><div className="text-xs text-stone-500">{v.place_neighborhood}</div></div>
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

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-lg font-semibold text-stone-900">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
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
          <button onClick={onClose} className="text-sm text-stone-500">Cancel</button>
        </div>
        <div className="space-y-3">
          <Input label="Display name" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
          <Input label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
          <Input label="Bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} />
          <button onClick={() => setForm({ ...form, is_private: !form.is_private })} className="tap-highlight flex w-full items-center justify-between rounded-2xl border border-stone-200 p-3">
            <span className="text-sm font-medium text-stone-700">Private account</span>
            <span className={`flex h-6 w-11 items-center rounded-full p-0.5 ${form.is_private ? "bg-primary" : "bg-stone-200"}`}><span className={`h-5 w-5 rounded-full bg-foreground transition ${form.is_private ? "translate-x-5" : ""}`} /></span>
          </button>
          <button onClick={() => onSave(form)} className="tap-highlight w-full rounded-full bg-primary py-3 text-sm font-semibold text-white">Save</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-stone-500">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm focus:outline-none" />
    </div>
  );
}