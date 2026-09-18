import React from "react";
import { cn } from "@/lib/utils";
import { BookOpen, UtensilsCrossed, Soup, Wine } from "lucide-react";

const categories = [
  { id: "all", label: "Todos", icon: BookOpen, active: true },
  { id: "starters", label: "Entradas", icon: UtensilsCrossed, active: false },
  { id: "main", label: "Platos de Fondo", icon: Soup, active: false },
  { id: "drinks", label: "Bebidas", icon: Wine, active: false },
];

export function CategoryTabs() {
  return (
    <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 mb-6 -mx-4 px-4">
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={cn(
            "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors border",
            cat.active 
              ? "bg-[var(--color-kinetic-amber)] text-white border-transparent shadow-[0_0_15px_rgba(255,90,31,0.3)]" 
              : "bg-transparent text-gray-400 border-[var(--color-obsidian-lighter)] hover:bg-[var(--color-obsidian-light)]"
          )}
        >
          <cat.icon size={16} />
          {cat.label}
        </button>
      ))}
    </div>
  );
}
