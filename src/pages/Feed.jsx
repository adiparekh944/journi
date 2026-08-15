import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";
import ScoreBadge from "@/components/ScoreBadge";
import CategoryIcon, { CATEGORY_LABELS } from "@/components/CategoryIcon";
import { Heart, MessageCircle, Bookmark, Send } from "lucide-react";

export default function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});

  useEffect(() => {
    (async () => {
      try {
        // Feed = visits by people the user follows + own.
        const following = await base44.entities.Follow.filter({ follower_id: user.id, status: "accepted" }, "-created_date", 500);
        const ids = [user.id, ...(following || []).map((f) => f.following_id)];
        if (!ids.length) { setLoading(false); return; }
        // fetch visits in chunks
        const all = [];
        for (const uid of ids) {
          try {
            const v = await base44.entities.Visit.filter({ user_id: uid }, "-created_date", 100);
            all.push(...(v || []));
          } catch (e) {}
        }
        all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setVisits(all.slice(0, 60));

        // load likes + comments
        const l = {}, c = {};
        for (const v of all.slice(0, 60)) {
          try {
            const lk = await base44.entities.Like.filter({ visit_id: v.id }, "-created_date", 200);
            l[v.id] = lk || [];
          } catch {}
          try {
            const cm = await base44.entities.Comment.filter({ visit_id: v.id }, "created_date", 200);
            c[v.id] = cm || [];
          } catch {}
        }
        setLikes(l);
        setComments(c);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const toggleLike = async (v) => {
    const existing = (likes[v.id] || []).find((l) => l.user_id === user.id);
    if (existing) {
      await base44.entities.Like.delete(existing.id);
      setLikes((p) => ({ ...p, [v.id]: (p[v.id] || []).filter((l) => l.id !== existing.id) }));
    } else {
      const created = await base44.entities.Like.create({ user_id: user.id, visit_id: v.id });
      setLikes((p) => ({ ...p, [v.id]: [...(p[v.id] || []), created] }));
    }
  };

  const postComment = async (v) => {
    const text = (commentText[v.id] || "").trim();
    if (!text) return;
    const created = await base44.entities.Comment.create({ user_id: user.id, visit_id: v.id, text });
    setComments((p) => ({ ...p, [v.id]: [...(p[v.id] || []), created] }));
    setCommentText((p) => ({ ...p, [v.id]: "" }));
  };

  const savePlace = async (v) => {
    const existing = await base44.entities.WantToGo.filter({ user_id: user.id, place_id: v.place_id });
    if (!existing.length) await base44.entities.WantToGo.create({ user_id: user.id, place_id: v.place_id });
    alert("Saved to want-to-go!");
  };

  if (loading) return <div className="px-4 pt-10 text-center text-sm text-stone-400">Loading feed…</div>;

  return (
    <div className="px-4 pt-5">
      <h1 className="mb-3 text-xl font-semibold text-stone-900">Feed</h1>
      {visits.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">
          Nothing here yet. Follow people to see their visits.
        </div>
      ) : (
        <div className="space-y-4">
          {visits.map((v) => {
            const visitLikes = likes[v.id] || [];
            const visitComments = comments[v.id] || [];
            const liked = visitLikes.some((l) => l.user_id === user.id);
            return (
              <div key={v.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-card">
                <div className="flex items-center gap-2 p-3">
                  <ScoreBadge score={v.score} size="sm" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-stone-900" onClick={() => navigate(`/u/${v.user_id}`)}>{v.place_name}</div>
                    <div className="text-xs text-stone-500">{v.place_neighborhood} · {new Date(v.created_date).toLocaleDateString()}</div>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-stone-400">{CATEGORY_LABELS[v.place_category]}</span>
                </div>
                {v.photos?.[0] && (
                  <button onClick={() => navigate(`/place/${v.place_id}`)} className="block w-full">
                    <div className="aspect-square w-full overflow-hidden bg-stone-100">
                      <Image src={v.photos[0]} alt="" fittingType="fill" className="h-full w-full" />
                    </div>
                  </button>
                )}
                <div className="p-3">
                  <div className="flex gap-4">
                    <button onClick={() => toggleLike(v)} className="tap-highlight flex items-center gap-1 text-sm">
                      <Heart className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : "text-stone-500"}`} />
                      <span className="text-stone-500">{visitLikes.length}</span>
                    </button>
                    <button onClick={() => setShowComments((p) => ({ ...p, [v.id]: !p[v.id] }))} className="tap-highlight flex items-center gap-1 text-sm">
                      <MessageCircle className="h-5 w-5 text-stone-500" />
                      <span className="text-stone-500">{visitComments.length}</span>
                    </button>
                    <button onClick={() => savePlace(v)} className="tap-highlight ml-auto">
                      <Bookmark className="h-5 w-5 text-stone-500" />
                    </button>
                  </div>
                  {v.note && <p className="mt-2 text-sm text-stone-700">{v.note}</p>}
                  {showComments[v.id] && (
                    <div className="mt-3 space-y-2 border-t border-stone-100 pt-2">
                      {visitComments.map((c) => (
                        <div key={c.id} className="text-sm text-stone-600"><span className="font-medium text-stone-800">user</span> {c.text}</div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={commentText[v.id] || ""}
                          onChange={(e) => setCommentText((p) => ({ ...p, [v.id]: e.target.value }))}
                          placeholder="Add a comment…"
                          className="h-9 flex-1 rounded-full border border-stone-200 px-3 text-sm focus:outline-none"
                        />
                        <button onClick={() => postComment(v)} className="tap-highlight flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}