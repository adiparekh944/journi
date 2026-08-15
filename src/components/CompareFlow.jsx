import React, { useMemo, useState } from "react";
import { Image } from "@/components/ui/image";
import CategoryIcon from "@/components/CategoryIcon";
import { nextCompareStep, applyCompareResult } from "@/../base44/shared/scoring";

// Head-to-head binary search comparison flow.
// existingSorted: user's visits in the chosen bucket, best -> worst (already scored).
// newVisit: the visit being logged (has place_name, photos, place_category).
// onComplete(index): called with the insertion index in existingSorted.
export default function CompareFlow({ existingSorted, newVisit, onComplete }) {
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(existingSorted.length);
  const [done, setDone] = useState(null); // final index when converged

  const step = useMemo(() => {
    if (done != null) return { done: true, index: done };
    return nextCompareStep(
      existingSorted.map((v) => v.id),
      lo,
      hi
    );
  }, [existingSorted, lo, hi, done]);

  const other = useMemo(() => {
    if (step.done) return null;
    return existingSorted[step.mid];
  }, [step, existingSorted]);

  const handle = (result) => {
    const next = applyCompareResult(
      existingSorted.map((v) => v.id),
      lo,
      hi,
      result
    );
    if (next.done) {
      setDone(next.index);
      onComplete(next.index);
    } else {
      setLo(next.lo);
      setHi(next.hi);
    }
  };

  if (existingSorted.length === 0) {
    // First in bucket -> no comparisons needed.
    return null;
  }

  if (step.done) return null;

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 px-4 pt-2">
        <p className="text-center text-sm text-muted-foreground">Which did you like more?</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <CompareCard visit={newVisit} isNew />
          <CompareCard visit={other} />
        </div>
      </div>

      <div className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handle("win")}
            className="tap-highlight rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground active:scale-95"
          >
            {newVisit.place_name}
          </button>
          <button
            onClick={() => handle("lose")}
            className="tap-highlight rounded-2xl border border-border bg-card py-4 text-sm font-semibold text-foreground active:scale-95"
          >
            {other.place_name}
          </button>
        </div>
        <button
          onClick={() => handle("tie")}
          className="tap-highlight mt-3 w-full rounded-2xl py-3 text-sm font-medium text-muted-foreground active:scale-95"
        >
          Too close to call
        </button>
      </div>
    </div>
  );
}

function CompareCard({ visit, isNew }) {
  const photo = visit.photos?.[0];
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="relative h-32 w-full bg-muted">
        {photo ? (
          <Image src={photo} alt={visit.place_name} fittingType="fill" className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted">
            <CategoryIcon category={visit.place_category} className="h-7 w-7 text-muted-foreground" />
          </div>
        )}
        {isNew && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            New
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="line-clamp-1 text-sm font-semibold text-foreground">{visit.place_name}</div>
        {visit.place_neighborhood && (
          <div className="line-clamp-1 text-xs text-muted-foreground">{visit.place_neighborhood}</div>
        )}
      </div>
    </div>
  );
}