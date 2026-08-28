import type { Product } from "@shared/commerce/types";

export const SHOP_DEPARTMENTS = [
  { slug: "tools-equipment", label: "Tools & Equipment", description: "Power tools, hand tools, testing equipment, access gear, and trade essentials.", icon: "wrench" },
  { slug: "construction-materials", label: "Construction Materials", description: "Cement, steel, roofing, timber, finishing materials, and site consumables.", icon: "blocks" },
  { slug: "safety-ppe", label: "Safety & PPE", description: "Protective clothing, helmets, footwear, fall protection, signage, and fire safety.", icon: "hard-hat" },
  { slug: "electrical", label: "Electrical", description: "Cables, breakers, lighting, panels, testing tools, and installation accessories.", icon: "zap" },
  { slug: "plumbing-water", label: "Plumbing & Water Systems", description: "Pipes, fittings, pumps, sanitation, drainage, irrigation, and water treatment.", icon: "droplets" },
  { slug: "energy-power", label: "Energy & Power Solutions", description: "Solar, batteries, inverters, generators, site power, and energy accessories.", icon: "sun" },
  { slug: "vehicle-parts", label: "Vehicle Parts & Accessories", description: "Fleet parts, tyres, workshop consumables, diagnostics, and transport accessories.", icon: "truck" },
  { slug: "agriculture", label: "Agriculture", description: "Farm tools, irrigation, small machinery, processing equipment, and land-care supplies.", icon: "sprout" },
  { slug: "industrial-machinery", label: "Industrial & Heavy Machinery", description: "Plant, fabrication, hydraulics, lifting, compressed air, and industrial components.", icon: "factory" },
  { slug: "training-certification", label: "Training & Certification", description: "Trade training, safety instruction, equipment operation, and professional development.", icon: "graduation-cap" },
  { slug: "digital-resources", label: "Digital Resources", description: "Templates, guides, digital toolkits, drawings, and operational resources.", icon: "file-text" },
  { slug: "services", label: "Services", description: "Installation, maintenance, inspection, logistics, repair, and specialist support.", icon: "briefcase" },
] as const;

export type ShopDepartmentSlug = (typeof SHOP_DEPARTMENTS)[number]["slug"];

export function tagValue(product: Pick<Product, "tags">, prefix: string) {
  return product.tags.find((tag) => tag.startsWith(`${prefix}:`))?.slice(prefix.length + 1) ?? null;
}

export function getProductDepartment(product: Product): ShopDepartmentSlug | "other" {
  const tagged = tagValue(product, "department");
  if (SHOP_DEPARTMENTS.some((department) => department.slug === tagged)) return tagged as ShopDepartmentSlug;
  const type = (product.productType ?? "").toLowerCase();
  if (type.includes("tool")) return "tools-equipment";
  if (type.includes("energy") || type.includes("power")) return "energy-power";
  if (type.includes("training")) return "training-certification";
  if (type.includes("digital")) return "digital-resources";
  if (type.includes("service")) return "services";
  return "other";
}

export function getProductModality(product: Product) {
  return tagValue(product, "modality") ?? "physical-goods";
}

export function getProductCondition(product: Product) {
  return tagValue(product, "condition") ?? null;
}

export function getProductImage(product: Product) {
  if (product.images[0]?.url) return product.images[0].url;
  if (product.handle === "professional-cordless-impact-drill-kit") return "/manus-storage/zylo-cordless-impact-drill-kit_4381f53b.png";
  if (product.handle === "portable-solar-site-lighting-kit") return "/manus-storage/zylo-portable-solar-site-lighting-kit_9fd55cad.png";
  return null;
}

export const PRODUCT_MODALITY_LABELS: Record<string, string> = {
  "physical-goods": "Buy",
  rental: "Rent",
  training: "Training",
  service: "Service",
  digital: "Digital",
};

export const RESTRICTED_PRODUCT_TERMS = [
  "firearm", "ammunition", "explosive", "detonator", "controlled chemical", "medical drug", "stolen", "counterfeit",
];
