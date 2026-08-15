import React from "react";
import { useNavigate } from "react-router-dom";
import { Image } from "@/components/ui/image";
import CategoryIcon, { CATEGORY_LABELS } from "@/components/CategoryIcon";

export default function FeaturedLists({ places }) {
  const navigate = useNavigate();
  const cats = ["restaurant", "bar", "cafe", "museum", "park", "landmark"];
  const lists = cats
    .map((cat) => {
      const catPlaces = (places || []).filter((p) => p.category === cat);
      return {
        title: `Top NYC ${CATEGORY_LABELS[cat]}s`,
        count: catPlaces.length,
        photo: catPlaces[0]?.official_photos?.[0],
        category: cat,
      };
    })
    .filter((l) => l.count > 0);

  if (!lists.length) return null;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-stone-900">Featured Lists</h2>
        <button onClick={() => navigate("/search")} className="text-xs font-medium text-stone-500">See all</button>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {lists.map((l) => (
          <button
            key={l.category}
            onClick={() => navigate(`/search?category=${l.category}`)}
            className="relative h-32 w-44 shrink-0 overflow-hidden rounded-2xl active:scale-[0.98]"
          >
            {l.photo ? (
              <Image src={l.photo} alt="" fittingType="fill" className="h-full w-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-200">
                <CategoryIcon category={l.category} className="h-8 w-8 text-stone-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-white">
              <div className="text-sm font-bold leading-tight">{l.title}</div>
              <div className="text-[11px] text-white/80">{l.count} places</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}