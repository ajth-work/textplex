import type { SettingEntry } from "./textplex";
import { getThemeWallpaperPath, getThemeWallpaperThumbnailPath } from "./theme-catalog";

export type AppTheme =
  | "neutral"
  | "sepia"
  | "ink"
  | "black"
  | "jade"
  | "ceramic"
  | "crimson"
  | "test-wallpaper"
  | "nes"
  | "famicom"
  | "snes"
  | "super-famicom"
  | "fruit-strawberry"
  | "fruit-strawberry-night"
  | "fruit-blueberry"
  | "fruit-citrus"
  | "fruit-mango"
  | "fruit-watermelon"
  | "fruit-grape"
  | "vegetable-avocado"
  | "vegetable-carrot"
  | "vegetable-tomato"
  | "vegetable-corn"
  | "vegetable-cucumber"
  | "vegetable-eggplant"
  | "season-summer-citrus"
  | "season-summer-meadow"
  | "season-summer-seaside"
  | "season-summer-citrus-night"
  | "season-summer-meadow-night"
  | "season-summer-seaside-night"
  | "city-moscow-daylight"
  | "city-moscow-night"
  | "city-st-petersburg-daylight"
  | "city-st-petersburg-night"
  | "city-kazan-daylight"
  | "city-kazan-night"
  | "city-hong-kong-daylight"
  | "city-hong-kong-night"
  | "season-fall-maple-daylight"
  | "season-fall-maple-night"
  | "season-fall-pumpkin-daylight"
  | "season-fall-pumpkin-night"
  | "season-fall-harvest-daylight"
  | "season-fall-harvest-night";

export type ThemeOption = {
  value: AppTheme;
  title: string;
  description: string;
  price: number;
};

export type ThemeBundle = {
  id: string;
  title: string;
  description: string;
  themeValues: AppTheme[];
  bundlePrice: number;
};

export const APP_THEME_STORAGE_KEY = "textplex.theme";
export const APP_THEME_COOKIE_KEY = "textplex.theme";
export const LEGACY_READER_THEME_STORAGE_KEY = "textplex.readerTheme";
export const APP_THEME_PATTERN_OPACITY_STORAGE_KEY = "textplex.themePatternOpacity";
export const DEFAULT_APP_THEME_PATTERN_OPACITY = 42;
export const APP_THEME_PATTERN_TILING_STORAGE_KEY = "textplex.themePatternTiling";
export const DEFAULT_APP_THEME_PATTERN_TILING = false;
export const APP_THEME_GRID_ENABLED_STORAGE_KEY = "textplex.themeGridEnabled";
export const DEFAULT_APP_THEME_GRID_ENABLED = false;
export const APP_THEME_FOLLOW_SYSTEM_STORAGE_KEY = "textplex.themeFollowSystem";
export const APP_THEME_RECENT_STORAGE_KEY = "textplex.themeRecent";
export const APP_THEME_RECENTS_CHANGE_EVENT = "textplex-theme-recents-change";
let themeWallpaperLoadToken = 0;
export const APP_THEME_RECENT_LIMIT = 8;

