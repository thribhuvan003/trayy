const STORAGE_KEY = "tray-kitchen-sounds-on";

/** Kitchen new-order chime preference (default on). */
export function readKitchenSoundsOn(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "false") return false;
  if (v === "true") return true;
  return true;
}

export function writeKitchenSoundsOn(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, on ? "true" : "false");
}
