import type { MetadataRoute } from "next";

const SITE_URL = process.env.APP_URL ?? "https://trayy.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private app surfaces — keep them out of the index.
      disallow: [
        "/api/",
        "/auth/",
        "/admin",
        "/kitchen",
        "/college-admin",
        "/menu",
        "/orders",
        "/pay",
        "/track",
        "/unauthorised",
        "/c/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
