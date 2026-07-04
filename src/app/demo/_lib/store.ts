"use client";

/**
 * localStorage-backed store shared by the three demo pages. Keys match the
 * static demos in /public/demo, so orders placed here land in the kitchen
 * demo and roll up in the admin demo. Production replaces this with
 * Supabase tables + Realtime channels.
 */

import { CANTEENS, DEFAULT_ID, DEMO_CANTEEN_IDS, type Special, type TicketDiet, type TicketStatus } from "./data";

export const STORAGE_CANTEEN = "tray_canteen";
export const INBOX_KEY = "tray_kitchen_inbox";

export function specialsKey(canteenId: string) {
  return `tray_specials_${canteenId || "aditya"}`;
}

function emit(key: string, newValue: string) {
  try {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
  } catch {
    /* older browsers */
  }
}

export function getSelectedCanteenId(): string {
  if (typeof window === "undefined") return DEFAULT_ID;
  const id = localStorage.getItem(STORAGE_CANTEEN);
  if (id && (DEMO_CANTEEN_IDS as readonly string[]).includes(id) && CANTEENS[id]) return id;
  return DEFAULT_ID;
}

export function setSelectedCanteenId(id: string) {
  if (!CANTEENS[id] || !(DEMO_CANTEEN_IDS as readonly string[]).includes(id)) return;
  if (localStorage.getItem(STORAGE_CANTEEN) === id) return;
  localStorage.setItem(STORAGE_CANTEEN, id);
  emit(STORAGE_CANTEEN, id);
}

export function getSpecials(canteenId: string): Special[] {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(localStorage.getItem(specialsKey(canteenId)) || "[]");
    if (!Array.isArray(list)) return [];
    const nowTs = Date.now();
    return list.map((s, i) => {
      let addedAt = Number(s?.addedAt);
      if (!addedAt || nowTs - addedAt > 90 * 60 * 1000 || addedAt > nowTs) {
        addedAt = nowTs - (6 + i * 8) * 60 * 1000;
      }
      return {
        id: String(s?.id || `sp-${i}`),
        name: String(s?.name || "Chef special"),
        desc: String(s?.desc || "Fresh counter special"),
        price: Number(s?.price || 120),
        prep: Number(s?.prep || 6),
        diet: (s?.diet === "nonveg" ? "nonveg" : "veg") as TicketDiet,
        icon: String(s?.icon || (s?.name ? String(s.name).charAt(0) : "S")).slice(0, 2).toUpperCase(),
        addedAt,
      };
    });
  } catch {
    return [];
  }
}

export function setSpecials(canteenId: string, list: Special[]) {
  const key = specialsKey(canteenId);
  const val = JSON.stringify(list);
  localStorage.setItem(key, val);
  emit(key, val);
}

export interface InboxTicket {
  id: string;
  student: string;
  status: TicketStatus;
  placedAt: number;
  total: number;
  otp: string;
  canteenId: string;
  items: { name: string; diet: TicketDiet; tgt: number; q: number; special?: boolean }[];
}

export function readInbox(): InboxTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(localStorage.getItem(INBOX_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeInbox(list: InboxTicket[]) {
  localStorage.setItem(INBOX_KEY, JSON.stringify(list));
  emit(INBOX_KEY, "1");
}

export function pushInbox(ticket: InboxTicket) {
  const inbox = readInbox();
  inbox.push(ticket);
  writeInbox(inbox);
}

export function updateInboxStatus(id: string, status: TicketStatus) {
  const inbox = readInbox();
  const t = inbox.find((x) => x.id === id);
  if (!t) return;
  t.status = status;
  writeInbox(inbox);
}

/** Re-render on cross-tab storage changes for the given key prefixes. */
export function subscribeStorage(keys: string[], cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (!e.key || keys.some((k) => e.key === k || e.key!.startsWith(k))) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function fmtClock(ts: number) {
  const d = new Date(ts);
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}
