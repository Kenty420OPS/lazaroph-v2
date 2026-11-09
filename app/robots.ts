import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isComingSoon =
    process.env.COMING_SOON === "true" || process.env.COMING_SOON === "1";

  if (isComingSoon) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/portal/", "/admin/", "/api/"],
    },
    sitemap: "https://lazarophstore.com/sitemap.xml",
  };
}

