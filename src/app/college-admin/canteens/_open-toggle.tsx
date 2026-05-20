"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { setCanteenOpen } from "../_actions";

export function OpenToggle({
  tenantId,
  initialIsOpen,
}: {
  tenantId: string;
  initialIsOpen: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  // Controlled state so the toggle reflects the real DB value after mutations
  const [isOpen, setIsOpen] = useState(initialIsOpen);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    // Optimistic update
    setIsOpen(next);
    startTransition(async () => {
      const result = await setCanteenOpen(tenantId, next);
      if (!result.ok) {
        // Revert on failure
        setIsOpen(!next);
        toast.error(result.error ?? "Failed to update canteen status");
      }
    });
  };

  return (
    <label
      className="relative inline-flex items-center cursor-pointer"
      aria-label={isOpen ? "Close canteen" : "Open canteen"}
    >
      <input
        type="checkbox"
        checked={isOpen}
        onChange={handleChange}
        disabled={isPending}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-graphite-200/10 peer-focus:ring-2 peer-focus:ring-lime/40 rounded-full peer peer-checked:bg-lime/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-graphite-400 peer-checked:after:bg-lime after:rounded-full after:h-4 after:w-4 after:transition-all" />
    </label>
  );
}
