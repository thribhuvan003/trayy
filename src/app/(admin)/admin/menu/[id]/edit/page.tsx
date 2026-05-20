import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { resolveTenant } from "@/lib/tenant";
import { getAdminClient } from "@/lib/supabase/admin";
import { updateMenuItem, deleteMenuItem } from "@/app/(admin)/admin/_actions";
import { DeleteItemButton } from "@/components/portal-admin/delete-item-button";
import type { MenuItem } from "@/lib/db/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditMenuItemPage({ params }: Props) {
  const { id } = await params;
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) return null;
  const supabase = getAdminClient(tenant.id);

  const [{ data: item }, { data: cats }] = await Promise.all([
    supabase
      .from("menu_items")
      .select(
        "id, name, description, price_paise, diet, category_id, image_url, sort_order, status, in_stock"
      )
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .returns<MenuItem[]>()
      .then(r => ({ data: r.data?.[0] ?? null, error: r.error })),
    supabase
      .from("menu_categories")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .order("sort_order")
      .returns<{ id: string; name: string }[]>(),
  ]);

  if (!item) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const priceRaw = formData.get("price") as string | null;
    const price_paise = Math.round(parseFloat(priceRaw ?? "0") * 100);

    if (!name) return;
    if (!(price_paise > 0)) return;

    const description = (formData.get("description") as string | null)?.trim() || null;
    const diet = (formData.get("diet") as "veg" | "nonveg" | "egg") ?? "veg";
    const category_id = (formData.get("category_id") as string | null) || null;
    const image_url = (formData.get("image_url") as string | null)?.trim() || null;
    const sort_order = parseInt((formData.get("sort_order") as string | null) ?? "0", 10) || 0;
    const status = (formData.get("status") as "draft" | "live" | "archived") ?? "draft";
    const in_stock = formData.get("in_stock") === "on";

    const result = await updateMenuItem(id, {
      name,
      description,
      price_paise,
      diet,
      category_id,
      image_url,
      sort_order,
      status,
      in_stock,
    });

    if (result.ok) {
      redirect("/admin/menu");
    }
  }

  async function handleDelete() {
    "use server";
    const result = await deleteMenuItem(id);
    if (result.ok) {
      redirect("/admin/menu");
    }
  }

  const priceRupees = (item.price_paise / 100).toFixed(2);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/admin/menu"
          className="text-[11px] font-mono uppercase tracking-[0.12em] text-graphite-400 hover:text-graphite-700 transition-colors"
        >
          ← Menu
        </Link>
        <span className="text-graphite-200">/</span>
        <h1 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-tight">
          Edit item
        </h1>
      </div>

      <form action={handleUpdate} className="max-w-lg space-y-5">
        {/* Name */}
        <div>
          <label className="block text-[13px] font-medium text-graphite-700 mb-1" htmlFor="name">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={item.name}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[13px] font-medium text-graphite-700 mb-1" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={item.description ?? ""}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
            placeholder="Optional short description"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-[13px] font-medium text-graphite-700 mb-1" htmlFor="price">
            Price (₹) <span className="text-red-500">*</span>
          </label>
          <input
            id="price"
            name="price"
            type="number"
            required
            min="0.01"
            step="0.01"
            defaultValue={priceRupees}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>

        {/* Diet */}
        <div>
          <span className="block text-[13px] font-medium text-graphite-700 mb-2">Diet</span>
          <div className="flex gap-5">
            {[
              { value: "veg", label: "Veg" },
              { value: "nonveg", label: "Non-Veg" },
              { value: "egg", label: "Egg" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="diet"
                  value={opt.value}
                  defaultChecked={item.diet === opt.value}
                  className="accent-primary"
                />
                <span className="text-[14px] text-graphite-800">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Category */}
        {cats && cats.length > 0 && (
          <div>
            <label className="block text-[13px] font-medium text-graphite-700 mb-1" htmlFor="category_id">
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={item.category_id ?? ""}
              className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="">No category</option>
              {cats.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Image URL */}
        <div>
          <label className="block text-[13px] font-medium text-graphite-700 mb-1" htmlFor="image_url">
            Image URL (optional)
          </label>
          <input
            id="image_url"
            name="image_url"
            type="url"
            defaultValue={item.image_url ?? ""}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            placeholder="https://..."
          />
        </div>

        {/* Sort order */}
        <div>
          <label className="block text-[13px] font-medium text-graphite-700 mb-1" htmlFor="sort_order">
            Sort order
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={item.sort_order}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-[13px] font-medium text-graphite-700 mb-1" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={item.status}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          >
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* In stock */}
        <div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="in_stock"
              defaultChecked={item.in_stock}
              className="h-4 w-4 rounded border-graphite-300 accent-primary"
            />
            <span className="text-[14px] text-graphite-800">Item is in stock</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2 text-[14px] font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Save changes
          </button>
          <Link
            href="/admin/menu"
            className="rounded-lg px-5 py-2 text-[14px] font-medium text-graphite-600 hover:text-graphite-900 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Delete section */}
      <div className="mt-12 max-w-lg border-t border-graphite-100 pt-6">
        <p className="text-[13px] text-graphite-500 mb-3">
          Deleting archives this item. It will no longer appear on the menu.
        </p>
        <DeleteItemButton deleteAction={handleDelete} />
      </div>
    </div>
  );
}
