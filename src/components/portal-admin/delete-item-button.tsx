"use client";

/**
 * Confirmation wrapper for the delete (archive) action on the menu item edit
 * page. Must be a client component because the confirmation dialog is a
 * browser-only API — event handlers cannot exist in server components.
 */
export function DeleteItemButton({
  deleteAction,
}: {
  deleteAction: () => Promise<void>;
}) {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (!confirm("Archive this item? It will be hidden from the menu.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-100 transition-colors"
      >
        Delete (archive) item
      </button>
    </form>
  );
}
