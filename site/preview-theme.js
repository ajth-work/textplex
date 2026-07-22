(function () {
  const themeOptions = [
    { value: "neutral", title: "Neutral", description: "Bright ivory surfaces with a restrained amber accent.", price: 1.99 },
    { value: "sepia", title: "Warm Sepia", description: "Parchment cream, tea-brown contrast, and editorial warmth.", price: 1.99 },
    { value: "ink", title: "Dark Ink", description: "Soft charcoal surfaces with warm gold highlights.", price: 1.99 },
    { value: "black", title: "Pitch Black", description: "Near-black canvas with a quiet cool-gold accent.", price: 1.99 },
    { value: "jade", title: "Jade", description: "Deep green surfaces with gold-flecked contrast.", price: 1.99 },
    { value: "ceramic", title: "Ceramic", description: "Cool porcelain tones with slate and mist accents.", price: 1.99 },
    { value: "crimson", title: "Crimson Gold", description: "Lacquer red depth with luminous gold detail.", price: 1.99 },
    { value: "nes", title: "NES", description: "Warm cartridge gray, deep navy, and signal red.", price: 1.99 },
    { value: "famicom", title: "Famicom", description: "Cream plastic, oxblood red, and soft charcoal detail.", price: 1.99 },
    { value: "snes", title: "SNES", description: "Cool lavender, graphite, and playful purple accents.", price: 1.99 },
    { value: "super-famicom", title: "Super Famicom", description: "Charcoal hardware, muted teal, and coral control accents.", price: 1.99 },
  ];
  const themeBundles = [
    {
      id: "classic-consoles",
      title: "Classic Consoles",
      description: "Four hardware-inspired reading atmospheres from the NES through the Super Famicom.",
      themeValues: ["nes", "famicom", "snes", "super-famicom"],
      bundlePrice: 6.49,
    },
  ];
  const themeLabels = Object.fromEntries(themeOptions.map((option) => [option.value, option.title]));
  const appThemeKey = "textplex.theme";
  const readerThemeKey = "textplex.readerTheme";

  function normalize(value) {
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
      case "paper":
        return "neutral";
      case "night":
        return "ink";
      case "forest":
      case "mint":
        return "jade";
      case "matrix":
        return "ceramic";
      case "sunset":
        return "crimson";
      default:
        return "neutral";
    }
  }

  function apply(value) {
    const theme = normalize(value);
    document.documentElement.dataset.appTheme = theme;
    document.documentElement.style.colorScheme = ["ink", "black", "jade", "nes", "snes", "super-famicom"].includes(theme) ? "dark" : "light";
    if (document.body) {
      document.body.dataset.appTheme = theme;
    }
    return theme;
  }

  function current() {
    return normalize(window.localStorage.getItem(appThemeKey) || window.localStorage.getItem(readerThemeKey));
  }

  function save(value) {
    const theme = apply(value);
    window.localStorage.setItem(appThemeKey, theme);
    window.localStorage.setItem(readerThemeKey, theme);
    window.dispatchEvent(new CustomEvent("textplex-theme-change", { detail: { theme } }));
    return theme;
  }

  window.TextPlexTheme = { apply, current, normalize, save, labels: themeLabels, options: themeOptions, bundles: themeBundles };
  apply(current());
  window.addEventListener("DOMContentLoaded", () => apply(current()));
  window.addEventListener("storage", (event) => {
    if (event.key === appThemeKey || event.key === readerThemeKey) {
      apply(event.newValue);
    }
  });
})();
