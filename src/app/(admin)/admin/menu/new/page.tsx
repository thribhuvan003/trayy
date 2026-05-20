import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { resolveTenant } from "@/lib/tenant";
import { getServerClient } from "@/lib/supabase/server";
import { createMenuItem } from "@/app/(admin)/admin/_actions";

export const dynamic = "force-dynamic";

export default async function NewMenuItemPage() {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) return null;
  const supabase = await getServerClient(tenant.id);
  const { data: cats } = await supabase
    .from("menu_categories")
    .select("id, name")
    .eq("tenant_id", tenant.id)
    .order("sort_order")
    .returns<{ id: string; name: string }[]>();

  async function handleCreate(formData: FormData) {
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

    const result = await createMenuItem({
      name,
      description,
      price_paise,
      diet,
      category_id,
      image_url,
      sort_order,
    });

    if (result.ok) {
      redirect("/admin/menu");
    }
  }

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
          New item
        </h1>
      </div>

      <form action={handleCreate} className="max-w-lg space-y-5">
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
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            placeholder="e.g. Masala Dosa"
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
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            placeholder="0.00"
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
                  defaultChecked={opt.value === "veg"}
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
            defaultValue={0}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-[14px] text-graphite-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>

        {/* Publish note */}
        <div className="rounded-lg border border-lime/30 bg-lime/5 px-4 py-3">
          <p className="text-[12px] text-lime leading-relaxed">
            <strong>New items are immediately visible to students.</strong> Uncheck to save as draft if you want to hide this item from the menu until you&rsquo;re ready.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2 text-[14px] font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Create item
          </button>
          <Link
            href="/admin/menu"
            className="rounded-lg px-5 py-2 text-[14px] font-medium text-graphite-600 hover:text-graphite-900 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
