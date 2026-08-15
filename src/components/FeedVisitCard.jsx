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
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center gap-2.5 p-3">
        <ScoreBadge score={visit.score} size="sm" />
        <div className="flex-1">
          <div className="cursor-pointer text-sm font-semibold text-stone-900" onClick={() => navigate(`/u/${visit.user_id}`)}>
            {visit.place_name}
          </div>
          <div className="text-xs text-stone-500">
            {visit.place_neighborhood} · {new Date(visit.created_date).toLocaleDateString()}
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-stone-400">{CATEGORY_LABELS[visit.place_category]}</span>
      </div>
      {visit.photos?.[0] && (
        <button onClick={() => navigate(`/place/${visit.place_id}`)} className="block w-full">
          <div className="aspect-square w-full overflow-hidden bg-stone-100">
            <Image src={visit.photos[0]} alt="" fittingType="fill" className="h-full w-full" />
          </div>
        </button>
      )}
      <div className="p-3">
        <div className="flex gap-5">
          <button onClick={onLike} className="tap-highlight flex items-center gap-1 text-sm">
            <Heart className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : "text-stone-600"}`} />
            <span className="text-stone-600">{likes.length}</span>
          </button>
          <button onClick={onToggleComments} className="tap-highlight flex items-center gap-1 text-sm">
            <MessageCircle className="h-5 w-5 text-stone-600" />
            <span className="text-stone-600">{comments.length}</span>
          </button>
          <button onClick={onSave} className="tap-highlight ml-auto">
            <Bookmark className="h-5 w-5 text-stone-600" />
          </button>
        </div>
        {visit.note && <p className="mt-2 text-sm text-stone-700">{visit.note}</p>}
        {showComments && (
          <div className="mt-3 space-y-2 border-t border-stone-100 pt-2">
            {comments.map((c) => (
              <div key={c.id} className="text-sm text-stone-600">
                <span className="font-medium text-stone-800">user</span> {c.text}
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder="Add a comment…"
                className="h-9 flex-1 rounded-full border border-stone-200 px-3 text-sm focus:outline-none"
              />
              <button onClick={onComment} className="tap-highlight flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-white">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}