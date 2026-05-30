"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Token-driven custom dropdown for the admin menu-item forms.
 *
 * Replaces native <select> elements: a native select's open popup is OS-drawn,
 * and its background + active-row highlight cannot be restyled, so on a dark OS
 * theme it renders as a grey panel that clashes with the light admin form. This
 * matches --admin-bg-card, uses the admin font, is curved, and submits its
 * value through a hidden input so the parent server-action form is unchanged.
 *
 * An option whose value is "" is treated as a placeholder (muted text).
 */
export type SelectOption = { value: string; label: string };

export function AdminSelect({
  name,
  options,
  defaultValue = "",
  ariaLabel,
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`relative ${open ? "z-50" : ""}`} ref={ref}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between rounded-lg border border-admin-line-2 bg-admin-bg-card px-3 py-2 text-left text-[14px] text-admin-ink focus:outline-none focus:ring-2 focus:ring-admin-lime-soft focus:border-admin-lime transition-colors"
      >
        <span className={selected?.value ? "" : "text-admin-ink-4"}>{selected?.label ?? ""}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-admin-ink-3 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-admin-line-2 bg-admin-bg-card p-1 shadow-xl shadow-black/20"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value || "__placeholder"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setValue(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[14px] transition-colors ${
                    active
                      ? "bg-admin-lime-soft text-admin-lime font-medium"
                      : o.value
                        ? "text-admin-ink hover:bg-admin-bg-2"
                        : "text-admin-ink-4 hover:bg-admin-bg-2"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {active && (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
