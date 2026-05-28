import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAdminClient } from "@/lib/supabase/admin";
import { updateMenuItem, deleteMenuItem } from "@/app/(admin)/admin/_actions";
import { DeleteItemButton } from "@/components/portal-admin/delete-item-button";
import type { MenuItem } from "@/lib/db/types";
import { requireTenantContext } from "@/lib/tenant";
import { ImageUploadField } from "@/components/portal-admin/image-upload-field";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditMenuItemPage({ params }: Props) {
  const { id } = await params;
  // Production-grade tenant context for editing menu items in the owner's dedicated canteen only.
  const { tenant } = await requireTenantContext();
  const supabase = getAdminClient(tenant.id);

  const [{ data: item }, { data: cats }] = await Promise.all([
    supabase
      .from("menu_items")
      .select(
        "id, name, description, price_paise, diet, category_id, image_url, sort_order, status, in_stock, is_special"
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
    const is_special = formData.get("is_special") === "on";

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
      is_special,
    });

    if (result.ok) {
      redirect(`/c/${tenant.slug}/admin/menu`);
    }
  }

  async function handleDelete() {
    "use server";
    const result = await deleteMenuItem(id);
    if (result.ok) {
      redirect(`/c/${tenant.slug}/admin/menu`);
    }
  }

  const priceRupees = (item.price_paise / 100).toFixed(2);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/c/${tenant.slug}/admin/menu`}
          className="text-[11px] font-mono uppercase tracking-[0.12em] text-admin-ink-3 hover:text-admin-ink-2 transition-colors"
        >
          ← Menu
        </Link>
        <span className="text-admin-line-3">/</span>
        <h1 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-tight text-admin-ink">
          Edit item
        </h1>
      </div>

      <form action={handleUpdate} className="max-w-lg space-y-5">
        {/* Name */}
        <div>
          <label className="block text-[13px] font-medium text-admin-ink-2 mb-1" htmlFor="name">
            Name <span className="text-admin-rose">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={item.name}
            className="w-full rounded-lg border border-admin-line-2 bg-admin-bg-card px-3 py-2 text-[14px] text-admin-ink placeholder:text-admin-ink-4 focus:outline-none focus:ring-2 focus:ring-admin-lime-soft focus:border-admin-lime"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[13px] font-medium text-admin-ink-2 mb-1" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={item.description ?? ""}
            className="w-full rounded-lg border border-admin-line-2 bg-admin-bg-card px-3 py-2 text-[14px] text-admin-ink placeholder:text-admin-ink-4 focus:outline-none focus:ring-2 focus:ring-admin-lime-soft focus:border-admin-lime resize-none"
            placeholder="Optional short description"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-[13px] font-medium text-admin-ink-2 mb-1" htmlFor="price">
            Price (₹) <span className="text-admin-rose">*</span>
          </label>
          <input
            id="price"
            name="price"
            type="number"
            required
            min="0.01"
            step="0.01"
            defaultValue={priceRupees}
            className="w-full rounded-lg border border-admin-line-2 bg-admin-bg-card px-3 py-2 text-[14px] text-admin-ink placeholder:text-admin-ink-4 focus:outline-none focus:ring-2 focus:ring-admin-lime-soft focus:border-admin-lime"
          />
        </div>

        {/* Diet */}
        <div>
          <span className="block text-[13px] font-medium text-admin-ink-2 mb-2">Diet</span>
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
                  className="accent-admin-lime"
                />
                <span className="text-[14px] text-admin-ink-2">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Category */}
        {cats && cats.length > 0 && (
          <div>
            <label className="block text-[13px] font-medium text-admin-ink-2 mb-1" htmlFor="category_id">
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={item.category_id ?? ""}
              className="w-full rounded-lg border border-admin-line-2 bg-admin-bg-card px-3 py-2 text-[14px] text-admin-ink focus:outline-none focus:ring-2 focus:ring-admin-lime-soft focus:border-admin-lime"
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

        {/* Today's Special Toggle */}
        <div className="flex items-center gap-2 pt-1 pb-1">
          <input
            type="checkbox"
            id="is_special"
            name="is_special"
            defaultChecked={item.is_special}
            className="rounded border-admin-line-2 text-admin-lime focus:ring-admin-lime accent-admin-lime h-4 w-4"
          />
          <label htmlFor="is_special" className="text-[13px] font-medium text-admin-ink-2 cursor-pointer select-none">
            ✨ Mark as Today&apos;s Special item
          </label>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-[13px] font-medium text-admin-ink-2 mb-2">
            Image
          </label>
          <ImageUploadField name="image_url" defaultUrl={item.image_url} />
        </div>

        {/* Sort order */}
        <div>
          <label className="block text-[13px] font-medium text-admin-ink-2 mb-1" htmlFor="sort_order">
            Sort order
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={item.sort_order}
            className="w-full rounded-lg border border-admin-line-2 bg-admin-bg-card px-3 py-2 text-[14px] text-admin-ink focus:outline-none focus:ring-2 focus:ring-admin-lime-soft focus:border-admin-lime"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-[13px] font-medium text-admin-ink-2 mb-1" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={item.status}
            className="w-full rounded-lg border border-admin-line-2 bg-admin-bg-card px-3 py-2 text-[14px] text-admin-ink focus:outline-none focus:ring-2 focus:ring-admin-lime-soft focus:border-admin-lime"
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
              className="h-4 w-4 rounded border-admin-line-3 accent-admin-lime"
            />
            <span className="text-[14px] text-admin-ink-2">Item is in stock</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-admin-lime px-5 py-2 text-[14px] font-medium text-admin-bg hover:bg-admin-lime-2 transition-colors cursor-pointer"
          >
            Save changes
          </button>
          <Link
            href={`/c/${tenant.slug}/admin/menu`}
            className="rounded-lg px-5 py-2 text-[14px] font-medium text-admin-ink-3 hover:text-admin-ink transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Delete section */}
      <div className="mt-12 max-w-lg border-t border-admin-line pt-6">
        <p className="text-[13px] text-admin-ink-3 mb-3">
          Deleting archives this item. It will no longer appear on the menu.
        </p>
        <DeleteItemButton deleteAction={handleDelete} />
      </div>
    </div>
  );
}
