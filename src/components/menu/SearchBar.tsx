import React from "react";
import { Input } from "@/components/ui/Input";
import { Search, SlidersHorizontal } from "lucide-react";

export function SearchBar() {
  return (
    <div className="mb-6">
      <Input 
        placeholder="Buscar platos, ingredientes o maridajes..." 
        startIcon={<Search size={18} />}
        endIcon={<SlidersHorizontal size={18} className="text-gray-300" />}
      />
    </div>
  );
}
