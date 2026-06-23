"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/store";

export type CanteenOption = {
  id: string;
  name: string;
  location?: string | null;
  isOpen?: boolean;
  dishCount?: number;
  queueMinutes?: number;
  pendingOrdersCount?: number;
};

export function CanteenSwitcher({
  canteens,
  selectedCanteenId,
  onSelect,
}: {
  canteens: CanteenOption[];
  selectedCanteenId: string;
  onSelect: (canteen: CanteenOption) => void;
}) {
  const [open, setOpen] = useState(false);

  const searchQuery = useCart((s) => s.searchQuery);
  const setSearchQuery = useCart((s) => s.setSearchQuery);

  function handleSearchChange(term: string) {
    setSearchQuery(term);
  }

  // Handle outside clicks to close the dropdown cleanly
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".canteen-switcher-container")) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [open]);

  const selected = canteens.find((c) => c.id === selectedCanteenId) ?? canteens[0];

  if (!selected) return null;

  return (
    <div className="canteen-switcher-container relative flex items-center w-full h-10 bg-[color:var(--color-paper)] border-[3px] border-black rounded-xl shadow-[var(--ns-shadow-sm)] transition-shadow duration-200 px-3">
      {/* Left Section: Zomato-style Custom Curved Dropdown Trigger */}
      <div className="shrink-0 h-full flex items-center">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 cursor-pointer hover:opacity-85 text-left pr-2.5 outline-none select-none h-full shrink-0"
        >
          <MapPin size={15} className="text-ocean-500 shrink-0" />
          <span className="text-[12.5px] sm:text-[13.5px] font-semibold text-[color:var(--color-ink)] truncate font-sans">
            {selected.name}
          </span>
          {canteens.length > 1 && (
            <ChevronDown
              size={12}
              className="text-[color:var(--color-ink)]/45 shrink-0 mt-0.5 transition-transform duration-200"
              style={open ? { transform: "rotate(180deg)" } : {}}
            />
          )}
        </button>
      </div>

      {/* Separator Divider */}
      <div className="w-px h-5 bg-[color:var(--color-line)] shrink-0 select-none" />

      {/* Right Section: Unified Search Input */}
      <div className="flex items-center gap-2 flex-1 min-w-0 pl-2.5">
        <Search size={14} className="text-[color:var(--color-ink)]/45 shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search for dishes..."
          className="w-full bg-transparent border-none outline-none text-[12px] sm:text-[13px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink)]/40 px-1 py-1 focus:ring-0 focus:border-none focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange("")}
            className="p-1 rounded-full hover:bg-[color:var(--student-surface2)] text-[color:var(--color-ink)]/45 hover:text-[color:var(--color-ink)] transition shrink-0"
            aria-label="Clear search query"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {open && canteens.length > 1 && (
        <div className="absolute top-[112%] left-0 z-50 w-72 sm:w-80 bg-[color:var(--color-paper)] border-[3px] border-black rounded-xl shadow-[var(--ns-shadow)] py-1.5 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 outline-none">
          {canteens.map((canteen) => {
            const active = canteen.id === selected.id;
            return (
              <button
                key={canteen.id}
                type="button"
                onClick={() => {
                  onSelect(canteen);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer outline-none ${
                  active
                    ? "bg-[color:var(--student-accent-dim)] text-ocean-600 font-semibold"
                    : "text-[color:var(--color-ink)] hover:bg-[color:var(--student-surface2)]"
                }`}
              >
                {/* Left: Active Checkmark indicator with fixed width */}
                <div className="flex items-center justify-center w-4 shrink-0">
                  {active && <Check size={14} className="text-ocean-500" />}
                </div>

                {/* Center: Name & Location */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans font-semibold text-[13.5px] sm:text-[14px]">
                    {canteen.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[color:var(--color-ink)]/45 truncate font-sans">
                    {canteen.location || "Campus Block"} · {canteen.dishCount ?? 0} dishes
                  </p>
                </div>

                {/* Right: Status Dot */}
                <div className="flex items-center justify-center w-6 shrink-0 pl-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      canteen.isOpen ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
