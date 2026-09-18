import React from "react";
import { Star, Box } from "lucide-react";

export function ProductCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-[var(--color-obsidian-light)] border border-[var(--color-obsidian-lighter)] relative">
      {/* Image Container */}
      <div className="relative h-56 w-full bg-neutral-800">
        <img 
          src="https://images.unsplash.com/photo-1544025162-8311e3b5e40e?q=80&w=800&auto=format&fit=crop" 
          alt="Wagyu Ribeye" 
          className="w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-obsidian-light)] via-transparent to-transparent opacity-90" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex gap-2">
            <div className="bg-[var(--color-kinetic-amber)] text-white text-[10px] font-bold px-2 py-1 flex items-center gap-1 rounded-sm uppercase tracking-wide">
              <Star size={10} fill="currentColor" /> CHEF CHOICE
            </div>
            <div className="bg-black/60 backdrop-blur-md text-gray-300 border border-gray-700 text-[10px] font-mono px-2 py-1 rounded-sm tracking-widest uppercase">
              A5 MIYAZAKI
            </div>
          </div>
          <div className="bg-black/60 backdrop-blur-md text-white border border-gray-700 text-xs font-bold px-2 py-1 flex items-center gap-1 rounded-md">
            <Star size={12} fill="var(--color-kinetic-amber)" className="text-[var(--color-kinetic-amber)]" /> 4.9 <span className="text-gray-400 font-normal text-[10px]">(184)</span>
          </div>
        </div>

        {/* AR Button */}
        <button className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md border border-[var(--color-kinetic-amber)]/50 text-[var(--color-kinetic-amber)] px-3 py-1.5 flex items-center gap-2 rounded-lg text-xs font-mono font-bold tracking-widest hover:bg-black/90 transition">
          <Box size={14} /> VER EN 3D (AR)
        </button>
      </div>

      {/* Content */}
      <div className="p-4 pt-2">
        <h3 className="text-xl font-bold text-white mb-1.5">Wagyu Ribeye A5 Trufado</h3>
        <p className="text-sm text-gray-400 leading-relaxed mb-4">
          Corte sellado a la leña con reducción de oporto y lascas de trufa negra fresca, mousseline de chirivía.
        </p>
        
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-[var(--color-obsidian-lighter)] text-gray-300 text-[11px] font-mono rounded-md border border-gray-800">
            Gluten Free
          </span>
          <span className="px-2 py-1 bg-[var(--color-obsidian-lighter)] text-gray-300 text-[11px] font-mono rounded-md border border-gray-800">
            Pairing: Pinot Noir
          </span>
        </div>
      </div>
    </div>
  );
}
