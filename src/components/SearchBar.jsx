import React from "react";
import { Search } from "lucide-react";

export default function SearchBar({ value, onChange, placeholder = "Search places, neighborhoods" }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-stone-200 bg-stone-100 pl-9 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-300 focus:bg-white focus:outline-none"
      />
    </div>
  );
}