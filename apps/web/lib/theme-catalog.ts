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

export type ThemeWallpaperAsset = {
  version: number;
  path: string;
};

// Register every generated candidate for a theme. An unversioned asset should use version 0;
// the resolver below always prefers the highest numeric version on record.
export const themeWallpaperAssetCandidates: Record<string, ThemeWallpaperAsset[]> = {
  "fruit-strawberry": [
    { version: 1, path: "/themes/fruit-strawberry-v1.jpg" },
    { version: 2, path: "/themes/fruit-strawberry-v2.png" },
    { version: 3, path: "/themes/fruit-strawberry-v3.png" },
    { version: 4, path: "/themes/fruit-strawberry-v4.png" },
    { version: 5, path: "/themes/fruit-strawberry-v5.png" },
    { version: 6, path: "/themes/fruit-strawberry-v6.png" },
  ],
  "fruit-strawberry-night": [{ version: 1, path: "/themes/fruit-strawberry-night-v1.png" }],
  "fruit-blueberry": [{ version: 1, path: "/themes/fruit-blueberry-v1.jpg" }],
  "fruit-citrus": [{ version: 1, path: "/themes/fruit-citrus-v1.jpg" }],
  "fruit-mango": [{ version: 1, path: "/themes/fruit-mango-v1.jpg" }],
  "fruit-watermelon": [{ version: 1, path: "/themes/fruit-watermelon-v1.jpg" }],
  "fruit-grape": [{ version: 1, path: "/themes/fruit-grape-v1.jpg" }],
  "vegetable-avocado": [{ version: 1, path: "/themes/vegetable-avocado-v1.jpg" }],
  "vegetable-carrot": [{ version: 1, path: "/themes/vegetable-carrot-v1.jpg" }],
  "vegetable-tomato": [{ version: 1, path: "/themes/vegetable-tomato-v1.jpg" }],
  "vegetable-corn": [{ version: 1, path: "/themes/vegetable-corn-v1.jpg" }],
  "vegetable-cucumber": [
    { version: 1, path: "/themes/vegetable-cucumber-v1.jpg" },
    { version: 2, path: "/themes/vegetable-cucumber-v2.png" },
    { version: 3, path: "/themes/vegetable-cucumber-v3.png" },
    { version: 4, path: "/themes/vegetable-cucumber-v4.png" },
  ],
  "vegetable-eggplant": [{ version: 1, path: "/themes/vegetable-eggplant-v1.jpg" }],
  "season-summer-citrus": [{ version: 1, path: "/themes/season-summer-citrus-v1.jpg" }],
  "season-summer-meadow": [{ version: 1, path: "/themes/season-summer-meadow-v1.jpg" }],
  "season-summer-seaside": [{ version: 1, path: "/themes/season-summer-seaside-v1.jpg" }],
  "season-summer-citrus-night": [{ version: 1, path: "/themes/season-summer-citrus-night-v1.jpg" }],
  "season-summer-meadow-night": [{ version: 1, path: "/themes/season-summer-meadow-night-v1.jpg" }],
  "season-summer-seaside-night": [{ version: 1, path: "/themes/season-summer-seaside-night-v1.jpg" }],
  "season-fall-maple-daylight": [{ version: 1, path: "/themes/season-fall-maple-daylight-v1.jpg" }],
  "season-fall-maple-night": [{ version: 1, path: "/themes/season-fall-maple-night-v1.jpg" }],
  "season-fall-pumpkin-daylight": [{ version: 1, path: "/themes/season-fall-pumpkin-daylight-v1.jpg" }],
  "season-fall-pumpkin-night": [{ version: 1, path: "/themes/season-fall-pumpkin-night-v1.jpg" }],
  "season-fall-harvest-daylight": [{ version: 1, path: "/themes/season-fall-harvest-daylight-v1.jpg" }],
  "season-fall-harvest-night": [{ version: 1, path: "/themes/season-fall-harvest-night-v1.jpg" }],
  "city-moscow-daylight": [{ version: 1, path: "/themes/city-moscow-daylight-v1.jpg" }],
  "city-moscow-night": [{ version: 1, path: "/themes/city-moscow-night-v1.jpg" }],
  "city-st-petersburg-daylight": [{ version: 1, path: "/themes/city-st-petersburg-daylight-v1.jpg" }],
  "city-st-petersburg-night": [{ version: 1, path: "/themes/city-st-petersburg-night-v1.jpg" }],
  "city-kazan-daylight": [{ version: 1, path: "/themes/city-kazan-daylight-v1.jpg" }],
  "city-kazan-night": [{ version: 1, path: "/themes/city-kazan-night-v1.jpg" }],
  "city-hong-kong-daylight": [
    { version: 1, path: "/themes/city-hong-kong-daylight-v1.png" },
    { version: 2, path: "/themes/city-hong-kong-daylight-v2.png" },
    { version: 3, path: "/themes/city-hong-kong-daylight-v3.jpg" },
  ],
  "city-hong-kong-night": [{ version: 1, path: "/themes/city-hong-kong-night-v1.png" }],
};

export function getLatestThemeWallpaperAsset(
  themeId: string,
  candidates: Record<string, ThemeWallpaperAsset[]> = themeWallpaperAssetCandidates,
): ThemeWallpaperAsset | null {
  return (candidates[themeId] ?? []).reduce<ThemeWallpaperAsset | null>(
    (latest, candidate) => (!latest || candidate.version > latest.version ? candidate : latest),
    null,
  );
}

export const themeWallpaperAssets: Record<string, ThemeWallpaperAsset> = Object.fromEntries(
  Object.keys(themeWallpaperAssetCandidates)
    .map((themeId) => [themeId, getLatestThemeWallpaperAsset(themeId)])
    .filter((entry): entry is [string, ThemeWallpaperAsset] => entry[1] !== null),
);

const wallpaperThemeIds = new Set(Object.keys(themeWallpaperAssets));

const daylightThemeIds = new Set(["fruit-strawberry"]);

export function getThemeWallpaperPath(themeId: string): string | null {
  return wallpaperThemeIds.has(themeId) ? themeWallpaperAssets[themeId].path : null;
}

export function getThemeWallpaperThumbnailPath(themeId: string): string | null {
  const asset = themeWallpaperAssets[themeId];
  if (!asset) {
    return null;
  }

  const thumbPath = asset.path.replace(/^\/themes\//, "/themes/thumbs/");
  const extensionIndex = thumbPath.lastIndexOf(".");
  if (extensionIndex === -1) {
    return `${thumbPath}-thumb.webp`;
  }

  return `${thumbPath.slice(0, extensionIndex)}-thumb.webp`;
}

export function getThemeWallpaperVersion(themeId: string): number | null {
  return themeWallpaperAssets[themeId]?.version ?? null;
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
  if (themeId.endsWith("-daylight") || daylightThemeIds.has(themeId)) {
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
