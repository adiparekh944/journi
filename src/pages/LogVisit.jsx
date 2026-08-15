import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useJourni } from "@/lib/JourniDataContext";
import { recomputeBucketScores, rankVisits, BUCKETS, BUCKET_ORDER } from "@/../base44/shared/scoring";
import PhotoInput from "@/components/PhotoInput";
import ScoreBadge from "@/components/ScoreBadge";
import { Image } from "@/components/ui/image";
import CategoryIcon, { CATEGORY_LABELS } from "@/components/CategoryIcon";
import SearchBar from "@/components/SearchBar";
import CompareFlow from "@/components/CompareFlow";
import FriendTagger from "@/components/FriendTagger";
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";

const CROWD = ["Empty", "Calm", "Moderate", "Busy", "Packed"];

export default function LogVisit() {
  const { placeId } = useParams();
  const [params] = useSearchParams();
  const isRerank = params.get("rerank") === "1";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { visits, addVisit, updateVisit, removeVisit } = useJourni();

  const [step, setStep] = useState(placeId ? "details" : "place");
  const [place, setPlace] = useState(null);
  const [allPlaces, setAllPlaces] = useState([]);
  const [query, setQuery] = useState("");

  const [form, setForm] = useState({
    photos: [],
    note: "",
    date_visited: new Date().toISOString().slice(0, 10),
    paid: false,
    amount_paid: "",
    worth_it_rating: 3,
    crowd_level: "Moderate",
    duration: "",
    companions: "",
    tagged_user_ids: [],
    would_return: true,
  });
  const [bucket, setBucket] = useState(null);
  const [result, setResult] = useState(null);

  // load places + place
  useEffect(() => {
    (async () => {
      try {
        const places = await base44.entities.Place.list("-created_date", 500);
        setAllPlaces(places || []);
        if (placeId) {
          const p = places.find((x) => x.id === placeId) || await base44.entities.Place.get(placeId);
          setPlace(p);
        }
      } catch (e) { console.error(e); }
    })();
  }, [placeId]);

  // rerank: load existing visit details
  useEffect(() => {
    if (isRerank && placeId && user?.id) {
      const existing = visits.find((v) => v.place_id === placeId && v.user_id === user.id);
      if (existing) {
        setPlace(allPlaces.find((p) => p.id === placeId) || null);
        setForm({
          photos: existing.photos || [],
          note: existing.note || "",
          date_visited: existing.date_visited || form.date_visited,
          paid: existing.paid,
          amount_paid: existing.amount_paid ?? "",
          worth_it_rating: existing.worth_it_rating || 3,
          crowd_level: existing.crowd_level || "Moderate",
          duration: existing.duration || "",
          companions: existing.companions || "",
          tagged_user_ids: existing.tagged_user_ids || [],
          would_return: existing.would_return ?? true,
        });
        setBucket(existing.sentiment_bucket);
      }
    }
  }, [isRerank, placeId, user?.id, visits, allPlaces]);

  const placeResults = useMemo(() => {
    if (!query.trim()) return allPlaces.slice(0, 30);
    const q = query.toLowerCase();
    return allPlaces.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.neighborhood?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [allPlaces, query]);

  const bucketVisits = useMemo(() => {
    if (!bucket) return [];
    return visits
      .filter((v) => v.sentiment_bucket === bucket && v.user_id === user.id)
      .filter((v) => !(isRerank && v.place_id === placeId))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [bucket, visits, user?.id, isRerank, placeId]);

  const handleCompareComplete = async (index) => {
    const newVisitTempId = isRerank ? "rerank" : "new";
    const newVisitTemp = {
      id: newVisitTempId,
      place_id: place.id,
      place_name: place.name,
      place_category: place.category,
      place_neighborhood: place.neighborhood,
      place_borough: place.borough,
      place_latitude: place.latitude,
      place_longitude: place.longitude,
    };
    const finalSorted = [...bucketVisits];
    finalSorted.splice(index, 0, newVisitTemp);
    const scores = recomputeBucketScores(finalSorted, bucket);
    const newScore = scores[newVisitTempId];

    // persist: update shifted existing visits' scores
    const updates = [];
    for (const v of bucketVisits) {
      const s = scores[v.id];
      if (s != null && s !== v.score) updates.push({ id: v.id, score: s });
    }

    const visitData = {
      user_id: user.id,
      place_id: place.id,
      place_name: place.name,
      place_category: place.category,
      place_neighborhood: place.neighborhood,
      place_borough: place.borough,
      place_latitude: place.latitude,
      place_longitude: place.longitude,
      photos: form.photos,
      note: form.note,
      date_visited: form.date_visited,
      paid: form.paid,
      amount_paid: form.amount_paid ? Number(form.amount_paid) : null,
      worth_it_rating: Number(form.worth_it_rating),
      crowd_level: form.crowd_level,
      duration: form.duration,
      companions: form.companions,
      tagged_user_ids: form.tagged_user_ids,
      would_return: form.would_return,
      sentiment_bucket: bucket,
      score: newScore,
    };

    try {
      if (isRerank) {
        const existing = visits.find((v) => v.place_id === placeId && v.user_id === user.id);
        if (existing) {
          await base44.entities.Visit.update(existing.id, { ...visitData, score: newScore });
          updateVisit(existing.id, { ...visitData, score: newScore });
        }
      } else {
        const created = await base44.entities.Visit.create(visitData);
        addVisit(created);
      }
      if (updates.length) await base44.entities.Visit.bulkUpdate(updates.map((u) => ({ id: u.id, score: u.score })));

      // recompute global ranks
      const allVisits = rankVisits([
        ...visits.filter((v) => !(isRerank && v.place_id === placeId)),
        { ...visitData, id: isRerank ? (visits.find((v) => v.place_id === placeId && v.user_id === user.id)?.id) : "new" },
      ]);
      // ranks are derived from score sort; skip persisting rank to avoid mass writes.
    } catch (e) {
      console.error(e);
      alert("Could not save visit. Please try again.");
      return;
    }

    setResult({ score: newScore, bucket, index, total: finalSorted.length });
    setStep("result");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-3 px-4 pt-5">
        {(step !== "result") && (
          <button onClick={() => navigate(-1)} className="tap-highlight -ml-1 p-1 text-stone-500">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-stone-900">
            {step === "place" ? "Log a visit" : step === "details" ? "Visit details" : step === "bucket" ? "How was it?" : step === "compare" ? "Head-to-head" : "Done!"}
          </h1>
          <StepDots step={step} />
        </div>
      </header>

      {step === "place" && (
        <div className="flex-1 px-4 pt-4">
          <SearchBar value={query} onChange={setQuery} placeholder="Search NYC places" />
          <div className="mt-3 space-y-2">
            {placeResults.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPlace(p); setStep("details"); }}
                className="tap-highlight flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-card p-2.5 text-left active:scale-[0.99]"
              >
                <div className="h-12 w-12 overflow-hidden rounded-xl bg-stone-100">
                  {p.official_photos?.[0] ? (
                    <Image src={p.official_photos[0]} alt="" fittingType="fill" className="h-full w-full" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><CategoryIcon category={p.category} className="h-5 w-5 text-stone-400" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-semibold text-stone-900">{p.name}</div>
                  <div className="text-xs text-stone-500">{CATEGORY_LABELS[p.category]} · {[p.neighborhood, p.borough].filter(Boolean).join(", ")}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "details" && place && (
        <div className="flex-1 overflow-y-auto px-4 pt-4">
          <PlaceHeader place={place} />
          <div className="mt-4 space-y-4">
            <Field label="Photos (up to 6)">
              <PhotoInput photos={form.photos} onChange={(p) => setForm({ ...form, photos: p })} />
            </Field>
            <Field label="Note">
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                placeholder="What stood out?"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm focus:border-stone-400 focus:bg-card focus:outline-none"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date visited">
                <input type="date" value={form.date_visited} onChange={(e) => setForm({ ...form, date_visited: e.target.value })} className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm focus:outline-none" />
              </Field>
              <Field label="How long?">
                <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="2 hrs" className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm focus:outline-none" />
              </Field>
            </div>
            <Field label="Worth it? (1–5)">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setForm({ ...form, worth_it_rating: n })} className={`tap-highlight h-10 flex-1 rounded-xl text-sm font-semibold ${form.worth_it_rating >= n ? "bg-amber-400 text-amber-950" : "bg-stone-100 text-stone-400"}`}>{n}</button>
                ))}
              </div>
            </Field>
            <Field label="Crowd level">
              <div className="flex gap-2">
                {CROWD.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, crowd_level: c })} className={`tap-highlight h-9 flex-1 rounded-xl text-[11px] font-medium ${form.crowd_level === c ? "bg-primary text-white" : "bg-stone-100 text-stone-500"}`}>{c}</button>
                ))}
              </div>
            </Field>
            <Field label="Who did you go with?">
              <FriendTagger taggedIds={form.tagged_user_ids} onChange={(ids) => setForm({ ...form, tagged_user_ids: ids })} />
              <input value={form.companions} onChange={(e) => setForm({ ...form, companions: e.target.value })} placeholder="Or type names (solo, partner, etc.)" className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm focus:outline-none" />
            </Field>
            <button onClick={() => setForm({ ...form, paid: !form.paid })} className="tap-highlight flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-card p-3">
              <span className="text-sm font-medium text-stone-700">Did you pay?</span>
              <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${form.paid ? "bg-primary" : "bg-stone-200"}`}>
                <span className={`h-5 w-5 rounded-full bg-white transition ${form.paid ? "translate-x-5" : ""}`} />
              </span>
            </button>
            {form.paid && (
              <Field label="Amount paid ($)">
                <input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm focus:outline-none" />
              </Field>
            )}
            <button onClick={() => setForm({ ...form, would_return: !form.would_return })} className="tap-highlight flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-card p-3">
              <span className="text-sm font-medium text-stone-700">Would you return?</span>
              <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${form.would_return ? "bg-primary" : "bg-stone-200"}`}>
                <span className={`h-5 w-5 rounded-full bg-white transition ${form.would_return ? "translate-x-5" : ""}`} />
              </span>
            </button>
          </div>
          <div className="pb-28 pt-6 space-y-2">
            <button onClick={() => setStep("bucket")} className="tap-highlight flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-white active:scale-95">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
            {isRerank && (
              <button
                onClick={async () => {
                  if (!confirm("Delete this visit?")) return;
                  const existing = visits.find((v) => v.place_id === placeId && v.user_id === user.id);
                  if (existing) {
                    await base44.entities.Visit.delete(existing.id);
                    removeVisit(existing.id);
                    navigate("/list");
                  }
                }}
                className="tap-highlight w-full rounded-full py-3 text-sm font-medium text-red-500"
              >
                Delete visit
              </button>
            )}
          </div>
        </div>
      )}

      {step === "bucket" && place && (
        <div className="flex flex-1 flex-col px-4 pt-4">
          <PlaceHeader place={place} />
          <p className="mt-4 text-sm text-stone-500">Pick the bucket that fits. We'll find your precise score from there.</p>
          <div className="mt-4 space-y-3">
            {BUCKET_ORDER.map((b) => (
              <button
                key={b}
                onClick={() => { setBucket(b); setStep("compare"); }}
                className="tap-highlight w-full rounded-3xl border border-stone-200 bg-card p-4 text-left active:scale-[0.99]"
              >
                <div className="text-base font-semibold text-stone-900">{BUCKETS[b].label}</div>
                <div className="text-sm text-stone-500">{BUCKETS[b].blurb}</div>
                <div className="mt-1 text-xs text-stone-400">{bucketCountFor(b, visits, user.id)} in this bucket</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "compare" && bucket && place && (
        <>
          <div className="px-4 pt-2">
            <PlaceHeader place={place} compact />
          </div>
          {bucketVisits.length === 0 ? (
            <FirstInBucket onComplete={() => handleCompareComplete(0)} place={place} />
          ) : (
            <CompareFlow
              existingSorted={bucketVisits}
              newVisit={{
                id: isRerank ? "rerank" : "new",
                place_id: place.id,
                place_name: place.name,
                place_category: place.category,
                place_neighborhood: place.neighborhood,
                photos: form.photos,
              }}
              onComplete={handleCompareComplete}
            />
          )}
        </>
      )}

      {step === "result" && result && place && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Trophy className="h-10 w-10 text-amber-500" />
          <p className="mt-3 text-sm text-stone-500">{place.name} landed at</p>
          <div className="my-2"><ScoreBadge score={result.score} size="lg" /></div>
          <p className="text-sm text-stone-500">
            #{result.index + 1} of {result.total} in your "{BUCKETS[result.bucket].label}" bucket
          </p>
          <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
            <button onClick={() => navigate("/list")} className="tap-highlight w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-white active:scale-95">See my ranked list</button>
            <button onClick={() => navigate(`/place/${place.id}`)} className="tap-highlight w-full rounded-full py-3.5 text-sm font-medium text-stone-600">View place</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FirstInBucket({ onComplete, place }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-stone-500">
        This is your first "{place.name}" rating in this bucket.
      </p>
      <button onClick={onComplete} className="tap-highlight mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white active:scale-95">
        Reveal my score
      </button>
    </div>
  );
}

function bucketCountFor(bucket, visits, userId) {
  return visits.filter((v) => v.sentiment_bucket === bucket && v.user_id === userId).length;
}

function PlaceHeader({ place, compact }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-14 w-14 overflow-hidden rounded-2xl bg-stone-100">
        {place.official_photos?.[0] ? (
          <Image src={place.official_photos[0]} alt="" fittingType="fill" className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"><CategoryIcon category={place.category} className="h-6 w-6 text-stone-400" /></div>
        )}
      </div>
      <div>
        <div className="font-semibold text-stone-900">{place.name}</div>
        <div className="text-xs text-stone-500">{CATEGORY_LABELS[place.category]} · {[place.neighborhood, place.borough].filter(Boolean).join(", ")}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-stone-500">{label}</div>
      {children}
    </div>
  );
}

function StepDots({ step }) {
  const order = ["place", "details", "bucket", "compare", "result"];
  const active = order.indexOf(step);
  return (
    <div className="mt-2 flex gap-1">
      {order.map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full ${i <= active ? "bg-primary" : "bg-stone-200"}`} />
      ))}
    </div>
  );
}