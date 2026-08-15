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
    <div className="px-4 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <button className="p-1 text-stone-500"><Share2 className="h-5 w-5" /></button>
        <h1 className="text-sm font-bold uppercase tracking-wide text-stone-900">My Lists</h1>
        <button className="p-1 text-stone-500"><MoreHorizontal className="h-5 w-5" /></button>
      </header>

      <div className="mb-3 flex items-center gap-1">
        <ChevronDown className="h-4 w-4 text-stone-900" />
        <h2 className="text-lg font-bold text-stone-900">Places</h2>
      </div>

      <div className="mb-4 flex gap-4 border-b border-stone-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative pb-2 text-sm font-medium ${tab === t.key ? "text-stone-900" : "text-stone-400"}`}
          >
            {t.label} <span className="text-xs">({t.count})</span>
            {tab === t.key && <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button className="flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600"><SlidersHorizontal className="h-3 w-3" /> Borough</button>
          <button className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600">Category</button>
        </div>
        <button className="text-stone-500"><Search className="h-4 w-4" /></button>
      </div>

      {tab === "been" && (
        <div className="mb-3 flex gap-3">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`text-xs font-medium ${sort === s.key ? "text-stone-900" : "text-stone-400"}`}
            >
              {s.label}{sort === s.key ? " ↓" : ""}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-stone-100" />)}</div>
      ) : tab === "want" ? (
        savedPlaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">No saved places yet.</div>
        ) : (
          <div className="space-y-0">
            {savedPlaces.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-stone-100 py-3">
                <span className="w-5 text-center text-sm font-bold text-stone-400">{i + 1}</span>
                <button onClick={() => navigate(`/place/${p.id}`)} className="flex flex-1 items-center gap-3 text-left">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-stone-100">
                    {p.official_photos?.[0] ? <Image src={p.official_photos[0]} alt="" fittingType="fill" className="h-full w-full" /> : <div className="flex h-full w-full items-center justify-center"><CategoryIcon category={p.category} className="h-5 w-5 text-stone-400" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold text-stone-900">{p.name}</div>
                    <div className="text-xs text-stone-500">{p.neighborhood ? `${p.neighborhood} · ` : ""}{CATEGORY_LABELS[p.category]}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">No visits yet. Log your first place!</div>
      ) : (
        <div className="space-y-0">
          {sorted.map((v, i) => (
            <div key={v.id} className="border-b border-stone-100">
              <div className="flex items-center gap-3 py-3">
                {sort === "score" && <span className="w-5 text-center text-sm font-bold text-stone-400">{i + 1}</span>}
                <button onClick={() => navigate(`/place/${v.place_id}`)} className="flex flex-1 items-center gap-3 text-left">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-stone-100">
                    {v.photos?.[0] ? <Image src={v.photos[0]} alt="" fittingType="fill" className="h-full w-full" /> : <div className="flex h-full w-full items-center justify-center"><CategoryIcon category={v.place_category} className="h-5 w-5 text-stone-400" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold text-stone-900">{v.place_name}</div>
                    <div className="text-xs text-stone-500">{v.place_neighborhood ? `${v.place_neighborhood} · ` : ""}{CATEGORY_LABELS[v.place_category]}</div>
                  </div>
                </button>
                <ScoreBadge score={v.score} size="sm" />
                <button onClick={() => setOpenId(openId === v.id ? null : v.id)} className="p-1 text-stone-400">
                  <ChevronDown className={`h-4 w-4 transition ${openId === v.id ? "rotate-180" : ""}`} />
                </button>
              </div>
              {openId === v.id && (
                <div className="bg-stone-50 px-3 pb-3">
                  {v.note && <p className="mb-2 text-sm text-stone-600">{v.note}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/log/${v.place_id}?rerank=1`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-xs font-medium text-white">
                      <RotateCw className="h-3.5 w-3.5" /> Re-rank
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this visit?")) return;
                        await base44.entities.Visit.delete(v.id);
                        removeVisit(v.id);
                        setOpenId(null);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2 text-xs font-medium text-red-500"
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
        className="fixed bottom-24 right-4 z-30 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg active:scale-95"
      >
        <Map className="h-4 w-4" /> View Map
      </button>
    </div>
  );
}