import React from "react";
import {
  UtensilsCrossed, Wine, Landmark, Trees, Mountain, Coffee, ShoppingBag,
  Palette, Drama, Store, Building2, Sparkles, MapPin
} from "lucide-react";

const MAP = {
  restaurant: UtensilsCrossed,
  bar: Wine,
  museum: Landmark,
  park: Trees,
  viewpoint: Mountain,
  cafe: Coffee,
  shop: ShoppingBag,
  gallery: Palette,
  theater: Drama,
  market: Store,
  landmark: Building2,
  other: Sparkles,
};

export default function CategoryIcon({ category, className = "h-4 w-4" }) {
  const Icon = MAP[category] || MapPin;
  return <Icon className={className} />;
}

export const CATEGORY_LABELS = {
  restaurant: "Restaurant", bar: "Bar", museum: "Museum", park: "Park",
  viewpoint: "Viewpoint", cafe: "Cafe", shop: "Shop", gallery: "Gallery",
  theater: "Theater", market: "Market", landmark: "Landmark", other: "Place",
};