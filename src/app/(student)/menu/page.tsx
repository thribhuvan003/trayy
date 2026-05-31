import { headers } from "next/headers";
import { resolveTenant, collegeCanteens, getTenantSlugFromHeaders, type CollegeCanteen } from "@/lib/tenant";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { MenuBoard } from "@/components/portal-student/menu-board";
import { ClosedBanner } from "@/components/portal-student/closed-banner";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentMenuPage() {
  const h = await headers();
  const slug = getTenantSlugFromHeaders(h);
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();

  let catsData: any[] | null = null;
  let itemsData: any[] | null = null;
  let statusData: any | null = null;
  let adminData: any | null = null;

  try {
    const supabase = await getServerClient(tenant.id);
    const [catsRes, itemsRes, statusRes, adminRes] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("tenant_id", tenant.id).order("sort_order"),
      supabase.from("menu_items").select("*").eq("tenant_id", tenant.id).eq("status", "live").order("sort_order"),
      supabase.from("tenants").select("is_open, paused_until").eq("id", tenant.id).maybeSingle(),
      supabase
        .from("tenant_memberships")
        .select("display_name")
        .eq("tenant_id", tenant.id)
        .eq("role", "canteen_admin")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
    ]);
    catsData = catsRes.data;
    itemsData = itemsRes.data;
    statusData = statusRes.data;
    adminData = adminRes.data;
  } catch (err) {
    console.error("Local database queries bypassed:", err);
  }

  const mockCats = [
    { id: "cat-snacks", tenant_id: tenant.id, name: "Snacks", sort_order: 1, created_at: new Date().toISOString() },
    { id: "cat-beverages", tenant_id: tenant.id, name: "Beverages", sort_order: 2, created_at: new Date().toISOString() },
    { id: "cat-meals", tenant_id: tenant.id, name: "Meals", sort_order: 3, created_at: new Date().toISOString() },
  ];

  const mockItems = [
    {
      id: "item-momo",
      tenant_id: tenant.id,
      category_id: null,
      is_special: true,
      name: "Steamed Momo",
      description:
        "Delicate, thin-wrapped hot momos filled with fresh spring veggies and paneer. Served with fiery red chili dipping chutney.",
      price_paise: 8000,
      status: "live",
      diet: "veg",
      in_stock: true,
      prep_time_minutes: 8,
      image_url: null,
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: "item-biryani",
      tenant_id: tenant.id,
      category_id: null,
      is_special: true,
      name: "Chicken Biryani",
      description:
        "Basmati rice slow-cooked on dum with aromatic spices, fresh mint, and tender bone-in chicken. Served with classic raita.",
      price_paise: 15000,
      status: "live",
      diet: "nonveg",
      in_stock: true,
      prep_time_minutes: 12,
      image_url: null,
      sort_order: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: "item-samosa",
      tenant_id: tenant.id,
      category_id: "cat-snacks",
      name: "Crispy Samosa",
      description:
        "Golden flaky pastry stuffed with seasoned potatoes, green peas, coriander, and native spices. Served with sweet dates-tamarind chutney.",
      price_paise: 2000,
      status: "live",
      diet: "veg",
      in_stock: true,
      prep_time_minutes: 3,
      image_url: null,
      sort_order: 3,
      created_at: new Date().toISOString(),
    },
    {
      id: "item-maggie",
      tenant_id: tenant.id,
      category_id: "cat-snacks",
      name: "Butter Maggie",
      description:
        "Classic instant masala noodles spiked with additional butter, freshly shredded carrots, sweet corn, and hot green chilis.",
      price_paise: 3000,
      status: "live",
      diet: "veg",
      in_stock: true,
      prep_time_minutes: 5,
      image_url: null,
      sort_order: 4,
      created_at: new Date().toISOString(),
    },
    {
      id: "item-chai",
      tenant_id: tenant.id,
      category_id: "cat-beverages",
      name: "Hot Masala Chai",
      description:
        "Fresh milk tea brewed with crushed cardamom, ginger roots, cinnamon sticks, and premium Assam tea leaves. Piping hot.",
      price_paise: 1500,
      status: "live",
      diet: "veg",
      in_stock: true,
      prep_time_minutes: 4,
      image_url: null,
      sort_order: 5,
      created_at: new Date().toISOString(),
    },
    {
      id: "item-coffee",
      tenant_id: tenant.id,
      category_id: "cat-beverages",
      name: "Iced Cold Coffee",
      description:
        "Rich, creamy espresso blend whipped with ice-cold milk, standard sugar, and a heavy drizzle of rich chocolate syrup.",
      price_paise: 4000,
      status: "live",
      diet: "veg",
      in_stock: true,
      prep_time_minutes: 4,
      image_url: null,
      sort_order: 6,
      created_at: new Date().toISOString(),
    },
    {
      id: "item-dosa",
      tenant_id: tenant.id,
      category_id: "cat-meals",
      name: "Ghee Podi Masala Dosa",
      description:
        "Super thin, ultra crispy fermented rice crepe roasted with pure desi ghee, dusted with gun powder (podi) and filled with spiced potato mash.",
      price_paise: 6000,
      status: "live",
      diet: "veg",
      in_stock: true,
      prep_time_minutes: 10,
      image_url: null,
      sort_order: 7,
      created_at: new Date().toISOString(),
    },
  ];

  const DEMO_TENANT_ID = "d3b07384-d113-4e6b-a25e-e4a81e355fd5";
  const isDemo = tenant.id === DEMO_TENANT_ID;
  // SECURITY: mock menu data must ONLY appear for the hardcoded demo tenant.
  // For every other tenant, we show what the DB returned (possibly an empty
  // array) — never fake dishes.  Previously allowMock let any tenant fall back
  // to mock items whenever the DB query errored (returned null), which meant
  // real students could see and try to order food that doesn't exist.
  const categories = isDemo && (catsData === null || catsData.length === 0)
    ? mockCats
    : (catsData ?? []);
  const items = isDemo && (itemsData === null || itemsData.length === 0)
    ? mockItems
    : (itemsData ?? []);

  const isClosed = statusData ? !statusData.is_open : false;
  const pausedUntil = statusData?.paused_until ?? null;
  const adminName = adminData?.display_name ?? "Counter Chef";

  // Fetch sibling canteens for the switcher segments
  const siblings: CollegeCanteen[] = tenant.college_slug
    ? await collegeCanteens(tenant.college_slug).catch(() => [])
    : [];

  if (siblings.length > 0) {
    try {
      const admin = getAdminClient();
      // Scope to only sibling slugs — avoids full-table scan
      const siblingSlugSet = siblings.map((s) => s.slug);
      const { data: counts } = await admin
        .from("menu_items")
        .select("id, tenants!inner(slug)")
        .in("tenants.slug", siblingSlugSet)
        .eq("status", "live");

      if (counts) {
        const dishCountsMap: Record<string, number> = {};
        for (const item of counts) {
          const s = (item.tenants as any)?.slug;
          if (s) {
            dishCountsMap[s] = (dishCountsMap[s] || 0) + 1;
          }
        }
        for (const sib of siblings) {
          sib.dishCount = dishCountsMap[sib.slug] ?? 0;
        }
      }
    } catch (err) {
      console.error("Failed to fetch dish counts for siblings:", err);
    }
  }

  const user = await getCurrentUser();
  const currentSibling = siblings.find((s) => s.slug === tenant.slug);
  const pendingCount = currentSibling ? Number(currentSibling.pending_orders_count || 0) : 0;

  return (
    <>
      <ClosedBanner
        tenantName={tenant.name}
        isClosed={isClosed}
        pausedUntil={pausedUntil}
      />
      <MenuBoard
        categories={categories}
        items={items}
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
        siblings={siblings}
        user={user}
        adminName={adminName}
        isOpen={!isClosed}
        pausedUntil={pausedUntil}
        pendingCount={pendingCount}
        collegeSlug={tenant.college_slug}
      />
    </>
  );
}
