/**
 * Shared fixture data for the public Tray demos — one street, multiple
 * stalls. Mirrors the shape used by the static demos in /public/demo so
 * the demo pages stay interoperable through the same localStorage keys.
 */

export type Diet = "veg" | "nv";
export type TicketDiet = "veg" | "nonveg";
export type TicketStatus = "incoming" | "preparing" | "ready" | "collected";

export interface MenuItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  cat: string;
  diet: Diet;
  emoji: string;
}

export interface Category {
  id: string;
  label: string;
  sub: string;
}

export interface Special {
  id: string;
  name: string;
  desc: string;
  price: number;
  prep: number;
  diet: TicketDiet;
  icon: string;
  addedAt: number;
}

export interface TicketItem {
  name: string;
  diet: TicketDiet;
  tgt: number;
  q: number;
  special?: boolean;
}

export interface SeedTicket {
  id: string;
  student: string;
  status: TicketStatus;
  elapsedSec: number;
  total: number;
  otp: string;
  items: TicketItem[];
}

export interface OrderRow {
  id: string;
  student: string;
  items: string;
  total: number;
  status: TicketStatus;
  time: string;
}

export interface StudentRow {
  name: string;
  roll: string;
  orders: number;
  spend: number;
  last: string;
}

export interface MenuModalRow {
  name: string;
  price: number;
  live: boolean;
}

export interface AuditRow {
  t: string;
  type: "order" | "menu" | "price" | "pay" | "prep";
  who: string;
  msg: string;
}

export interface Kpis {
  revenue: number;
  revenueDelta: string;
  orders: number;
  ordersDelta: string;
  avgTicket: number;
  avgTicketDelta: string;
  avgPickupMin: number;
  avgPickupSec: number;
  avgPickupDelta: string;
}

export interface TopItem {
  name: string;
  diet: Diet;
  orders: number;
  pct: number;
}

export interface Canteen {
  id: string;
  name: string;
  short: string;
  av: string;
  block: string;
  upi: string;
  kitchenTag: string;
  openLabel: string;
  categories: Category[];
  menu: MenuItem[];
  kitchenTickets: SeedTicket[];
  defaultSpecials: Special[];
  kitchenDishes: { name: string; diet: TicketDiet; tgt: number }[];
  students: string[];
  kpis: Kpis;
  topItems: TopItem[];
  orders: OrderRow[];
  studentRows: StudentRow[];
  menuModal: MenuModalRow[];
  audit: AuditRow[];
  spDefaults: { name: string; desc: string; price: number; prep: number; diet: TicketDiet };
  counterBase: number;
}

export const DEFAULT_ID = "hostel-b";
export const DEMO_CANTEEN_IDS = ["hostel-b", "aditya", "north-block"] as const;

const now = () => Date.now();

