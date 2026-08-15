import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useJourni } from "@/lib/JourniDataContext";
import PlaceCard from "@/components/PlaceCard";
import { ArrowLeft, Map as MapIcon, List, Sparkles } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const purpleIcon = (label) =>
  L.divIcon({
    className: "",
    html: `<div class="pin-shadow flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export default function WantToGo() {
  const navigate = useNavigate();
  const { wantToGo, toggleWantToGo, loading } = useJourni();
  const [places, setPlaces] = useState([]);
  const [view, setView] = useState("list");

  useEffect(() => {
    (async () => {
      const all = await base44.entities.Place.list("-created_date", 500);
      setPlaces(all || []);
    })();
  }, []);

  const savedPlaces = useMemo(
    () => wantToGo.map((w) => places.find((p) => p.id === w.place_id)).filter(Boolean),
    [wantToGo, places]
  );

  return (
    <div className="px-4 pt-5">
      <header className="mb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="tap-highlight -ml-1 p-1 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-xl font-semibold text-foreground">Want to go</h1>
        <div className="flex rounded-full border border-border p-0.5">
          <button onClick={() => setView("list")} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><List className="h-3.5 w-3.5" /> List</button>
          <button onClick={() => setView("map")} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><MapIcon className="h-3.5 w-3.5" /> Map</button>
        </div>
      </header>

      <button
        onClick={() => navigate("/trip-planner")}
        className="mb-4 flex w-full items-center gap-3 rounded-3xl bg-primary p-4 text-left text-primary-foreground shadow-sm active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Plan your New York trip</span>
          <span className="mt-0.5 block text-xs text-white/60">Turn saved places into a 1–7 day itinerary</span>
        </span>
        <span className="text-lg text-white/60">›</span>
      </button>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : savedPlaces.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No saved places yet. Tap <span className="font-medium text-muted-foreground">Save</span> on any place.
        </div>
      ) : view === "list" ? (
        <div className="grid grid-cols-2 gap-3">
          {savedPlaces.map((p) => (
            <PlaceCard
              key={p.id}
              place={p}
              footer={
                <button onClick={(e) => { e.stopPropagation(); toggleWantToGo(p); }} className="w-full rounded-full bg-primary/20 py-1.5 text-xs font-medium text-foreground">
                  Remove
                </button>
              }
            />
          ))}
        </div>
      ) : (
        <div className="h-[70vh] overflow-hidden rounded-3xl border border-border">
          <MapContainer center={[40.7128, -74.006]} zoom={12} className="h-full w-full">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap" />
            {savedPlaces.map((p) => (
              <Marker key={p.id} position={[p.latitude, p.longitude]} icon={purpleIcon("★")}>
                <Popup>
                  <button onClick={() => navigate(`/place/${p.id}`)} className="font-semibold">{p.name}</button>
                  <div className="text-xs text-muted-foreground">{p.neighborhood}</div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
