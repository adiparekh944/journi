import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

export default function Layout() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <main className="min-h-[calc(100vh-0px)] pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}