export const CANTEENS: Record<string, Canteen> = {
  aditya: {
    id: "aditya",
    name: "Sri Sai Tiffins",
    short: "MG Road",
    av: "S",
    block: "MG Road · near Gate 2",
    upi: "srisai-tiffins@upi",
    kitchenTag: "MG Road · Tiffin service",
    openLabel: "Open now · 11:30–2:30",
    categories: [
      { id: "all", label: "All items", sub: "Full menu" },
      { id: "mains", label: "Mains", sub: "Hearty plates" },
      { id: "snacks", label: "Snacks", sub: "Quick bites" },
      { id: "drinks", label: "Drinks", sub: "Hot & cold" },
    ],
    menu: [
      { id: "biryani", name: "Chicken Biryani", desc: "Dum-style, raita on request", price: 140, cat: "mains", diet: "nv", emoji: "🍗" },
      { id: "dosa", name: "Masala Dosa", desc: "Crisp rice crepe, potato masala", price: 70, cat: "mains", diet: "veg", emoji: "🫓" },
      { id: "paneer", name: "Paneer Butter Masala", desc: "Rich tomato gravy, naan extra", price: 160, cat: "mains", diet: "veg", emoji: "🧀" },
      { id: "thali", name: "Veg Thali", desc: "Rice, dal, sabzi, roti, salad", price: 120, cat: "mains", diet: "veg", emoji: "🥗" },
      { id: "mutton", name: "Mutton Curry", desc: "Slow braised, two rotis included", price: 220, cat: "mains", diet: "nv", emoji: "🍖" },
      { id: "idli", name: "Idli + Sambar", desc: "Steamed rice cakes, hot sambar", price: 50, cat: "snacks", diet: "veg", emoji: "🍚" },
      { id: "vada", name: "Vada Pav", desc: "Mumbai-style, chutney loaded", price: 35, cat: "snacks", diet: "veg", emoji: "🥪" },
      { id: "noodles", name: "Noodles", desc: "Wok-tossed hakka, mild spice", price: 60, cat: "snacks", diet: "veg", emoji: "🍜" },
      { id: "coffee", name: "Filter Coffee", desc: "South Indian filter, hot", price: 25, cat: "drinks", diet: "veg", emoji: "☕" },
      { id: "lassi", name: "Sweet Lassi", desc: "Chilled, cardamom touch", price: 40, cat: "drinks", diet: "veg", emoji: "🥛" },
    ],
    kitchenTickets: [
      { id: "T-2425", student: "Ananya R.", status: "incoming", elapsedSec: 42, total: 210, otp: "4821", items: [{ name: "Chicken Biryani", diet: "nonveg", tgt: 8, q: 1 }, { name: "Filter Coffee", diet: "veg", tgt: 2, q: 1 }] },
      { id: "T-2424", student: "Karthik V.", status: "incoming", elapsedSec: 88, total: 210, otp: "7193", items: [{ name: "Paneer Butter Masala", diet: "veg", tgt: 6, q: 1 }, { name: "Sweet Lassi", diet: "veg", tgt: 2, q: 1 }] },
      { id: "T-2423", student: "Priya M.", status: "preparing", elapsedSec: 240, total: 180, otp: "3056", items: [{ name: "Veg Thali", diet: "veg", tgt: 7, q: 1 }] },
      { id: "T-2422", student: "Rohit S.", status: "preparing", elapsedSec: 520, total: 310, otp: "8840", items: [{ name: "Mutton Curry", diet: "nonveg", tgt: 9, q: 1 }, { name: "Masala Dosa", diet: "veg", tgt: 4, q: 1 }] },
      { id: "T-2421", student: "Devansh K.", status: "ready", elapsedSec: 380, total: 90, otp: "1297", items: [{ name: "Idli + Sambar", diet: "veg", tgt: 3, q: 1 }] },
      { id: "T-2420", student: "Sneha P.", status: "ready", elapsedSec: 410, total: 180, otp: "6502", items: [{ name: "Chicken Biryani", diet: "nonveg", tgt: 8, q: 1 }] },
      { id: "T-2419", student: "Vikram T.", status: "collected", elapsedSec: 720, total: 140, otp: "3384", items: [{ name: "Masala Dosa", diet: "veg", tgt: 4, q: 2 }] },
    ],
    defaultSpecials: [
      { id: "sp1", name: "Hyderabadi Dum Biryani", desc: "Slow-cooked, sealed in dum", price: 240, prep: 8, diet: "nonveg", icon: "H", addedAt: now() - 6 * 60 * 1000 },
      { id: "sp2", name: "Mushroom Manchurian", desc: "Indo-Chinese, dry", price: 120, prep: 5, diet: "veg", icon: "M", addedAt: now() - 18 * 60 * 1000 },
    ],
    kitchenDishes: [
      { name: "Chicken Biryani", diet: "nonveg", tgt: 8 },
      { name: "Paneer Butter Masala", diet: "veg", tgt: 6 },
      { name: "Masala Dosa", diet: "veg", tgt: 4 },
      { name: "Mutton Curry", diet: "nonveg", tgt: 9 },
      { name: "Filter Coffee", diet: "veg", tgt: 2 },
      { name: "Veg Thali", diet: "veg", tgt: 7 },
    ],
    students: ["Ananya R.", "Karthik V.", "Rohit S.", "Priya M.", "Devansh K.", "Sneha P."],
    kpis: { revenue: 38420, revenueDelta: "▲ 12.4%", orders: 248, ordersDelta: "▲ 8.1%", avgTicket: 155, avgTicketDelta: "▲ ₹6", avgPickupMin: 7, avgPickupSec: 12, avgPickupDelta: "▼ 0:18 slower" },
    topItems: [
      { name: "Chicken Biryani", diet: "nv", orders: 68, pct: 92 },
      { name: "Masala Dosa", diet: "veg", orders: 54, pct: 74 },
      { name: "Veg Thali", diet: "veg", orders: 41, pct: 55 },
      { name: "Paneer Butter Masala", diet: "veg", orders: 35, pct: 48 },
      { name: "Filter Coffee", diet: "veg", orders: 28, pct: 38 },
      { name: "Mutton Curry", diet: "nv", orders: 22, pct: 29 },
    ],
    orders: [
      { id: "T-2425", student: "Ananya R.", items: "Chicken Biryani × 1, Filter Coffee × 1", total: 210, status: "incoming", time: "11:42" },
      { id: "T-2424", student: "Karthik V.", items: "Paneer Butter Masala × 1, Sweet Lassi × 1", total: 210, status: "preparing", time: "11:41" },
      { id: "T-2423", student: "Priya M.", items: "Veg Thali × 1, Masala Chai × 2", total: 180, status: "preparing", time: "11:40" },
      { id: "T-2422", student: "Rohit S.", items: "Mutton Curry × 1, Masala Dosa × 1", total: 310, status: "ready", time: "11:37" },
      { id: "T-2421", student: "Devansh K.", items: "Idli + Sambar × 1, Filter Coffee × 1", total: 90, status: "ready", time: "11:35" },
      { id: "T-2420", student: "Sneha P.", items: "Chicken Biryani × 1", total: 180, status: "collected", time: "11:32" },
      { id: "T-2419", student: "Vikram T.", items: "Uttapam × 1, Filter Coffee × 2", total: 140, status: "collected", time: "11:30" },
      { id: "T-2418", student: "Lakshmi N.", items: "Veg Cutlet × 2, Masala Chai × 1", total: 140, status: "collected", time: "11:28" },
      { id: "T-2417", student: "Anil K.", items: "Masala Dosa × 2", total: 140, status: "preparing", time: "11:26" },
      { id: "T-2416", student: "Tara P.", items: "Veg Thali × 1", total: 120, status: "ready", time: "11:24" },
      { id: "T-2415", student: "Rahul D.", items: "Chicken Biryani × 2", total: 360, status: "collected", time: "11:20" },
      { id: "T-2414", student: "Meera S.", items: "Filter Coffee × 3", total: 90, status: "incoming", time: "11:18" },
    ],
    studentRows: [
      { name: "Ananya R.", roll: "21AEC01", orders: 12, spend: 1840, last: "11:42" },
      { name: "Karthik V.", roll: "21AEC14", orders: 9, spend: 1420, last: "11:41" },
      { name: "Priya M.", roll: "21AEC22", orders: 11, spend: 1560, last: "11:40" },
      { name: "Rohit S.", roll: "21AEC08", orders: 7, spend: 980, last: "11:37" },
      { name: "Devansh K.", roll: "21AEC31", orders: 6, spend: 720, last: "11:35" },
      { name: "Sneha P.", roll: "21AEC19", orders: 10, spend: 1310, last: "11:32" },
    ],
    menuModal: [
      { name: "Chicken Biryani", price: 180, live: true },
      { name: "Paneer Butter Masala", price: 160, live: true },
      { name: "Veg Thali", price: 120, live: true },
      { name: "Masala Dosa", price: 70, live: true },
      { name: "Filter Coffee", price: 30, live: true },
      { name: "Mutton Curry", price: 220, live: false },
    ],
    audit: [
      { t: "11:42:08", type: "order", who: "admin@aditya", msg: "exported orders CSV" },
      { t: "11:38:12", type: "menu", who: "kitchen", msg: "pushed Hyderabadi Dum Biryani special" },
      { t: "11:35:01", type: "pay", who: "system", msg: "Razorpay webhook verified" },
      { t: "11:20:44", type: "prep", who: "admin", msg: "hid Mutton Curry from menu" },
    ],
    spDefaults: { name: "Hyderabadi Dum Biryani", desc: "Slow-cooked, sealed in dum", price: 240, prep: 8, diet: "nonveg" },
    counterBase: 2420,
  },
  "north-block": {
    id: "north-block",
    name: "Anna Chaat Corner",
    short: "5th Cross",
    av: "A",
    block: "5th Cross · bus stop",
    upi: "anna-chaat@upi",
    kitchenTag: "5th Cross · Snacks",
    openLabel: "Open now · 12:00–3:00",
    categories: [
      { id: "all", label: "All items", sub: "Full menu" },
      { id: "rolls", label: "Rolls", sub: "Grab & go" },
      { id: "bowls", label: "Bowls", sub: "Rice & noodles" },
      { id: "drinks", label: "Drinks", sub: "Cold & hot" },
    ],
    menu: [
      { id: "kathi", name: "Chicken Kathi Roll", desc: "Paratha wrap, onion salad", price: 95, cat: "rolls", diet: "nv", emoji: "🌯" },
      { id: "egg-roll", name: "Double Egg Roll", desc: "Double paratha, chilli sauce", price: 110, cat: "rolls", diet: "nv", emoji: "🌯" },
      { id: "paneer-roll", name: "Paneer Roll", desc: "Tandoori paneer, mint chutney", price: 75, cat: "rolls", diet: "veg", emoji: "🌯" },
      { id: "momo", name: "Steamed Momos (6)", desc: "Veg filling, red chutney", price: 50, cat: "rolls", diet: "veg", emoji: "🥟" },
      { id: "fried-rice", name: "Egg Fried Rice", desc: "Wok-fried, spring onion", price: 85, cat: "bowls", diet: "nv", emoji: "🍚" },
      { id: "chowmein", name: "Veg Chowmein", desc: "Smoky wok, capsicum", price: 70, cat: "bowls", diet: "veg", emoji: "🍜" },
      { id: "manchow", name: "Veg Manchow Soup", desc: "Crispy noodles on top", price: 55, cat: "bowls", diet: "veg", emoji: "🍲" },
      { id: "lemon", name: "Fresh Lime Soda", desc: "Sweet or salted", price: 30, cat: "drinks", diet: "veg", emoji: "🥤" },
      { id: "cold-coffee", name: "Cold Coffee", desc: "Blended, light ice", price: 45, cat: "drinks", diet: "veg", emoji: "☕" },
      { id: "spring", name: "Spring Roll (2)", desc: "Crispy veg, sweet chilli", price: 40, cat: "rolls", diet: "veg", emoji: "🥠" },
    ],
    kitchenTickets: [
      { id: "N-1182", student: "Isha K.", status: "incoming", elapsedSec: 35, total: 190, otp: "5510", items: [{ name: "Chicken Kathi Roll", diet: "nonveg", tgt: 5, q: 2 }] },
      { id: "N-1181", student: "Naveen L.", status: "incoming", elapsedSec: 70, total: 115, otp: "9023", items: [{ name: "Egg Fried Rice", diet: "nonveg", tgt: 6, q: 1 }, { name: "Fresh Lime Soda", diet: "veg", tgt: 2, q: 1 }] },
      { id: "N-1180", student: "Zara H.", status: "preparing", elapsedSec: 200, total: 100, otp: "4418", items: [{ name: "Steamed Momos", diet: "veg", tgt: 5, q: 2 }] },
      { id: "N-1179", student: "Arjun P.", status: "preparing", elapsedSec: 480, total: 75, otp: "7732", items: [{ name: "Paneer Roll", diet: "veg", tgt: 4, q: 1 }] },
      { id: "N-1178", student: "Kavya S.", status: "ready", elapsedSec: 360, total: 55, otp: "2189", items: [{ name: "Veg Manchow Soup", diet: "veg", tgt: 4, q: 1 }] },
      { id: "N-1177", student: "Manish T.", status: "collected", elapsedSec: 680, total: 95, otp: "6641", items: [{ name: "Chicken Kathi Roll", diet: "nonveg", tgt: 5, q: 1 }] },
    ],
    defaultSpecials: [
      { id: "nb1", name: "Double Egg Roll", desc: "Extra egg, double paratha", price: 110, prep: 4, diet: "nonveg", icon: "E", addedAt: now() - 10 * 60 * 1000 },
    ],
    kitchenDishes: [
      { name: "Chicken Kathi Roll", diet: "nonveg", tgt: 5 },
      { name: "Paneer Roll", diet: "veg", tgt: 4 },
      { name: "Egg Fried Rice", diet: "nonveg", tgt: 6 },
      { name: "Steamed Momos", diet: "veg", tgt: 5 },
      { name: "Fresh Lime Soda", diet: "veg", tgt: 2 },
    ],
    students: ["Isha K.", "Naveen L.", "Zara H.", "Arjun P.", "Kavya S.", "Manish T."],
    kpis: { revenue: 22180, revenueDelta: "▲ 6.2%", orders: 186, ordersDelta: "▲ 4.0%", avgTicket: 119, avgTicketDelta: "▲ ₹4", avgPickupMin: 5, avgPickupSec: 48, avgPickupDelta: "▲ 0:12 faster" },
    topItems: [
      { name: "Chicken Kathi Roll", diet: "nv", orders: 52, pct: 88 },
      { name: "Steamed Momos", diet: "veg", orders: 44, pct: 72 },
      { name: "Egg Fried Rice", diet: "nv", orders: 38, pct: 61 },
      { name: "Paneer Roll", diet: "veg", orders: 31, pct: 50 },
      { name: "Fresh Lime Soda", diet: "veg", orders: 26, pct: 42 },
    ],
    orders: [
      { id: "N-1182", student: "Isha K.", items: "Chicken Kathi Roll × 2", total: 190, status: "incoming", time: "12:08" },
      { id: "N-1181", student: "Naveen L.", items: "Egg Fried Rice × 1, Lime Soda × 1", total: 115, status: "preparing", time: "12:07" },
      { id: "N-1180", student: "Zara H.", items: "Steamed Momos × 2", total: 100, status: "preparing", time: "12:05" },
      { id: "N-1179", student: "Arjun P.", items: "Paneer Roll × 1", total: 75, status: "ready", time: "12:02" },
      { id: "N-1178", student: "Kavya S.", items: "Veg Manchow Soup × 1", total: 55, status: "ready", time: "12:00" },
      { id: "N-1177", student: "Manish T.", items: "Chicken Kathi Roll × 1", total: 95, status: "collected", time: "11:58" },
      { id: "N-1176", student: "Isha K.", items: "Egg Fried Rice × 1", total: 85, status: "collected", time: "11:55" },
      { id: "N-1175", student: "Naveen L.", items: "Paneer Roll × 2", total: 150, status: "incoming", time: "11:52" },
    ],
    studentRows: [
      { name: "Isha K.", roll: "22CS04", orders: 14, spend: 1260, last: "12:08" },
      { name: "Naveen L.", roll: "22CS11", orders: 8, spend: 890, last: "12:07" },
      { name: "Zara H.", roll: "22CS19", orders: 10, spend: 1040, last: "12:05" },
      { name: "Arjun P.", roll: "22CS07", orders: 6, spend: 520, last: "12:02" },
    ],
    menuModal: [
      { name: "Chicken Kathi Roll", price: 95, live: true },
      { name: "Paneer Roll", price: 75, live: true },
      { name: "Egg Fried Rice", price: 85, live: true },
      { name: "Steamed Momos", price: 50, live: true },
      { name: "Veg Manchow Soup", price: 55, live: false },
    ],
    audit: [
      { t: "12:06:22", type: "menu", who: "kitchen@north", msg: "pushed Double Egg Roll" },
      { t: "12:01:10", type: "order", who: "admin@north", msg: "exported roll sales CSV" },
      { t: "11:48:33", type: "prep", who: "system", msg: "rush mode off · North block" },
    ],
    spDefaults: { name: "Double Egg Roll", desc: "Extra egg, double paratha", price: 110, prep: 4, diet: "nonveg" },
    counterBase: 1180,
  },
  "hostel-b": {
    id: "hostel-b",
    name: "Guru Meals",
    short: "PG Lane",
    av: "G",
    block: "PG Lane · near Gate 3",
    upi: "guru-meals@upi",
    kitchenTag: "PG Lane · Meals",
    openLabel: "Open now · 12:30–2:00",
    categories: [
      { id: "all", label: "All items", sub: "Today's mess" },
      { id: "meal", label: "Meals", sub: "Plate service" },
      { id: "extras", label: "Extras", sub: "Add-ons" },
      { id: "drinks", label: "Drinks", sub: "Buttermilk & chai" },
    ],
    menu: [
      { id: "mess-thali", name: "Standard Mess Thali", desc: "Rice, sambar, poriyal, curd", price: 70, cat: "meal", diet: "veg", emoji: "🍽" },
      { id: "spl-thali", name: "Special Thali", desc: "Extra sabzi + sweet", price: 90, cat: "meal", diet: "veg", emoji: "🥘" },
      { id: "egg-meal", name: "Egg Curry Meal", desc: "Two eggs, rice, rasam", price: 85, cat: "meal", diet: "nv", emoji: "🥚" },
      { id: "curd", name: "Curd Rice", desc: "Tempered, light", price: 45, cat: "meal", diet: "veg", emoji: "🍚" },
      { id: "buttermilk", name: "Spiced Buttermilk", desc: "Chilled, meal add-on", price: 15, cat: "drinks", diet: "veg", emoji: "🥛" },
      { id: "banana", name: "Banana (2)", desc: "Mess fruit counter", price: 20, cat: "extras", diet: "veg", emoji: "🍌" },
    ],
    kitchenTickets: [
      { id: "H-902", student: "Ravi M.", status: "incoming", elapsedSec: 38, total: 70, otp: "4021", items: [{ name: "Standard Mess Thali", diet: "veg", tgt: 6, q: 1 }] },
      { id: "H-901", student: "Sana J.", status: "incoming", elapsedSec: 72, total: 105, otp: "7193", items: [{ name: "Special Thali", diet: "veg", tgt: 7, q: 1 }, { name: "Spiced Buttermilk", diet: "veg", tgt: 1, q: 1 }] },
      { id: "H-900", student: "Omar F.", status: "preparing", elapsedSec: 210, total: 85, otp: "3056", items: [{ name: "Egg Curry Meal", diet: "nonveg", tgt: 8, q: 1 }] },
      { id: "H-899", student: "Divya C.", status: "preparing", elapsedSec: 390, total: 90, otp: "8840", items: [{ name: "Curd Rice", diet: "veg", tgt: 4, q: 2 }] },
      { id: "H-898", student: "Harsh G.", status: "ready", elapsedSec: 320, total: 140, otp: "1297", items: [{ name: "Standard Mess Thali", diet: "veg", tgt: 6, q: 2 }] },
      { id: "H-897", student: "Neha B.", status: "collected", elapsedSec: 650, total: 35, otp: "3384", items: [{ name: "Banana (2)", diet: "veg", tgt: 1, q: 1 }, { name: "Spiced Buttermilk", diet: "veg", tgt: 1, q: 1 }] },
    ],
    defaultSpecials: [
      { id: "hb1", name: "Sunday Chicken Curry", desc: "Mess special · limited plates", price: 100, prep: 10, diet: "nonveg", icon: "S", addedAt: now() - 25 * 60 * 1000 },
    ],
    kitchenDishes: [
      { name: "Standard Mess Thali", diet: "veg", tgt: 6 },
      { name: "Special Thali", diet: "veg", tgt: 7 },
      { name: "Egg Curry Meal", diet: "nonveg", tgt: 8 },
      { name: "Curd Rice", diet: "veg", tgt: 4 },
      { name: "Spiced Buttermilk", diet: "veg", tgt: 1 },
    ],
    students: ["Ravi M.", "Sana J.", "Omar F.", "Divya C.", "Harsh G.", "Neha B."],
    kpis: { revenue: 14260, revenueDelta: "▲ 3.1%", orders: 312, ordersDelta: "▲ 11.2%", avgTicket: 46, avgTicketDelta: "▼ ₹2", avgPickupMin: 4, avgPickupSec: 5, avgPickupDelta: "▲ 0:08 faster" },
    topItems: [
      { name: "Standard Mess Thali", diet: "veg", orders: 142, pct: 95 },
      { name: "Special Thali", diet: "veg", orders: 68, pct: 72 },
      { name: "Egg Curry Meal", diet: "nv", orders: 41, pct: 48 },
      { name: "Curd Rice", diet: "veg", orders: 36, pct: 40 },
      { name: "Spiced Buttermilk", diet: "veg", orders: 88, pct: 85 },
    ],
    orders: [
      { id: "H-902", student: "Ravi M.", items: "Standard Mess Thali × 1", total: 70, status: "incoming", time: "12:35" },
      { id: "H-901", student: "Sana J.", items: "Special Thali × 1, Buttermilk × 1", total: 105, status: "preparing", time: "12:34" },
      { id: "H-900", student: "Omar F.", items: "Egg Curry Meal × 1", total: 85, status: "preparing", time: "12:33" },
      { id: "H-899", student: "Divya C.", items: "Curd Rice × 2", total: 90, status: "ready", time: "12:30" },
      { id: "H-898", student: "Harsh G.", items: "Standard Mess Thali × 2", total: 140, status: "collected", time: "12:28" },
      { id: "H-897", student: "Neha B.", items: "Banana × 1, Buttermilk × 1", total: 35, status: "collected", time: "12:25" },
      { id: "H-896", student: "Ravi M.", items: "Special Thali × 1", total: 90, status: "ready", time: "12:22" },
    ],
    studentRows: [
      { name: "Ravi M.", roll: "H-B-104", orders: 22, spend: 1540, last: "12:35" },
      { name: "Sana J.", roll: "H-B-208", orders: 19, spend: 1330, last: "12:34" },
      { name: "Omar F.", roll: "H-B-112", orders: 15, spend: 980, last: "12:33" },
      { name: "Divya C.", roll: "H-B-305", orders: 18, spend: 1120, last: "12:30" },
    ],
    menuModal: [
      { name: "Standard Mess Thali", price: 70, live: true },
      { name: "Special Thali", price: 90, live: true },
      { name: "Egg Curry Meal", price: 85, live: true },
      { name: "Curd Rice", price: 45, live: true },
      { name: "Sunday Chicken Curry", price: 100, live: true },
    ],
    audit: [
      { t: "12:32:01", type: "menu", who: "warden@hostel-b", msg: "approved Sunday chicken special" },
      { t: "12:20:44", type: "order", who: "mess", msg: "batch 902 queued for counter 2" },
      { t: "11:55:12", type: "prep", who: "admin", msg: "updated mess closing time to 2:00 PM" },
    ],
    spDefaults: { name: "Sunday Chicken Curry", desc: "Mess special · limited plates", price: 100, prep: 10, diet: "nonveg" },
    counterBase: 900,
  },
};

export function listCanteens() {
  return DEMO_CANTEEN_IDS.map((id) => {
    const c = CANTEENS[id];
    return { id, name: c.name, short: c.short, av: c.av, block: c.block };
  });
}

export function getCanteen(id?: string | null): Canteen {
  return (id && CANTEENS[id]) || CANTEENS[DEFAULT_ID];
}
