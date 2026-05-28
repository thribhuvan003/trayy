import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { createMenuItem } from "@/app/(admin)/admin/_actions";
import { requireTenantContext } from "@/lib/tenant";
import { ImageUploadField } from "@/components/portal-admin/image-upload-field";

export const dynamic = "force-dynamic";

export default async function NewMenuItemPage() {
  // Production-grade tenant context for creating menu items in the owner's dedicated canteen only.
  const { tenant } = await requireTenantContext();
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
    const is_special = formData.get("is_special") === "on";

    const result = await createMenuItem({
      name,
      description,
      price_paise,
      diet,
      category_id,
      image_url,
      sort_order,
      is_special,
    });

    if (result.ok) {
      redirect(`/c/${tenant.slug}/admin/menu`);
    }
  }

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
          New item
        </h1>
      </div>

      <form action={handleCreate} className="max-w-lg space-y-5">
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
            className="w-full rounded-lg border border-admin-line-2 bg-admin-bg-card px-3 py-2 text-[14px] text-admin-ink placeholder:text-admin-ink-4 focus:outline-none focus:ring-2 focus:ring-admin-lime-soft focus:border-admin-lime"
            placeholder="e.g. Masala Dosa"
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
            className="w-full rounded-lg border border-admin-line-2 bg-admin-bg-card px-3 py-2 text-[14px] text-admin-ink placeholder:text-admin-ink-4 focus:outline-none focus:ring-2 focus:ring-admin-lime-soft focus:border-admin-lime"
            placeholder="0.00"
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
                  defaultChecked={opt.value === "veg"}
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
          <ImageUploadField name="image_url" />
        </div>

        {/* sort_order is sent as default 0 via server action — no user-facing field needed */}

        {/* Publish note */}
        <div className="rounded-lg border border-admin-lime/30 bg-admin-lime-soft px-4 py-3">
          <p className="text-[12px] text-admin-lime leading-relaxed">
            <strong>New items are immediately visible to students.</strong>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-admin-lime px-5 py-2 text-[14px] font-medium text-admin-bg hover:bg-admin-lime-2 transition-colors cursor-pointer"
          >
            Create item
          </button>
          <Link
            href={`/c/${tenant.slug}/admin/menu`}
            className="rounded-lg px-5 py-2 text-[14px] font-medium text-admin-ink-3 hover:text-admin-ink transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