// Browser chrome accepts one solid color, so use each theme's top-level canvas color.
export const appThemeBrowserColors: Record<AppTheme, string> = {
  neutral: "#f5f6f7",
  sepia: "#f7ead6",
  ink: "#071019",
  black: "#020203",
  jade: "#0a1f16",
  ceramic: "#faf7f0",
  crimson: "#7a1219",
  "test-wallpaper": "#f2e2c4",
  nes: "#949698",
  famicom: "#f7eddf",
  snes: "#484566",
  "super-famicom": "#263244",
  "fruit-strawberry": "#f1d9dc",
  "fruit-strawberry-night": "#1a0d1b",
  "fruit-blueberry": "#d9e7f1",
  "fruit-citrus": "#fff0bc",
  "fruit-mango": "#f8d6ad",
  "fruit-watermelon": "#dcebd4",
  "fruit-grape": "#e5d9eb",
  "vegetable-avocado": "#d9e4c9",
  "vegetable-carrot": "#f0d6b5",
  "vegetable-tomato": "#f0d5d0",
  "vegetable-corn": "#f2e4ad",
  "vegetable-cucumber": "#d7ece4",
  "vegetable-eggplant": "#dfd5e6",
  "season-summer-citrus": "#f8e8bc",
  "season-summer-meadow": "#cfe6f1",
  "season-summer-seaside": "#b8deda",
  "season-summer-citrus-night": "#1b2828",
  "season-summer-meadow-night": "#102438",
  "season-summer-seaside-night": "#0d2338",
  "city-moscow-daylight": "#d6e0e4",
  "city-moscow-night": "#0a1a2d",
  "city-st-petersburg-daylight": "#e1e6e2",
  "city-st-petersburg-night": "#10263a",
  "city-kazan-daylight": "#e5dfd1",
  "city-kazan-night": "#0c1d31",
  "city-hong-kong-daylight": "#d8e6ee",
  "city-hong-kong-night": "#0b1b2a",
  "season-fall-maple-daylight": "#eee1c2",
  "season-fall-maple-night": "#191817",
  "season-fall-pumpkin-daylight": "#f1e5c8",
  "season-fall-pumpkin-night": "#120f0c",
  "season-fall-harvest-daylight": "#f3e8cf",
  "season-fall-harvest-night": "#111923",
};

export const appThemeLabels: Record<AppTheme, string> = {
  neutral: "Neutral",
  sepia: "Warm Sepia",
  ink: "Dark Ink",
  black: "Pitch Black",
  jade: "Jade",
  ceramic: "Ceramic",
  crimson: "Crimson Gold",
  "test-wallpaper": "Test Wallpaper",
  nes: "NES",
  famicom: "Famicom",
  snes: "SNES",
  "super-famicom": "Super Famicom",
  "fruit-strawberry": "Strawberry",
  "fruit-strawberry-night": "Strawberry — Night",
  "fruit-blueberry": "Blueberry",
  "fruit-citrus": "Citrus",
  "fruit-mango": "Mango",
  "fruit-watermelon": "Watermelon",
  "fruit-grape": "Grape",
  "vegetable-avocado": "Avocado",
  "vegetable-carrot": "Carrot",
  "vegetable-tomato": "Tomato",
  "vegetable-corn": "Corn",
  "vegetable-cucumber": "Cucumber",
  "vegetable-eggplant": "Eggplant",
  "season-summer-citrus": "Citrus Grove",
  "season-summer-meadow": "Sunlit Meadow",
  "season-summer-seaside": "Seaside Garden",
  "season-summer-citrus-night": "Citrus Grove — Night",
  "season-summer-meadow-night": "Sunlit Meadow — Night",
  "season-summer-seaside-night": "Seaside Garden — Night",
  "city-moscow-daylight": "Moscow — Daylight",
  "city-moscow-night": "Moscow — Night",
  "city-st-petersburg-daylight": "St. Petersburg — Daylight",
  "city-st-petersburg-night": "St. Petersburg — Night",
  "city-kazan-daylight": "Kazan — Daylight",
  "city-kazan-night": "Kazan — Night",
  "city-hong-kong-daylight": "Hong Kong — Daylight",
  "city-hong-kong-night": "Hong Kong — Night",
  "season-fall-maple-daylight": "Maple Walk — Daylight",
  "season-fall-maple-night": "Maple Walk — Night",
  "season-fall-pumpkin-daylight": "Pumpkin Patch — Daylight",
  "season-fall-pumpkin-night": "Pumpkin Patch — Night",
  "season-fall-harvest-daylight": "Harvest Orchard — Daylight",
  "season-fall-harvest-night": "Harvest Orchard — Night",
};

export const INDIVIDUAL_THEME_PRICE = 1.99;

