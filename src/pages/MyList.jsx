import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useJourni } from "@/lib/JourniDataContext";
import { Image } from "@/components/ui/image";
import ScoreBadge from "@/components/ScoreBadge";
import CategoryIcon, { CATEGORY_LABELS } from "@/components/CategoryIcon";
import { rankVisits } from "@/../base44/shared/scoring";
import { ArrowLeft, RotateCw, Trash2, ChevronDown } from "lucide-react";

const SORTS = [
  { key: "score", label: "Score" },
  { key: "recent", label: "Recent" },
  { key: "name", label: "Name" },
  { key: "neighborhood", label: "Neighborhood" },
];

export default function MyList() {
  const navigate = useNavigate();
  const { visits, loading, removeVisit } = useJourni();
  const [sort, setSort] = useState("score");
  const [openId, setOpenId] = useState(null);

  const sorted = useMemo(() => {
    let list = [...visits];
    if (sort === "score") list = rankVisits(list);
    else if (sort === "recent") list.sort((a, b) => new Date(b.date_visited || b.created_date) - new Date(a.date_visited || a.created_date));
    else if (sort === "name") list.sort((a, b) => (a.place_name || "").localeCompare(b.place_name || ""));
    else if (sort === "neighborhood") list.sort((a, b) => (a.place_neighborhood || "").localeCompare(b.place_neighborhood || ""));
    return list;
  }, [visits, sort]);

  return (
    <div className="px-4 pt-5">
      <header className="mb-3 flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="tap-highlight -ml-1 p-1 text-stone-500">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-stone-900">My ranked list</h1>
      </header>

      <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`tap-highlight shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${sort === s.key ? "border-primary bg-primary text-white" : "border-stone-200 bg-card text-stone-600"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-stone-100" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">
          No visits yet. Log your first place!
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((v, i) => (
            <div key={v.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-card">
              <div className="flex items-center gap-3 p-2.5">
                {sort === "score" && <span className="w-5 text-center text-xs font-semibold text-stone-400">{i + 1}</span>}
                <button onClick={() => navigate(`/place/${v.place_id}`)} className="flex flex-1 items-center gap-3 text-left">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-stone-100">
                    {v.photos?.[0] ? (
                      <Image src={v.photos[0]} alt="" fittingType="fill" className="h-full w-full" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><CategoryIcon category={v.place_category} className="h-5 w-5 text-stone-400" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold text-stone-900">{v.place_name}</div>
                    <div className="text-xs text-stone-500">{v.place_neighborhood ? `${v.place_neighborhood} · ` : ""}{CATEGORY_LABELS[v.place_category]}</div>
                  </div>
                </button>
                <ScoreBadge score={v.score} size="sm" />
                <button onClick={() => setOpenId(openId === v.id ? null : v.id)} className="tap-highlight p-1 text-stone-400">
                  <ChevronDown className={`h-4 w-4 transition ${openId === v.id ? "rotate-180" : ""}`} />
                </button>
              </div>
              {openId === v.id && (
                <div className="border-t border-stone-100 bg-stone-50 px-3 py-2">
                  {v.note && <p className="mb-2 text-sm text-stone-600">{v.note}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/log/${v.place_id}?rerank=1`)} className="tap-highlight flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-xs font-medium text-white">
                      <RotateCw className="h-3.5 w-3.5" /> Re-rank
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this visit?")) return;
                        await base44.entities.Visit.delete(v.id);
                        removeVisit(v.id);
                        setOpenId(null);
                      }}
                      className="tap-highlight flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2 text-xs font-medium text-red-500"
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
    </div>
  );
}