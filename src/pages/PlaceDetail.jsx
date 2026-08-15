import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useJourni } from "@/lib/JourniDataContext";
import { Image } from "@/components/ui/image";
import ScoreBadge from "@/components/ScoreBadge";
import CategoryIcon, { CATEGORY_LABELS } from "@/components/CategoryIcon";
import PlaceCard from "@/components/PlaceCard";
import { ArrowLeft, Clock, Calendar, Wallet, Building, Bookmark, Check } from "lucide-react";

export default function PlaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { visits, wantToGo, toggleWantToGo } = useJourni();
  const [place, setPlace] = useState(null);
  const [allVisits, setAllVisits] = useState([]);
  const [allPlaces, setAllPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, v, places] = await Promise.all([
          base44.entities.Place.get(id),
          base44.entities.Visit.filter({ place_id: id }, "-score", 200),
          base44.entities.Place.list("-created_date", 500),
        ]);
        setPlace(p);
        setAllVisits(v || []);
        setAllPlaces(places || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const myVisit = visits.find((v) => v.place_id === id);
  const saved = wantToGo.some((w) => w.place_id === id);
  const communityAvg = useMemo(() => {
    if (!allVisits.length) return null;
    const sum = allVisits.reduce((a, v) => a + (v.score || 0), 0);
    return Math.round((sum / allVisits.length) * 10) / 10;
  }, [allVisits]);

  const similar = useMemo(() => {
    if (!place) return [];
    return allPlaces
      .filter((p) => p.id !== place.id && p.category === place.category && p.borough === place.borough)
      .slice(0, 4);
  }, [allPlaces, place]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!place) return <div className="p-6 text-sm text-muted-foreground">Place not found.</div>;

  const photos = place.official_photos || [];

  return (
    <div className="pb-28">
      <div className="relative h-56 w-full overflow-hidden bg-muted">
        {photos[0] ? (
          <Image src={photos[0]} alt={place.name} fittingType="fill" className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted">
            <CategoryIcon category={place.category} className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <button
          onClick={() => navigate(-1)}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 backdrop-blur tap-highlight"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <CategoryIcon category={place.category} className="h-3.5 w-3.5" />
          {CATEGORY_LABELS[place.category]}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{place.name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[place.neighborhood, place.borough].filter(Boolean).join(" · ")}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border p-3">
            <div className="text-xs text-muted-foreground">Your score</div>
            <div className="mt-1 flex items-center gap-2">
              {myVisit ? <ScoreBadge score={myVisit.score} size="md" /> : <span className="text-muted-foreground text-sm">Not logged</span>}
            </div>
          </div>
          <div className="rounded-2xl border border-border p-3">
            <div className="text-xs text-muted-foreground">Community avg</div>
            <div className="mt-1 flex items-center gap-2">
              {communityAvg != null ? <ScoreBadge score={communityAvg} size="md" /> : <span className="text-muted-foreground text-sm">No ratings</span>}
            </div>
          </div>
        </div>

        {place.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{place.description}</p>}

        <div className="mt-4 space-y-2">
          {place.price_level && <InfoRow icon={<Wallet className="h-4 w-4" />} label="Price" value={place.price_level} />}
          {place.avg_duration && <InfoRow icon={<Clock className="h-4 w-4" />} label="Typical visit" value={place.avg_duration} />}
          {place.best_time_to_go && <InfoRow icon={<Calendar className="h-4 w-4" />} label="Best time" value={place.best_time_to_go} />}
          {place.indoor_or_outdoor && <InfoRow icon={<Building className="h-4 w-4" />} label="Setting" value={place.indoor_or_outdoor} />}
        </div>

        {allVisits.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Community photos</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {allVisits.flatMap((v) => v.photos || []).slice(0, 9).map((ph, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-xl bg-muted">
                  <Image src={ph} alt="" fittingType="fill" className="h-full w-full" />
                </div>
              ))}
            </div>
            {allVisits.length > 0 && (
              <div className="mt-3 space-y-2">
                {allVisits.slice(0, 5).map((v) => (
                  <div key={v.id} className="flex items-center gap-2 rounded-2xl border border-border p-2.5">
                    <ScoreBadge score={v.score} size="sm" />
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {v.note || (v.would_return ? "Would return" : "One and done")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {similar.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Similar places</h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto no-scrollbar px-4">
              {similar.map((p) => <div key={p.id} className="w-44 shrink-0"><PlaceCard place={p} /></div>)}
            </div>
          </section>
        )}
      </div>

      <div className="pb-safe fixed bottom-0 left-0 right-0 z-30 mx-auto flex max-w-md gap-2 border-t border-border bg-card/95 px-4 p-3 backdrop-blur">
        <button
          onClick={() => toggleWantToGo(place)}
          className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-3 text-sm font-medium active:scale-95 ${saved ? "bg-secondary/20 text-secondary-foreground" : "border border-border text-foreground"}`}
        >
          {saved ? <><Check className="h-4 w-4" /> Saved</> : <><Bookmark className="h-4 w-4" /> Save</>}
        </button>
        <button
          onClick={() => navigate(`/log/${place.id}`)}
          className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-95"
        >
          {myVisit ? "Re-rank visit" : "Log a visit"}
        </button>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}