export const appThemeOptions: ThemeOption[] = [
  {
    value: "neutral",
    title: "Neutral",
    description: "White and cool-grey surfaces with crisp black typography.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "sepia",
    title: "Warm Sepia",
    description: "Parchment cream, tea-brown contrast, and editorial warmth.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "ink",
    title: "Dark Ink",
    description: "Soft charcoal surfaces with warm gold highlights.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "black",
    title: "Pitch Black",
    description: "Near-black canvas with a quiet cool-gold accent.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "jade",
    title: "Jade",
    description: "Deep green surfaces with gold-flecked contrast.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "ceramic",
    title: "Ceramic",
    description: "Cool porcelain tones with slate and mist accents.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "crimson",
    title: "Crimson Gold",
    description: "Lacquer red depth with luminous gold detail.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "test-wallpaper",
    title: "Test Wallpaper",
    description: "Local-only orchard artwork for testing wallpaper opacity and tiling behavior.",
    price: 0,
  },
  {
    value: "nes",
    title: "NES",
    description: "Console gray canvas, black cards, and signal-red actions.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "famicom",
    title: "Famicom",
    description: "Cream plastic, oxblood red, and soft charcoal detail.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "snes",
    title: "SNES",
    description: "Cool lavender, graphite, and playful purple accents.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "super-famicom",
    title: "Super Famicom",
    description: "Charcoal hardware, muted teal, and coral control accents.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "fruit-strawberry",
    title: "Strawberry",
    description: "Pale blush, warm cream, and a restrained berry-red accent.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "fruit-strawberry-night",
    title: "Strawberry — Night",
    description: "Deep berry canvas, dusky blossoms, and warm strawberry highlights for evening reading.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "fruit-blueberry",
    title: "Blueberry",
    description: "Mist blue surfaces with cool white cards and indigo focus.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "fruit-citrus",
    title: "Citrus",
    description: "Lemon cream, warm white cards, and a tangerine-coral accent.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "fruit-mango",
    title: "Mango",
    description: "Golden apricot atmosphere with parchment cards and burnt orange.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "fruit-watermelon",
    title: "Watermelon",
    description: "Pale rind green, cool blush, and a separate coral-pink accent.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "fruit-grape",
    title: "Grape",
    description: "Muted lavender, pale lilac cards, and deep plum detail.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "vegetable-avocado",
    title: "Avocado",
    description: "Soft sage, avocado cream, and forest-green reading surfaces.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "vegetable-carrot",
    title: "Carrot",
    description: "Warm sand, cream cards, and a muted carrot-orange accent.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "vegetable-tomato",
    title: "Tomato",
    description: "Dusty tomato blush, warm ivory cards, and restrained basil support.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "vegetable-corn",
    title: "Corn",
    description: "Butter yellow softened by oat, olive, and warm cream surfaces.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "vegetable-cucumber",
    title: "Cucumber",
    description: "Cool mint, porcelain cards, and a fresh cucumber-green accent.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "vegetable-eggplant",
    title: "Eggplant",
    description: "Aubergine atmosphere, pale lavender cards, and deep plum detail.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-summer-citrus",
    title: "Citrus Grove",
    description: "Warm cream, citrus color, blossom white, and botanical green.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-summer-meadow",
    title: "Sunlit Meadow",
    description: "Pale sky, wildflower color, cream, and soft meadow green.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-summer-seaside",
    title: "Seaside Garden",
    description: "Aqua, sand, coral, sea grass, and deep teal in a coastal garden mood.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-summer-citrus-night",
    title: "Citrus Grove — Night",
    description: "Deep botanical green, citrus amber, and blossom light for a quiet evening orchard mood.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-summer-meadow-night",
    title: "Sunlit Meadow — Night",
    description: "Midnight blue, dusk wildflowers, soft gold, and drifting meadow detail for evening reading.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-summer-seaside-night",
    title: "Seaside Garden — Night",
    description: "Deep ocean blue, moonlit shells, cool botanicals, and restrained star-like light.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "city-moscow-daylight",
    title: "Moscow — Daylight",
    description: "Pale birch, red-brick geometry, and cool river-city light inspired by Moscow.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "city-moscow-night",
    title: "Moscow — Night",
    description: "Deep navy, cool birch branches, and warm architectural light inspired by Moscow after dark.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "city-st-petersburg-daylight",
    title: "St. Petersburg — Daylight",
    description: "Canal water, pale façades, blue flowers, and northern daylight inspired by St. Petersburg.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "city-st-petersburg-night",
    title: "St. Petersburg — Night",
    description: "Deep canal blue, bridge lights, and floral reflections inspired by St. Petersburg after dark.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "city-kazan-daylight",
    title: "Kazan — Daylight",
    description: "Cream stone, terracotta towers, botanical branches, and ornamental detail inspired by Kazan.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "city-kazan-night",
    title: "Kazan — Night",
    description: "Deep blue, illuminated domes, stars, and quiet floral ornament inspired by Kazan after dark.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "city-hong-kong-daylight",
    title: "Hong Kong — Daylight",
    description: "Harbor water, hillside contours, ferries, and vertical city geometry inspired by Hong Kong.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "city-hong-kong-night",
    title: "Hong Kong — Night",
    description: "Deep harbor blue, reflected tower lights, ferries, and hillside city glow inspired by Hong Kong after dark.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-fall-maple-daylight",
    title: "Maple Walk — Daylight",
    description: "Parchment, rust, amber, and olive leaves in an illustrated fall reading atmosphere.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-fall-maple-night",
    title: "Maple Walk — Night",
    description: "Charcoal, ember, and muted leaf tones for a quiet illustrated fall reading atmosphere.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-fall-pumpkin-daylight",
    title: "Pumpkin Patch — Daylight",
    description: "Oat cream, pumpkin orange, sage, and deep brown in an illustrated harvest reading atmosphere.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-fall-pumpkin-night",
    title: "Pumpkin Patch — Night",
    description: "Charcoal, pumpkin ember, muted vine green, and warm lantern light for evening reading.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-fall-harvest-daylight",
    title: "Harvest Orchard — Daylight",
    description: "Warm ivory, cranberry, golden wheat, and orchard green in an illustrated fall reading atmosphere.",
    price: INDIVIDUAL_THEME_PRICE,
  },
  {
    value: "season-fall-harvest-night",
    title: "Harvest Orchard — Night",
    description: "Midnight navy, cranberry fruit, amber leaves, and soft orchard light for evening reading.",
    price: INDIVIDUAL_THEME_PRICE,
  },
];

