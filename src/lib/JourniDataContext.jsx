import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const JourniContext = createContext(null);

export function JourniDataProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [visits, setVisits] = useState([]);
  const [wantToGo, setWantToGo] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [v, w] = await Promise.all([
        base44.entities.Visit.filter({ user_id: user.id }, "-score", 500),
        base44.entities.WantToGo.filter({ user_id: user.id }, "-created_date", 500),
      ]);
      setVisits(v || []);
      setWantToGo(w || []);
    } catch (e) {
      console.error("load journi data failed", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.id) reload();
    else {
      setVisits([]);
      setWantToGo([]);
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, reload]);

  const addVisit = (v) => setVisits((prev) => [...prev, v]);
  const updateVisit = (id, patch) =>
    setVisits((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeVisit = (id) => setVisits((prev) => prev.filter((x) => x.id !== id));

  const toggleWantToGo = async (place) => {
    const existing = wantToGo.find((w) => w.place_id === place.id);
    if (existing) {
      await base44.entities.WantToGo.delete(existing.id);
      setWantToGo((prev) => prev.filter((w) => w.id !== existing.id));
    } else {
      const created = await base44.entities.WantToGo.create({ user_id: user.id, place_id: place.id });
      setWantToGo((prev) => [created, ...prev]);
    }
  };

  return (
    <JourniContext.Provider
      value={{
        visits,
        wantToGo,
        loading,
        reload,
        addVisit,
        updateVisit,
        removeVisit,
        toggleWantToGo,
      }}
    >
      {children}
    </JourniContext.Provider>
  );
}

export function useJourni() {
  const ctx = useContext(JourniContext);
  if (!ctx) throw new Error("useJourni must be used within JourniDataProvider");
  return ctx;
}