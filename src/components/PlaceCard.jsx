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
      className="tap-highlight group w-full overflow-hidden rounded-[1.25rem] border border-border bg-card text-left shadow-[0_14px_32px_-28px_rgba(20,51,42,0.65)] active:scale-[0.99]"
    >
      <div className="relative h-36 w-full overflow-hidden bg-muted">
        {photo ? (
          <Image src={photo} alt={place.name} fittingType="fill" className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <CategoryIcon category={place.category} className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {score != null && (
          <div className="absolute right-2 top-2">
            <ScoreBadge score={score} size="sm" className="pin-shadow" />
          </div>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <CategoryIcon category={place.category} className="h-3.5 w-3.5" />
          {CATEGORY_LABELS[place.category] || place.category}
        </div>
        <h3 className="mt-1 line-clamp-1 font-display text-[17px] font-semibold leading-tight text-foreground">{place.name}</h3>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
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