export const themeBundles: ThemeBundle[] = [
  {
    id: "classic-consoles",
    title: "Classic Consoles",
    description: "Four hardware-inspired reading atmospheres from the NES through the Super Famicom.",
    themeValues: ["nes", "famicom", "snes", "super-famicom"],
    bundlePrice: 6.49,
  },
  {
    id: "fruit-stand",
    title: "Fruit Stand",
    description: "Six bright, fresh market-inspired reading atmospheres with calm editorial surfaces.",
    themeValues: ["fruit-strawberry", "fruit-blueberry", "fruit-citrus", "fruit-mango", "fruit-watermelon", "fruit-grape"],
    bundlePrice: 8.99,
  },
  {
    id: "garden-harvest",
    title: "Garden Harvest",
    description: "Six grounded botanical palettes with muted warmth and comfortable reading contrast.",
    themeValues: ["vegetable-avocado", "vegetable-carrot", "vegetable-tomato", "vegetable-corn", "vegetable-cucumber", "vegetable-eggplant"],
    bundlePrice: 8.99,
  },
  {
    id: "summer-editions",
    title: "Summer Editions",
    description: "Six illustrated summer atmospheres spanning citrus, meadow, and seaside color by day and night.",
    themeValues: ["season-summer-citrus", "season-summer-citrus-night", "season-summer-meadow", "season-summer-meadow-night", "season-summer-seaside", "season-summer-seaside-night"],
    bundlePrice: 8.99,
  },
  {
    id: "fall-editions",
    title: "Fall Editions",
    description: "Six illustrated fall atmospheres spanning maple walks, pumpkin patches, and harvest orchards.",
    themeValues: ["season-fall-maple-daylight", "season-fall-maple-night", "season-fall-pumpkin-daylight", "season-fall-pumpkin-night", "season-fall-harvest-daylight", "season-fall-harvest-night"],
    bundlePrice: 8.99,
  },
];

