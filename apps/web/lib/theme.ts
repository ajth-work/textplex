import type { SettingEntry } from "./textplex";

export type AppTheme =
  | "neutral"
  | "sepia"
  | "ink"
  | "black"
  | "jade"
  | "ceramic"
  | "crimson"
  | "nes"
  | "famicom"
  | "snes"
  | "super-famicom";

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
export const LEGACY_READER_THEME_STORAGE_KEY = "textplex.readerTheme";

export const appThemeLabels: Record<AppTheme, string> = {
  neutral: "Neutral",
  sepia: "Warm Sepia",
  ink: "Dark Ink",
  black: "Pitch Black",
  jade: "Jade",
  ceramic: "Ceramic",
  crimson: "Crimson Gold",
  nes: "NES",
  famicom: "Famicom",
  snes: "SNES",
  "super-famicom": "Super Famicom",
};

export const INDIVIDUAL_THEME_PRICE = 1.99;

export const appThemeOptions: ThemeOption[] = [
  {
    value: "neutral",
    title: "Neutral",
    description: "Bright ivory surfaces with a restrained amber accent.",
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
    value: "nes",
    title: "NES",
    description: "Warm cartridge gray, deep navy, and signal red.",
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
];

export const themeBundles: ThemeBundle[] = [
  {
    id: "classic-consoles",
    title: "Classic Consoles",
    description: "Four hardware-inspired reading atmospheres from the NES through the Super Famicom.",
    themeValues: ["nes", "famicom", "snes", "super-famicom"],
    bundlePrice: 6.49,
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
    case "nes":
    case "famicom":
    case "snes":
    case "super-famicom":
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

export function resolveAppThemeFromSettings(entries: SettingEntry[] | undefined | null): AppTheme {
  const themeEntry = entries?.find((entry) => entry.key === "theme");
  return resolveAppTheme(themeEntry?.value);
}

export function isDarkAppTheme(theme: AppTheme): boolean {
  return theme === "ink" || theme === "black" || theme === "jade" || theme === "crimson" || theme === "nes" || theme === "snes" || theme === "super-famicom";
}

export function readStoredAppTheme(): AppTheme | null {
  if (typeof window === "undefined") {
    return null;
  }

  return resolveAppTheme(
    window.localStorage.getItem(APP_THEME_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_READER_THEME_STORAGE_KEY),
  );
}

export function persistAppTheme(theme: AppTheme): void {
  if (typeof window === "undefined") {
    return;
  }

  applyAppTheme(theme);
  window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
  window.localStorage.setItem(LEGACY_READER_THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent("textplex-theme-change", { detail: { theme } }));
}

export function applyAppTheme(theme: AppTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.appTheme = theme;
  document.documentElement.style.colorScheme = isDarkAppTheme(theme) ? "dark" : "light";
}
