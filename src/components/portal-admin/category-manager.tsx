"use client";

import { useState, useTransition } from "react";
import { Plus, Edit2, Trash2, Check, X, Tag } from "lucide-react";
import { toast } from "sonner";
import { createCategory, updateCategory, deleteCategory } from "@/app/(admin)/admin/_actions";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
};

type Props = {
  categories: Category[];
  itemCounts: Record<string, number>;
};

export function CategoryManager({ categories, itemCounts }: Props) {
  const [pending, start] = useTransition();
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = () => {
    const name = newCatName.trim();
    if (!name) return;
    start(async () => {
      const r = await createCategory(name);
      if (!r.ok) {
        toast.error(r.error ?? "Failed to create category");
      } else {
        toast.success("Category created successfully");
        setNewCatName("");
      }
    });
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleUpdate = (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    start(async () => {
      const r = await updateCategory(id, name);
      if (!r.ok) {
        toast.error(r.error ?? "Failed to update category");
      } else {
        toast.success("Category updated successfully");
        setEditingId(null);
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    const dishCount = itemCounts[id] ?? 0;
    const warningText = dishCount > 0 
      ? `This category contains ${dishCount} item(s). Deleting it will mark these items as having "No category". Are you sure you want to delete "${name}"?`
      : `Are you sure you want to delete the category "${name}"?`;

    if (!confirm(warningText)) return;

    start(async () => {
      const r = await deleteCategory(id);
      if (!r.ok) {
        toast.error(r.error ?? "Failed to delete category");
      } else {
        toast.success("Category deleted successfully");
      }
    });
  };

  return (
    <div className="w-full max-w-3xl mt-2 flex flex-col gap-6">
      {/* Create Box */}
      <div className="p-5 rounded-2xl border border-graphite-200/15 bg-graphite-700/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <label htmlFor="new-category" className="block text-[12px] font-mono uppercase tracking-wider text-graphite-400 mb-1.5">
            Add New Category
          </label>
          <div className="relative">
            <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-graphite-400" />
            <input
              id="new-category"
              type="text"
              placeholder="e.g. Desserts, North Indian, Coolers..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              disabled={pending}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-graphite-200/10 bg-graphite-800 text-[14px] text-graphite-100 placeholder-graphite-500 focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={pending || !newCatName.trim()}
          className="self-end sm:self-auto h-[42px] px-5 rounded-xl bg-lime hover:bg-lime/90 disabled:opacity-50 disabled:cursor-not-allowed text-graphite-900 font-semibold text-[13.5px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Categories List */}
      <div className="bg-graphite-700 border border-graphite-200/[0.08] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-graphite-200/[0.08] flex items-center justify-between">
          <h3 className="font-display font-medium text-[16px] text-graphite-200">Current Categories</h3>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-graphite-600 text-graphite-400">
            {categories.length} total
          </span>
        </div>

        <ul className="divide-y divide-graphite-200/[0.05]">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            const dishCount = itemCounts[cat.id] ?? 0;

            return (
              <li key={cat.id} className="px-5 py-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-graphite-600/30">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(cat.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      disabled={pending}
                      className="w-full max-w-md px-3 py-1.5 rounded-lg border border-graphite-200/10 bg-graphite-800 text-[14px] text-graphite-100 focus:outline-none focus:border-lime"
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-graphite-200 text-[14.5px]">{cat.name}</span>
                      <span className="text-[11px] font-mono bg-graphite-600 text-graphite-400 px-2 py-0.5 rounded-md">
                        {dishCount} item{dishCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleUpdate(cat.id)}
                        disabled={pending || !editingName.trim()}
                        className="p-1.5 rounded bg-lime/10 text-lime hover:bg-lime/20 transition-colors"
                        title="Save name"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={pending}
                        className="p-1.5 rounded bg-graphite-600 text-graphite-400 hover:text-graphite-300 transition-colors"
                        title="Cancel"
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartEdit(cat)}
                        disabled={pending}
                        className="p-1.5 rounded text-graphite-400 hover:text-graphite-200 hover:bg-graphite-600 transition-colors"
                        title="Edit name"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        disabled={pending}
                        className="p-1.5 rounded text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}

          {categories.length === 0 && (
            <li className="px-5 py-12 text-center text-graphite-400 text-[13.5px] italic">
              No custom categories created yet. Add one above!
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
