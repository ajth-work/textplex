import { notFound } from "next/navigation";

import { ThemeShopSurfaceView } from "../../../components/surface-views";
import { themeCatalogCategories, type ThemeCatalogCategory } from "../../../lib/theme-catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

export default async function ThemeCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params;
  const category = themeCatalogCategories.find((item) => item.value === resolvedParams.category && item.value !== "all")?.value as ThemeCatalogCategory | undefined;

  if (!category) {
    notFound();
  }

  return <ThemeShopSurfaceView categorySlug={category} />;
}
