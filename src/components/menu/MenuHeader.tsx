'use client';
import { useRestaurantIdentity } from '@/context/RestaurantIdentityContext';
import React from "react";
import { Bell, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function MenuHeader() {
  const { branchName } = useRestaurantIdentity();
  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="live">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-kinetic-amber)]" />
            OS:LIVE
          </Badge>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold leading-tight">Gastropulse</p>
            <h1 className="text-xl font-bold leading-tight">Menú Qr</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--color-obsidian-lighter)] text-gray-300">
            <Bell size={18} />
          </button>
          <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#ffcca1] text-[#7a3b1a]">
            <User size={18} />
          </button>
        </div>
      </div>

      {/* Table Info Bar */}
      <div className="flex items-center justify-between bg-[var(--color-obsidian-light)] p-2 rounded-xl border border-[var(--color-obsidian-lighter)]">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-[var(--color-obsidian-lighter)] bg-[var(--color-obsidian)] px-2 py-1 flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-[var(--color-kinetic-amber)]" />
            MESA <span className="font-mono font-bold">04</span>
          </Badge>
          <span className="text-sm font-semibold text-gray-300">{branchName}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-blue-300 bg-blue-900/20 px-2 py-1 rounded-full border border-blue-800/30 font-medium">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Sincronizado
        </div>
      </div>
    </div>
  );
}
