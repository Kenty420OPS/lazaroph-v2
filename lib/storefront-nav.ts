// Single source of truth for the storefront navigation links and shop pills.
// Presentation and links only — no data fetching or API logic lives here.

export type StorefrontNavLink = { label: string; href: string };

const categoryHref = (category: string) =>
  `/shop?category=${encodeURIComponent(category)}`;

const genderHref = (gender: string) => `/shop?gender=${encodeURIComponent(gender)}`;

// Pills shown on the shop page (category row).
export const STOREFRONT_CATEGORIES = ["Shoes", "Slides", "Watches"] as const;

// Pills shown on the shop page (gender row).
export const STOREFRONT_GENDERS = ["Men", "Women", "Kids"] as const;

// Header order: New arrivals, then genders, then categories.
export const HEADER_NAV: StorefrontNavLink[] = [
  { label: "New arrivals", href: "/shop" },
  ...STOREFRONT_GENDERS.map((gender) => ({
    label: gender,
    href: genderHref(gender),
  })),
  ...STOREFRONT_CATEGORIES.map((category) => ({
    label: category,
    href: categoryHref(category),
  })),
];

// Same items as HEADER_NAV, with "New arrivals" title-cased for the footer.
export const FOOTER_SHOP_NAV: StorefrontNavLink[] = HEADER_NAV.map((item) =>
  item.label === "New arrivals" ? { ...item, label: "New Arrivals" } : item
);
