import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TopBar from "@/components/TopBar";
import ActionChips from "@/components/ActionChips";
import FeaturedLists from "@/components/FeaturedLists";
import SearchBar from "@/components/SearchBar";
import FeedVisitCard from "@/components/FeedVisitCard";

export default function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const allPlaces = await base44.entities.Place.list("-created_date", 500);
        setPlaces(allPlaces || []);

        const following = await base44.entities.Follow.filter({ follower_id: user.id, status: "accepted" }, "-created_date", 500);
        const ids = [user.id, ...(following || []).map((f) => f.following_id)];
        if (!ids.length) { setLoading(false); return; }
        const all = [];
        for (const uid of ids) {
          try {
            const v = await base44.entities.Visit.filter({ user_id: uid }, "-created_date", 100);
            all.push(...(v || []));
          } catch (e) {}
        }
        all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setVisits(all.slice(0, 60));

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

  if (loading) return <div className="px-4 pt-10 text-center text-sm text-stone-400">Loading…</div>;

  return (
    <div className="px-4 pt-5">
      <TopBar />
      <div className="mt-3">
        <SearchBar value="" onChange={() => navigate("/search")} placeholder="Search places, members…" />
      </div>
      <div className="mt-3">
        <ActionChips />
      </div>
      <div className="mt-5">
        <FeaturedLists places={places} />
      </div>
      <section className="mt-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-900">From your friends</h2>
        {visits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">
            Nothing here yet. Follow people to see their visits.
          </div>
        ) : (
          <div className="space-y-4">
            {visits.map((v) => (
              <FeedVisitCard
                key={v.id}
                visit={v}
                likes={likes[v.id] || []}
                comments={comments[v.id] || []}
                liked={(likes[v.id] || []).some((l) => l.user_id === user.id)}
                showComments={!!showComments[v.id]}
                commentText={commentText[v.id] || ""}
                onLike={() => toggleLike(v)}
                onToggleComments={() => setShowComments((p) => ({ ...p, [v.id]: !p[v.id] }))}
                onComment={() => postComment(v)}
                onCommentChange={(text) => setCommentText((p) => ({ ...p, [v.id]: text }))}
                onSave={() => savePlace(v)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}