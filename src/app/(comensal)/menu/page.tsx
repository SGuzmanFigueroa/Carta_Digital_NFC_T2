import React from "react";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { SearchBar } from "@/components/menu/SearchBar";
import { ARBanner } from "@/components/menu/ARBanner";
import { CategoryTabs } from "@/components/menu/CategoryTabs";
import { ProductCard } from "@/components/menu/ProductCard";

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-[var(--color-obsidian)] text-[var(--color-foreground)] pb-24">
      <div className="max-w-md mx-auto px-4 pt-8">
        
        <MenuHeader />
        
        <SearchBar />
        
        <ARBanner />
        
        <CategoryTabs />

        {/* List Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[var(--color-kinetic-amber)] rounded-sm" />
              Selección del Chef
            </h2>
            <span className="text-xs font-mono font-bold tracking-widest text-gray-400 uppercase">2 Platos en vivo</span>
          </div>
          
          <div className="flex flex-col gap-6">
            <ProductCard />
            {/* You could map over more products here */}
          </div>
        </div>

      </div>
    </div>
  );
}
