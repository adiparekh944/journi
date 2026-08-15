import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useJourni } from "@/lib/JourniDataContext";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { scoreColorHex } from "@/../base44/shared/scoring";
import { CATEGORY_LABELS } from "@/components/CategoryIcon";
import { Maximize2, Crosshair, MapPin } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const pinIcon = (score, want) => {
  if (want) {
    return L.divIcon({ className: "", html: `<div class="pin-shadow flex h-7 min-w-7 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">★</div>`, iconSize: [28, 28], iconAnchor: [14, 14] });
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

// Miles, because that is how New Yorkers describe walking distance.
const RADIUS_OPTIONS = [0.5, 1, 2, 5, 10];
const METRES_PER_MILE = 1609.34;

/** Great-circle distance in miles. */
function milesBetween(fromLat, fromLng, toLat, toLng) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(deltaLng / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const homeIcon = L.divIcon({
  className: "",
  html: `<div class="pin-shadow flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-score-want text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

/** While picking, a tap on the map moves the location pin. */
function LocationPicker({ active, onPick }) {
  useMapEvents({
    click(event) {
      if (active) onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const { visits, wantToGo, loading } = useJourni();
  const [places, setPlaces] = useState([]);
  const [filter, setFilter] = useState("All");
  const [category, setCategory] = useState("all");
  const [fitTrigger, setFitTrigger] = useState(0);
  const { user, checkUserAuth } = useAuth();
  const [radius, setRadius] = useState(2);
  const [radiusOn, setRadiusOn] = useState(true);
  const [picking, setPicking] = useState(false);
  const [home, setHome] = useState(null);

  useEffect(() => {
    if (user?.home_latitude != null && user?.home_longitude != null) {
      setHome({ lat: user.home_latitude, lng: user.home_longitude });
    }
    if (user?.home_radius_miles) setRadius(Number(user.home_radius_miles));
  }, [user?.home_latitude, user?.home_longitude, user?.home_radius_miles]);

  const saveRadius = async (miles) => {
    setRadius(miles);
    try {
      await base44.auth.updateMe({ home_radius_miles: miles });
    } catch (error) {
      console.error("Could not save your radius", error);
    }
  };

  const saveHome = async (lat, lng) => {
    setHome({ lat, lng });
    setPicking(false);
    try {
      await base44.auth.updateMe({ home_latitude: lat, home_longitude: lng });
      await checkUserAuth();
    } catch (error) {
      console.error("Could not save your location", error);
    }
  };

  const useDeviceLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        void saveHome(position.coords.latitude, position.coords.longitude),
      (error) => console.warn("Location unavailable", error.message),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

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
    list = list.filter(hasCoordinates);
    if (radiusOn && home) {
      list = list.filter(
        (p) => milesBetween(home.lat, home.lng, p.lat, p.lng) <= radius,
      );
    }
    return list;
  }, [visits, wantToGo, places, filter, category, radiusOn, home, radius]);

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
            {home && radiusOn && (
              <Circle
                center={[home.lat, home.lng]}
                radius={radius * METRES_PER_MILE}
                pathOptions={{
                  color: "hsl(var(--score-want))",
                  weight: 1.5,
                  opacity: 0.7,
                  dashArray: "5 5",
                  fillColor: "hsl(var(--score-want))",
                  fillOpacity: 0.06,
                }}
              />
            )}
            {home && (
              <Marker position={[home.lat, home.lng]} icon={homeIcon}>
                <Popup>
                  <div className="font-semibold">You are here</div>
                  <div className="text-xs text-muted-foreground">
                    {radius} mi radius
                  </div>
                </Popup>
              </Marker>
            )}
            <LocationPicker active={picking} onPick={saveHome} />
            <FitBounds pins={pins} fitTrigger={fitTrigger} />
          </MapContainer>
          <div className="absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 rounded-full bg-card/95 px-1.5 py-1 pin-shadow backdrop-blur">
            <button
              onClick={() => setRadiusOn((on) => !on)}
              title={radiusOn ? "Hide radius" : "Show radius"}
              className={`tap-highlight flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold ${
                radiusOn ? "bg-score-want text-white" : "text-muted-foreground"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {radius} mi
            </button>
            {radiusOn && (
              <div className="flex items-center gap-0.5">
                {RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => saveRadius(option)}
                    className={`tap-highlight h-6 rounded-full px-1.5 text-[10px] font-medium ${
                      radius === option
                        ? "bg-foreground text-background"
                        : "text-muted-foreground"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setPicking((on) => !on)}
              title="Move my location"
              className={`tap-highlight flex h-7 w-7 items-center justify-center rounded-full ${
                picking ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
            </button>
          </div>
          {picking && (
            <div className="absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-background pin-shadow">
              Tap the map to set your location
              <button onClick={useDeviceLocation} className="ml-2 underline">
                use my GPS
              </button>
            </div>
          )}
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
