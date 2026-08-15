import React from "react";
import { useNavigate } from "react-router-dom";
import { Image } from "@/components/ui/image";
import ScoreBadge from "@/components/ScoreBadge";
import { CATEGORY_LABELS } from "@/components/CategoryIcon";
import { Heart, MessageCircle, Bookmark, Send } from "lucide-react";

export default function FeedVisitCard({
  visit, likes, comments, liked, showComments, commentText,
  onLike, onToggleComments, onComment, onCommentChange, onSave,
}) {
  const navigate = useNavigate();
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2.5 p-3">
        <ScoreBadge score={visit.score} size="sm" />
        <div className="flex-1">
          <div className="cursor-pointer text-sm font-semibold text-foreground" onClick={() => navigate(`/u/${visit.user_id}`)}>
            {visit.place_name}
          </div>
          <div className="text-xs text-muted-foreground">
            {visit.place_neighborhood} · {new Date(visit.created_date).toLocaleDateString()}
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{CATEGORY_LABELS[visit.place_category]}</span>
      </div>
      {visit.photos?.[0] && (
        <button onClick={() => navigate(`/place/${visit.place_id}`)} className="block w-full">
          <div className="aspect-square w-full overflow-hidden bg-muted">
            <Image src={visit.photos[0]} alt="" fittingType="fill" className="h-full w-full" />
          </div>
        </button>
      )}
      <div className="p-3">
        <div className="flex gap-5">
          <button onClick={onLike} className="tap-highlight flex items-center gap-1 text-sm">
            <Heart className={`h-5 w-5 ${liked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            <span className="text-muted-foreground">{likes.length}</span>
          </button>
          <button onClick={onToggleComments} className="tap-highlight flex items-center gap-1 text-sm">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">{comments.length}</span>
          </button>
          <button onClick={onSave} className="tap-highlight ml-auto">
            <Bookmark className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        {visit.note && <p className="mt-2 text-sm text-foreground">{visit.note}</p>}
        {showComments && (
          <div className="mt-3 space-y-2 border-t border-border pt-2">
            {comments.map((c) => (
              <div key={c.id} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">user</span> {c.text}
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder="Add a comment…"
                className="h-9 flex-1 rounded-full border border-border px-3 text-sm focus:outline-none"
              />
              <button onClick={onComment} className="tap-highlight flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}