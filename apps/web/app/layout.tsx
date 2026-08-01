import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppFrame } from "../components/app-frame";
import { AppShell } from "../components/app-shell";
import { AuthProvider } from "../components/auth-provider";
import { ThemeProvider } from "../components/theme-provider";

export const metadata: Metadata = {
  title: "TextPlex",
  description: "Read scanned books and build a language-learning profile from real reading exposure.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f5f6f7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
              try {
                  var theme = localStorage.getItem("textplex.theme") || localStorage.getItem("textplex.readerTheme") || "neutral";
                  var patternOpacity = Number(localStorage.getItem("textplex.themePatternOpacity"));
                  var gridEnabled = localStorage.getItem("textplex.themeGridEnabled") !== "off" && localStorage.getItem("textplex.themeGridEnabled") !== "false";
                  if (theme === "day") theme = "neutral";
                  if (theme === "night") theme = "ink";
                  if (theme === "forest") theme = "jade";
                  if (theme === "matrix") theme = "ceramic";
                  var inventoryLabels = localStorage.getItem("textplex.inventoryLabels") === "on" ? "on" : "off";
                  document.documentElement.dataset.appTheme = theme;
                  if (Number.isFinite(patternOpacity)) document.documentElement.style.setProperty("--app-pattern-opacity", String(Math.min(100, Math.max(0, patternOpacity)) / 100));
                  document.documentElement.style.setProperty("--app-grid-opacity", gridEnabled ? "0.9" : "0");
                  document.documentElement.dataset.inventoryLabels = inventoryLabels;
                  document.documentElement.style.colorScheme = (["ink", "black", "jade", "nes", "snes", "super-famicom", "city-moscow-night", "city-st-petersburg-night", "city-kazan-night", "season-fall-maple-night", "season-fall-pumpkin-night", "season-fall-harvest-night"].includes(theme)) ? "dark" : "light";
                  var browserColors = {
                    neutral: "#f5f6f7",
                    sepia: "#f7ead6",
                    ink: "#071019",
                    black: "#020203",
                    jade: "#0a1f16",
                    ceramic: "#faf7f0",
                    crimson: "#7a1219",
                    nes: "#949698",
                    famicom: "#f7eddf",
                    snes: "#484566",
                    "super-famicom": "#263244",
                    "fruit-strawberry": "#f1d9dc",
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
                    "city-moscow-daylight": "#d6e0e4",
                    "city-moscow-night": "#0a1a2d",
                    "city-st-petersburg-daylight": "#e1e6e2",
                    "city-st-petersburg-night": "#10263a",
                    "city-kazan-daylight": "#e5dfd1",
                    "city-kazan-night": "#0c1d31",
                    "season-fall-maple-daylight": "#eee1c2",
                    "season-fall-maple-night": "#191817",
                    "season-fall-pumpkin-daylight": "#f1e5c8",
                    "season-fall-pumpkin-night": "#120f0c",
                    "season-fall-harvest-daylight": "#f3e8cf",
                    "season-fall-harvest-night": "#111923"
                  };
                  var themeColor = document.querySelector('meta[name="theme-color"]');
                  if (themeColor && browserColors[theme]) themeColor.setAttribute("content", browserColors[theme]);
                } catch (error) {}
              })();
            `,
          }}
        />
        <div className="app-frame">
          <AuthProvider>
            <ThemeProvider>
              <Suspense fallback={null}>
                <AppFrame>
                  <AppShell />
                  <div className="app-shell-content">
                    <Suspense fallback={null}>{children}</Suspense>
                  </div>
                </AppFrame>
              </Suspense>
            </ThemeProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
