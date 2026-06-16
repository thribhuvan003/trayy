import type { MetadataRoute } from "next";

const SITE_URL = process.env.APP_URL ?? "https://trayy.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Public, indexable pages only. Per-college pages (/college/[slug]) can be
  // appended here later from the DB once those are meant to be discoverable.
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/get-started`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