export function resolveAppTheme(value: string | null | undefined): AppTheme {
  switch (value) {
    case "neutral":
    case "sepia":
    case "ink":
    case "black":
    case "jade":
    case "ceramic":
    case "crimson":
    case "test-wallpaper":
    case "nes":
    case "famicom":
    case "snes":
    case "super-famicom":
    case "fruit-strawberry":
    case "fruit-strawberry-night":
    case "fruit-blueberry":
    case "fruit-citrus":
    case "fruit-mango":
    case "fruit-watermelon":
    case "fruit-grape":
    case "vegetable-avocado":
    case "vegetable-carrot":
    case "vegetable-tomato":
    case "vegetable-corn":
    case "vegetable-cucumber":
    case "vegetable-eggplant":
    case "season-summer-citrus":
    case "season-summer-meadow":
    case "season-summer-seaside":
    case "season-summer-citrus-night":
    case "season-summer-meadow-night":
    case "season-summer-seaside-night":
    case "city-moscow-daylight":
    case "city-moscow-night":
    case "city-st-petersburg-daylight":
    case "city-st-petersburg-night":
    case "city-kazan-daylight":
    case "city-kazan-night":
    case "city-hong-kong-daylight":
    case "city-hong-kong-night":
    case "season-fall-maple-daylight":
    case "season-fall-maple-night":
    case "season-fall-pumpkin-daylight":
    case "season-fall-pumpkin-night":
    case "season-fall-harvest-daylight":
    case "season-fall-harvest-night":
      return value;
    case "day":
      return "neutral";
    case "night":
      return "ink";
    case "forest":
      return "jade";
    case "matrix":
      return "ceramic";
    default:
      return "neutral";
  }
}

const appThemeOpposites: Partial<Record<AppTheme, AppTheme>> = {
  neutral: "ink",
  sepia: "black",
  ink: "neutral",
  black: "sepia",
  jade: "ceramic",
  ceramic: "jade",
  crimson: "ink",
  nes: "famicom",
  famicom: "nes",
  snes: "super-famicom",
  "super-famicom": "snes",
  "fruit-strawberry": "fruit-strawberry-night",
  "fruit-strawberry-night": "fruit-strawberry",
  "season-summer-citrus": "season-summer-citrus-night",
  "season-summer-meadow": "season-summer-meadow-night",
  "season-summer-seaside": "season-summer-seaside-night",
  "season-summer-citrus-night": "season-summer-citrus",
  "season-summer-meadow-night": "season-summer-meadow",
  "season-summer-seaside-night": "season-summer-seaside",
  "city-moscow-daylight": "city-moscow-night",
  "city-moscow-night": "city-moscow-daylight",
  "city-st-petersburg-daylight": "city-st-petersburg-night",
  "city-st-petersburg-night": "city-st-petersburg-daylight",
  "city-kazan-daylight": "city-kazan-night",
  "city-kazan-night": "city-kazan-daylight",
  "city-hong-kong-daylight": "city-hong-kong-night",
  "city-hong-kong-night": "city-hong-kong-daylight",
  "season-fall-maple-daylight": "season-fall-maple-night",
  "season-fall-maple-night": "season-fall-maple-daylight",
  "season-fall-pumpkin-daylight": "season-fall-pumpkin-night",
  "season-fall-pumpkin-night": "season-fall-pumpkin-daylight",
  "season-fall-harvest-daylight": "season-fall-harvest-night",
  "season-fall-harvest-night": "season-fall-harvest-daylight",
};

export function resolveAppThemeOpposite(theme: AppTheme): AppTheme {
  return appThemeOpposites[theme] ?? (isDarkAppTheme(theme) ? "neutral" : "ink");
}

export function resolveAppThemeForScheme(theme: AppTheme, prefersDark: boolean): AppTheme {
  if (prefersDark) {
    if (isDarkAppTheme(theme)) {
      return theme;
    }
    return appThemeOpposites[theme] ?? "ink";
  }

  if (!isDarkAppTheme(theme)) {
    return theme;
  }

  return appThemeOpposites[theme] ?? "neutral";
}

