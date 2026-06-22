"use client";

import Link from "next/link";
import { History, User, LogOut, ShoppingCart, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ResolvedTenant, CollegeCanteen } from "@/lib/tenant";
import { CanteenSwitcher, type CanteenOption } from "@/components/portal-student/canteen-switcher";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { CurrentUser } from "@/lib/auth/get-user";
import { useCart, cartItemCount } from "@/lib/cart/store";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  tenant: ResolvedTenant;
  siblings?: CollegeCanteen[];
  user?: CurrentUser | null;
};

export function StudentTopBar({ tenant, siblings = [], user }: Props) {
  const lines = useCart((s) => s.lines);
  const count = cartItemCount(lines);
  const setIsOpen = useCart((s) => s.setIsOpen);
  const searchQuery = useCart((s) => s.searchQuery);
  const setSearchQuery = useCart((s) => s.setSearchQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/auth/signout", { method: "POST" });
    window.location.href = `/c/${tenant.slug}/menu`;
  }

  const [activeCanteens, setActiveCanteens] = useState<CollegeCanteen[]>(siblings);

  useEffect(() => {
    const sb = getBrowserClient();
    async function fetchFreshSiblings() {
      if (!tenant.college_slug) return;
      const { data, error } = await (sb as any).rpc("college_canteens", { p_college_slug: tenant.college_slug });
      if (!error && data) setActiveCanteens(data as unknown as CollegeCanteen[]);
    }
    fetchFreshSiblings();
    const intervalId = setInterval(fetchFreshSiblings, 60_000);
    return () => clearInterval(intervalId);
  }, [tenant.college_slug]);

  const canteenOptions = useMemo<CanteenOption[]>(() => {
    const list = activeCanteens.length > 0 ? activeCanteens : [{ slug: tenant.slug, name: tenant.name, building: tenant.building, zone: tenant.zone, is_open: tenant.is_open, pending_orders_count: tenant.pending_orders_count ?? 0 }];
    return (list as any[]).map((c) => ({
      id: c.slug,
      name: c.name,
      location: [c.building, c.zone].filter(Boolean).join(" · ") || null,
      isOpen: c.is_open,
      dishCount: c.dishCount,
      queueMinutes: c.is_open ? Math.min(20, Math.max(3, 3 + c.pending_orders_count)) : undefined,
      pendingOrdersCount: c.pending_orders_count,
    }));
  }, [activeCanteens, tenant]);

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 bg-paper/80 backdrop-blur-xl border-b border-ink/5"
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="w-10 h-10 bg-ink text-white rounded-xl flex items-center justify-center font-display text-2xl italic transition-all group-hover:rounded-full group-hover:bg-ocean">
            T
          </div>
          <div className="hidden sm:block">
            <h1 className="font-display text-2xl tracking-tight leading-none">Tray<span className="text-dust group-hover:text-ocean transition-colors">.</span></h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-dust leading-none mt-1">
              {tenant.name}
            </p>
          </div>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-xl relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dust group-focus-within:text-ocean transition-colors" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find something delicious..."
            className="w-full h-12 pl-12 pr-12 rounded-2xl bg-ink/5 border-none text-sm font-medium focus:ring-2 focus:ring-ocean/10 transition-all"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-ink/5 rounded-full text-dust"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {canteenOptions.length > 1 && (
            <div className="hidden lg:block">
              <CanteenSwitcher canteens={canteenOptions} selectedCanteenId={tenant.slug} onSelect={(c) => window.location.href = `/c/${c.id}/menu`} />
            </div>
          )}
          
          <button 
            onClick={() => setIsOpen(true)}
            className="relative w-12 h-12 rounded-2xl bg-ink/5 flex items-center justify-center hover:bg-ink hover:text-white transition-all group"
          >
            <ShoppingCart size={18} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-ocean text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-paper">
                {count}
              </span>
            )}
          </button>

          <Link 
            href={`/c/${tenant.slug}/orders`}
            className="w-12 h-12 rounded-2xl bg-ink/5 flex items-center justify-center hover:bg-ink hover:text-white transition-all"
          >
            <History size={18} />
          </Link>

          {user ? (
            <button 
              onClick={handleSignOut}
              className="w-12 h-12 rounded-2xl bg-ink/5 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <Link 
              href={`/c/${tenant.slug}/login?next=/c/${tenant.slug}/menu`}
              className="w-12 h-12 rounded-2xl bg-ink/5 flex items-center justify-center hover:bg-ocean hover:text-white transition-all"
            >
              <User size={18} />
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  );
}
