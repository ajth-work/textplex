export type ThemeCatalogCategory = "all" | "core" | "classic-consoles" | "fruit" | "vegetable" | "seasonal" | "international";
export type ThemeCatalogMode = "all" | "daylight" | "night";

export const themeCatalogCategories: Array<{ value: ThemeCatalogCategory; label: string }> = [
  { value: "all", label: "All themes" },
  { value: "core", label: "Included" },
  { value: "fruit", label: "Fruit" },
  { value: "vegetable", label: "Vegetable" },
  { value: "seasonal", label: "Seasonal" },
  { value: "international", label: "International" },
  { value: "classic-consoles", label: "Classic Consoles" },
];

export const themeCatalogCollectionDescriptions: Record<Exclude<ThemeCatalogCategory, "all">, string> = {
  core: "Free foundations for comfortable everyday reading.",
  fruit: "Bright, fresh market-inspired atmospheres.",
  vegetable: "Grounded botanical palettes with quiet warmth.",
  seasonal: "Limited-edition moods for the changing year.",
  international: "City and culture-inspired reading atmospheres.",
  "classic-consoles": "Hardware-inspired palettes with nostalgic contrast.",
};

export const themeCatalogModes: Array<{ value: ThemeCatalogMode; label: string }> = [
  { value: "all", label: "All modes" },
  { value: "daylight", label: "Daylight" },
  { value: "night", label: "Night" },
];

const wallpaperThemeIds = new Set([
  "fruit-strawberry",
  "fruit-blueberry",
  "fruit-citrus",
  "fruit-mango",
  "fruit-watermelon",
  "fruit-grape",
  "vegetable-avocado",
  "vegetable-carrot",
  "vegetable-tomato",
  "vegetable-corn",
  "vegetable-cucumber",
  "vegetable-eggplant",
  "season-summer-citrus",
  "season-summer-meadow",
  "season-summer-seaside",
  "season-fall-maple-daylight",
  "season-fall-maple-night",
  "season-fall-pumpkin-daylight",
  "season-fall-pumpkin-night",
  "season-fall-harvest-daylight",
  "season-fall-harvest-night",
  "city-moscow-daylight",
  "city-moscow-night",
  "city-st-petersburg-daylight",
  "city-st-petersburg-night",
  "city-kazan-daylight",
  "city-kazan-night",
]);

export function getThemeWallpaperPath(themeId: string): string | null {
  return wallpaperThemeIds.has(themeId) ? `/themes/${themeId}.jpg` : null;
}

export function getThemeCatalogCategory(themeId: string, isFree = false): Exclude<ThemeCatalogCategory, "all"> {
  if (isFree || ["neutral", "sepia", "ink", "black"].includes(themeId)) {
    return "core";
  }
  if (themeId.startsWith("fruit-")) {
    return "fruit";
  }
  if (themeId.startsWith("vegetable-")) {
    return "vegetable";
  }
  if (themeId.startsWith("season-")) {
    return "seasonal";
  }
  if (themeId.startsWith("city-") || themeId.startsWith("international-")) {
    return "international";
  }
  if (["nes", "famicom", "snes", "super-famicom"].includes(themeId)) {
    return "classic-consoles";
  }
  return "core";
}

export function getThemeCatalogMode(themeId: string): Exclude<ThemeCatalogMode, "all"> | null {
  if (themeId.endsWith("-daylight")) {
    return "daylight";
  }
  if (themeId.endsWith("-night")) {
    return "night";
  }
  return null;
}

export function matchesThemeCatalogFilters(
  theme: { id: string; title: string; description: string; is_free: boolean },
  query: string,
  category: ThemeCatalogCategory,
  mode: ThemeCatalogMode,
): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const searchable = `${theme.title} ${theme.description} ${theme.id}`.toLocaleLowerCase();
  const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
  const matchesCategory = category === "all" || getThemeCatalogCategory(theme.id, theme.is_free) === category;
  const themeMode = getThemeCatalogMode(theme.id);
  const matchesMode = mode === "all" || themeMode === mode;
  return matchesQuery && matchesCategory && matchesMode;
}