export function resolveAppThemeFromSettings(entries: SettingEntry[] | undefined | null): AppTheme {
  const themeEntry = entries?.find((entry) => entry.key === "theme");
  return resolveAppTheme(themeEntry?.value);
}

export function resolveAppThemeFollowSystemFromSettings(entries: SettingEntry[] | undefined | null): boolean | null {
  const followSystemEntry = entries?.find((entry) => entry.key === "themeFollowSystem");
  if (!followSystemEntry) {
    return null;
  }

  return followSystemEntry.value !== "off" && followSystemEntry.value !== "false";
}

export function clampAppThemePatternOpacity(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function resolveAppThemePatternOpacityFromSettings(entries: SettingEntry[] | undefined | null): number | null {
  const opacityEntry = entries?.find((entry) => entry.key === "themePatternOpacity");
  if (!opacityEntry) {
    return null;
  }

  const opacity = Number(opacityEntry.value);
  return Number.isFinite(opacity) ? clampAppThemePatternOpacity(opacity) : null;
}

export function resolveAppThemePatternTilingFromSettings(entries: SettingEntry[] | undefined | null): boolean | null {
  const tilingEntry = entries?.find((entry) => entry.key === "themePatternTiling");
  if (!tilingEntry) {
    return null;
  }

  return tilingEntry.value !== "off" && tilingEntry.value !== "false";
}

export function resolveAppThemeGridEnabledFromSettings(entries: SettingEntry[] | undefined | null): boolean | null {
  const gridEntry = entries?.find((entry) => entry.key === "themeGridEnabled");
  if (!gridEntry) {
    return null;
  }

  return gridEntry.value !== "off" && gridEntry.value !== "false";
}

export function isDarkAppTheme(theme: AppTheme): boolean {
  return theme === "ink" || theme === "black" || theme === "jade" || theme === "nes" || theme === "snes" || theme === "super-famicom" || theme === "fruit-strawberry-night" || theme === "city-moscow-night" || theme === "city-st-petersburg-night" || theme === "city-kazan-night" || theme === "city-hong-kong-night" || theme === "season-summer-citrus-night" || theme === "season-summer-meadow-night" || theme === "season-summer-seaside-night" || theme === "season-fall-maple-night" || theme === "season-fall-pumpkin-night" || theme === "season-fall-harvest-night";
}

export function readStoredAppTheme(): AppTheme | null {
  if (typeof window === "undefined") {
    return null;
  }

  return resolveAppTheme(
    window.localStorage.getItem(APP_THEME_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_READER_THEME_STORAGE_KEY),
  );
}

export function readStoredAppThemePatternOpacity(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedOpacity = Number(window.localStorage.getItem(APP_THEME_PATTERN_OPACITY_STORAGE_KEY));
  return Number.isFinite(storedOpacity) ? clampAppThemePatternOpacity(storedOpacity) : null;
}

export function readStoredAppThemePatternTiling(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedTiling = window.localStorage.getItem(APP_THEME_PATTERN_TILING_STORAGE_KEY);
  return storedTiling === null ? null : storedTiling !== "off" && storedTiling !== "false";
}

export function readStoredAppThemeGridEnabled(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedGridEnabled = window.localStorage.getItem(APP_THEME_GRID_ENABLED_STORAGE_KEY);
  return storedGridEnabled === null ? null : storedGridEnabled !== "off" && storedGridEnabled !== "false";
}

export function readStoredAppThemeFollowSystem(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedFollowSystem = window.localStorage.getItem(APP_THEME_FOLLOW_SYSTEM_STORAGE_KEY);
  return storedFollowSystem === null ? null : storedFollowSystem !== "off" && storedFollowSystem !== "false";
}

export function readStoredAppThemeRecents(): AppTheme[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(APP_THEME_RECENT_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    const recents: AppTheme[] = [];
    for (const value of parsed) {
      const theme = resolveAppTheme(typeof value === "string" ? value : null);
      if (!recents.includes(theme)) {
        recents.push(theme);
      }
      if (recents.length >= APP_THEME_RECENT_LIMIT) {
        break;
      }
    }
    return recents;
  } catch {
    return [];
  }
}

export function persistAppThemeRecents(theme: AppTheme): AppTheme[] {
  if (typeof window === "undefined") {
    return [];
  }

  const current = readStoredAppThemeRecents();
  const next = [theme, ...current.filter((value) => value !== theme)].slice(0, APP_THEME_RECENT_LIMIT);
  window.localStorage.setItem(APP_THEME_RECENT_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(APP_THEME_RECENTS_CHANGE_EVENT, { detail: { themes: next } }));
  return next;
}

export function persistAppTheme(theme: AppTheme): void {
  if (typeof window === "undefined") {
    return;
  }

  applyAppTheme(theme);
  window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
  window.localStorage.setItem(LEGACY_READER_THEME_STORAGE_KEY, theme);
  document.cookie = `${APP_THEME_COOKIE_KEY}=${encodeURIComponent(theme)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  persistAppThemeRecents(theme);
  window.dispatchEvent(new CustomEvent("textplex-theme-change", { detail: { theme } }));
}

export function persistAppThemePatternOpacity(opacity: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextOpacity = clampAppThemePatternOpacity(opacity);
  applyAppThemePatternOpacity(nextOpacity);
  window.localStorage.setItem(APP_THEME_PATTERN_OPACITY_STORAGE_KEY, String(nextOpacity));
  window.dispatchEvent(new CustomEvent("textplex-theme-pattern-opacity-change", { detail: { opacity: nextOpacity } }));
}

export function persistAppThemePatternTiling(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  applyAppThemePatternTiling(enabled);
  window.localStorage.setItem(APP_THEME_PATTERN_TILING_STORAGE_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent("textplex-theme-pattern-tiling-change", { detail: { enabled } }));
}

export function persistAppThemeGridEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  applyAppThemeGridEnabled(enabled);
  window.localStorage.setItem(APP_THEME_GRID_ENABLED_STORAGE_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent("textplex-theme-grid-change", { detail: { enabled } }));
}

export function persistAppThemeFollowSystem(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(APP_THEME_FOLLOW_SYSTEM_STORAGE_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent("textplex-theme-follow-system-change", { detail: { enabled } }));
}

export function applyAppThemePatternOpacity(opacity: number): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty("--app-pattern-opacity", String(clampAppThemePatternOpacity(opacity) / 100));
}

export function applyAppThemePatternTiling(enabled: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty("--app-pattern-size", enabled ? "420px auto" : "cover");
  document.documentElement.style.setProperty("--app-pattern-repeat", enabled ? "repeat" : "no-repeat");
}

export function applyAppThemePatternImage(theme: AppTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const thumbnailPath = getThemeWallpaperThumbnailPath(theme);
  const fullImagePath = getThemeWallpaperPath(theme);
  const loadToken = ++themeWallpaperLoadToken;
  root.style.setProperty("--app-pattern-image", thumbnailPath ? `url("${thumbnailPath}")` : "none");

  if (!fullImagePath) {
    return;
  }

  const fullImage = new Image();
  fullImage.decoding = "async";
  fullImage.onload = () => {
    if (loadToken !== themeWallpaperLoadToken || root.dataset.appTheme !== theme) {
      return;
    }
    root.style.setProperty("--app-pattern-image", `url("${fullImagePath}")`);
  };
  fullImage.src = fullImagePath;
}

export function applyAppThemeGridEnabled(enabled: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty("--app-grid-opacity", enabled ? "0.9" : "0");
}

export function applyAppTheme(theme: AppTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.appTheme = theme;
  applyAppThemePatternImage(theme);
  const colorScheme = isDarkAppTheme(theme) ? "dark" : "light";
  document.documentElement.style.colorScheme = colorScheme;

  const colorSchemeMeta = document.head.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.content = colorScheme;
  }

  document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((themeColor) => {
    themeColor.content = appThemeBrowserColors[theme];
  });
}
