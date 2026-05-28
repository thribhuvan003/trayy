"use client";

import { useState } from "react";
import { Utensils, FolderHeart } from "lucide-react";
import { MenuTable } from "./menu-table";
import { CategoryManager } from "./category-manager";
import { cn } from "@/lib/utils";

type MenuItemRow = {
  id: string;
  name: string;
  category_id: string | null;
  diet: "veg" | "nonveg" | "egg";
  price_paise: number;
  status: "draft" | "live" | "archived";
  in_stock: boolean;
  stock_qty: number | null;
  prep_target_seconds: number;
};

type CategoryRow = {
  id: string;
  name: string;
};

type Props = {
  items: MenuItemRow[];
  categories: CategoryRow[];
  tenantSlug: string;
};

export function MenuDashboard({ items, categories, tenantSlug }: Props) {
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");

  // Calculate items count per category for CategoryManager
  const itemCounts = items.reduce((acc, it) => {
    if (it.category_id) {
      acc[it.category_id] = (acc[it.category_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs list */}
      <div className="flex items-center gap-2 border-b border-graphite-200/10 pb-1 mt-2">
        <button
          onClick={() => setActiveTab("items")}
          className={cn(
            "pb-3.5 px-4 text-[14px] font-medium transition-all relative flex items-center gap-2 cursor-pointer",
            activeTab === "items" 
              ? "text-lime font-semibold" 
              : "text-graphite-400 hover:text-graphite-200"
          )}
        >
          <Utensils size={15} />
          Menu Items
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-graphite-700 font-mono font-medium text-graphite-300">
            {items.length}
          </span>
          {activeTab === "items" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={cn(
            "pb-3.5 px-4 text-[14px] font-medium transition-all relative flex items-center gap-2 cursor-pointer",
            activeTab === "categories" 
              ? "text-lime font-semibold" 
              : "text-graphite-400 hover:text-graphite-200"
          )}
        >
          <FolderHeart size={15} />
          Categories
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-graphite-700 font-mono font-medium text-graphite-300">
            {categories.length}
          </span>
          {activeTab === "categories" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime rounded-full" />
          )}
        </button>
      </div>

      {/* Tab panel contents */}
      <div className="mt-1 transition-all duration-150">
        {activeTab === "items" ? (
          <MenuTable items={items} categories={categories} tenantSlug={tenantSlug} />
        ) : (
          <CategoryManager categories={categories} itemCounts={itemCounts} />
        )}
      </div>
    </div>
  );
}
