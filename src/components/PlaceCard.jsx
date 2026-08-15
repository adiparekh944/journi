import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Image } from "@/components/ui/image";
import CategoryIcon, { CATEGORY_LABELS } from "@/components/CategoryIcon";
import ScoreBadge from "@/components/ScoreBadge";

export default function PlaceCard({ place, score, footer }) {
  const navigate = useNavigate();
  const photo = place.official_photos?.[0];
  return (
    <button
      onClick={() => navigate(`/place/${place.id}`)}
      className="tap-highlight group w-full overflow-hidden rounded-3xl border border-stone-200/80 bg-card text-left shadow-sm transition active:scale-[0.99]"
    >
      <div className="relative h-40 w-full overflow-hidden bg-stone-100">
        {photo ? (
          <Image src={photo} alt={place.name} fittingType="fill" className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
            <CategoryIcon category={place.category} className="h-8 w-8 text-stone-400" />
          </div>
        )}
        {score != null && (
          <div className="absolute right-2 top-2">
            <ScoreBadge score={score} size="sm" className="pin-shadow" />
          </div>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-500">
          <CategoryIcon category={place.category} className="h-3.5 w-3.5" />
          {CATEGORY_LABELS[place.category] || place.category}
        </div>
        <h3 className="mt-0.5 line-clamp-1 font-semibold text-stone-900">{place.name}</h3>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">
            {place.neighborhood ? `${place.neighborhood} · ` : ""}{place.borough}
          </span>
        </div>
        {footer && <div className="mt-2.5">{footer}</div>}
      </div>
    </button>
  );
}