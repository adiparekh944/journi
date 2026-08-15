import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <main className="min-h-[calc(100vh-0px)] pb-24">
        {/* The boundary sits inside the layout so a crashed screen keeps the
            tab bar alive, and resets whenever the route changes. */}
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <BottomNav />
    </div>
  );
}
