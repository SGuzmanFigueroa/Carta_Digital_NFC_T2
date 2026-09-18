import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Box } from "lucide-react";

export function ARBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--color-obsidian-light)] border border-[var(--color-obsidian-lighter)] p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-800/50 text-[var(--color-kinetic-amber)] border border-gray-700">
          <Box size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-white">Experiencia Holográfica 3D</h3>
            <Badge variant="amber" className="px-1.5 py-0 text-[9px] uppercase">Nuevo</Badge>
          </div>
          <p className="text-xs text-gray-400">Previsualiza porciones en tu mesa con AR</p>
        </div>
      </div>
      <button className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--color-obsidian-lighter)] text-gray-300">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
      </button>
    </div>
  );
}
