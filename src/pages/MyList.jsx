import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useJourni } from "@/lib/JourniDataContext";
import { Image } from "@/components/ui/image";
import ScoreBadge from "@/components/ScoreBadge";
import CategoryIcon, { CATEGORY_LABELS } from "@/components/CategoryIcon";
import { rankVisits } from "@/../base44/shared/scoring";
import { Share2, MoreHorizontal, ChevronDown, RotateCw, Trash2, Map, SlidersHorizontal, Search } from "lucide-react";

const SORTS = [
  { key: "score", label: "Score" },
  { key: "recent", label: "Recent" },
  { key: "name", label: "Name" },
  { key: "neighborhood", label: "Neighborhood" },
];

export default function MyList() {
  const navigate = useNavigate();
  const { visits, wantToGo, loading, removeVisit } = useJourni();
  const [places, setPlaces] = useState([]);
  const [tab, setTab] = useState("been");
  const [sort, setSort] = useState("score");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await base44.entities.Place.list("-created_date", 500);
        setPlaces(all || []);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const sorted = useMemo(() => {
    let list = [...visits];
    if (sort === "score") list = rankVisits(list);
    else if (sort === "recent") list.sort((a, b) => new Date(b.date_visited || b.created_date) - new Date(a.date_visited || a.created_date));
    else if (sort === "name") list.sort((a, b) => (a.place_name || "").localeCompare(b.place_name || ""));
    else if (sort === "neighborhood") list.sort((a, b) => (a.place_neighborhood || "").localeCompare(b.place_neighborhood || ""));
    return list;
  }, [visits, sort]);

  const savedPlaces = useMemo(
    () => wantToGo.map((w) => places.find((p) => p.id === w.place_id)).filter(Boolean),
    [wantToGo, places]
  );

  const tabs = [
    { key: "been", label: "Been", count: visits.length },
    { key: "want", label: "Want to Try", count: wantToGo.length },
  ];

  return (
    <div className="px-5 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><Share2 className="h-4 w-4" /></button>
        <div className="text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your collection</p>
          <h1 className="font-display text-2xl font-semibold leading-none text-foreground">My lists</h1>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
      </header>

      <div className="mb-3 flex items-center gap-1">
        <ChevronDown className="h-4 w-4 text-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Places</h2>
      </div>

      <div className="mb-4 flex gap-4 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative pb-2 text-sm font-medium ${tab === t.key ? "text-foreground" : "text-muted-foreground"}`}
          >
            {t.label} <span className="text-xs">({t.count})</span>
            {tab === t.key && <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-secondary" />}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"><SlidersHorizontal className="h-3 w-3" /> Borough</button>
          <button className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">Category</button>
        </div>
        <button className="text-muted-foreground"><Search className="h-4 w-4" /></button>
      </div>

      {tab === "been" && (
        <div className="mb-3 flex gap-3">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`text-xs font-medium ${sort === s.key ? "text-foreground" : "text-muted-foreground"}`}
            >
              {s.label}{sort === s.key ? " ↓" : ""}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : tab === "want" ? (
        savedPlaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No saved places yet.</div>
        ) : (
          <div className="space-y-0">
            {savedPlaces.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-border py-3">
                <span className="w-5 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                <button onClick={() => navigate(`/place/${p.id}`)} className="flex flex-1 items-center gap-3 text-left">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-muted">
                    {p.official_photos?.[0] ? <Image src={p.official_photos[0]} alt="" fittingType="fill" className="h-full w-full" /> : <div className="flex h-full w-full items-center justify-center"><CategoryIcon category={p.category} className="h-5 w-5 text-muted-foreground" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.neighborhood ? `${p.neighborhood} · ` : ""}{CATEGORY_LABELS[p.category]}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No visits yet. Log your first place!</div>
      ) : (
        <div className="space-y-0">
          {sorted.map((v, i) => (
            <div key={v.id} className="border-b border-border">
              <div className="flex items-center gap-3 py-3">
                {sort === "score" && <span className="w-5 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>}
                <button onClick={() => navigate(`/place/${v.place_id}`)} className="flex flex-1 items-center gap-3 text-left">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-muted">
                    {v.photos?.[0] ? <Image src={v.photos[0]} alt="" fittingType="fill" className="h-full w-full" /> : <div className="flex h-full w-full items-center justify-center"><CategoryIcon category={v.place_category} className="h-5 w-5 text-muted-foreground" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold text-foreground">{v.place_name}</div>
                    <div className="text-xs text-muted-foreground">{v.place_neighborhood ? `${v.place_neighborhood} · ` : ""}{CATEGORY_LABELS[v.place_category]}</div>
                  </div>
                </button>
                <ScoreBadge score={v.score} size="sm" />
                <button onClick={() => setOpenId(openId === v.id ? null : v.id)} className="p-1 text-muted-foreground">
                  <ChevronDown className={`h-4 w-4 transition ${openId === v.id ? "rotate-180" : ""}`} />
                </button>
              </div>
              {openId === v.id && (
                <div className="bg-muted px-3 pb-3">
                  {v.note && <p className="mb-2 text-sm text-muted-foreground">{v.note}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/log/${v.place_id}?rerank=1`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-xs font-medium text-primary-foreground">
                      <RotateCw className="h-3.5 w-3.5" /> Re-rank
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this visit?")) return;
                        await base44.entities.Visit.delete(v.id);
                        removeVisit(v.id);
                        setOpenId(null);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border py-2 text-xs font-medium text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/map")}
        className="fixed bottom-28 right-5 z-30 flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground shadow-[0_12px_28px_-18px_rgba(20,51,42,0.65)] active:scale-95"
      >
        <Map className="h-4 w-4" /> View Map
      </button>
    </div>
  );
}
