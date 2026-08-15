import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useJourni } from "@/lib/JourniDataContext";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { scoreColorHex } from "@/../base44/shared/scoring";
import { CATEGORY_LABELS } from "@/components/CategoryIcon";
import { Maximize2 } from "lucide-react";

const pinIcon = (score, want) => {
  if (want) {
    return L.divIcon({ className: "", html: `<div class="pin-shadow flex h-7 min-w-7 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-primary-foreground">★</div>`, iconSize: [28, 28], iconAnchor: [14, 14] });
  }
  const color = scoreColorHex(score);
  const label = score == null ? "–" : Number(score).toFixed(1);
  return L.divIcon({ className: "", html: `<div class="pin-shadow flex h-8 min-w-8 items-center justify-center rounded-full text-[11px] font-bold text-primary-foreground" style="background:${color}">${label}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] });
};

function FitBounds({ pins, fitTrigger }) {
  const map = useMap();
  useEffect(() => {
    if (!pins.length) return;
    // A single pin with a missing coordinate used to throw out of Leaflet and
    // unmount the whole app, so build the bounds defensively.
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
    if (!bounds.isValid()) return;
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [pins, map, fitTrigger]);
  return null;
}

/** Leaflet cannot plot a pin without a finite pair of coordinates. */
const hasCoordinates = (pin) =>
  Number.isFinite(Number(pin.lat)) && Number.isFinite(Number(pin.lng));

const FILTERS = ["All", "Been", "Want to Go"];

export default function MapPage() {
  const navigate = useNavigate();
  const { visits, wantToGo, loading } = useJourni();
  const [places, setPlaces] = useState([]);
  const [filter, setFilter] = useState("All");
  const [category, setCategory] = useState("all");
  const [fitTrigger, setFitTrigger] = useState(0);

  useEffect(() => {
    (async () => setPlaces((await base44.entities.Place.list("-created_date", 500)) || []))();
  }, []);

  const visitedIds = useMemo(() => new Set(visits.map((v) => v.place_id)), [visits]);
  const wantIds = useMemo(() => new Set(wantToGo.map((w) => w.place_id)), [wantToGo]);

  const pins = useMemo(() => {
    let list = [];
    if (filter === "All" || filter === "Been") {
      visits.forEach((v) => list.push({ id: v.place_id, lat: v.place_latitude, lng: v.place_longitude, score: v.score, want: false, place: { id: v.place_id, name: v.place_name, neighborhood: v.place_neighborhood, category: v.place_category } }));
    }
    if (filter === "All" || filter === "Want to Go") {
      wantToGo.forEach((w) => {
        const p = places.find((x) => x.id === w.place_id);
        if (p) list.push({ id: p.id, lat: p.latitude, lng: p.longitude, score: null, want: true, place: p });
      });
    }
    if (category !== "all") list = list.filter((p) => p.place.category === category);
    return list.filter(hasCoordinates);
  }, [visits, wantToGo, places, filter, category]);

  const boroughProgress = useMemo(() => {
    const boroughs = ["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"];
    return boroughs.map((b) => {
      const total = places.filter((p) => p.borough === b).length;
      const done = places.filter((p) => p.borough === b && visitedIds.has(p.id)).length;
      return { borough: b, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
    });
  }, [places, visitedIds]);

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <div className="px-4 pt-5">
        <h1 className="text-xl font-semibold text-foreground">Map</h1>
        <div className="mt-2 flex gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`tap-highlight rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-stone-600"}`}>{f}</button>
          ))}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setCategory("all")} className={`tap-highlight shrink-0 rounded-full px-3 py-1 text-xs ${category === "all" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>All</button>
          {Object.keys(CATEGORY_LABELS).map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`tap-highlight shrink-0 rounded-full px-3 py-1 text-xs ${category === c ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>{CATEGORY_LABELS[c]}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex-1 px-4">
        <div className="relative h-full overflow-hidden rounded-3xl border border-border">
          <MapContainer center={[40.7128, -74.006]} zoom={12} className="h-full w-full">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap" />
            {pins.map((p) => (
              <Marker key={`${p.id}-${p.want}`} position={[p.lat, p.lng]} icon={pinIcon(p.score, p.want)}>
                <Popup>
                  <button onClick={() => navigate(`/place/${p.place.id}`)} className="font-semibold">{p.place.name}</button>
                  <div className="text-xs text-muted-foreground">{p.place.neighborhood}</div>
                </Popup>
              </Marker>
            ))}
            <FitBounds pins={pins} fitTrigger={fitTrigger} />
          </MapContainer>
          <button
            onClick={() => setFitTrigger((t) => t + 1)}
            className="absolute right-3 top-3 z-[500] flex h-9 w-9 items-center justify-center rounded-full bg-card pin-shadow"
            title="Zoom to fit"
          >
            <Maximize2 className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="grid grid-cols-5 gap-2">
          {boroughProgress.map((b) => (
            <div key={b.borough} className="text-center">
              <div className="mx-auto h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${b.pct}%` }} />
              </div>
              <div className="mt-1 truncate text-[9px] text-muted-foreground">{b.borough.replace("The ", "")}</div>
              <div className="text-[9px] font-medium text-muted-foreground">{b.done}/{b.total}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}