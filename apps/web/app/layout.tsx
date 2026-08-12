import { cookies } from "next/headers";
import type { Metadata, Viewport } from "next";
import type { User } from "@supabase/supabase-js";
import { Suspense, type CSSProperties } from "react";
import "./globals.css";
import { AppFrame } from "../components/app-frame";
import { AppShell } from "../components/app-shell";
import { BuildFooter } from "../components/build-footer";
import { AccountFooter } from "../components/account-footer";
import { AuthProvider } from "../components/auth-provider";
import { AUTH_SESSION_COOKIE_KEY, parseAuthSessionCookie } from "../lib/auth-session";
import { appVersion } from "../lib/build-info";
import { ThemeProvider } from "../components/theme-provider";
import { FeedbackWidget } from "../components/feedback-widget";
import { ImportProgressProvider } from "../components/import-progress-provider";
import { APP_THEME_COOKIE_KEY, appThemeBrowserColors, isDarkAppTheme, resolveAppTheme } from "../lib/theme";
import { getThemeWallpaperThumbnailPath } from "../lib/theme-catalog";

const appRebootedAt = new Date().toISOString();

export const metadata: Metadata = {
  title: "TextPlex",
  description: "Read scanned books and build a language-learning profile from real reading exposure.",
};

export async function generateViewport(): Promise<Viewport> {
  const storedTheme = (await cookies()).get(APP_THEME_COOKIE_KEY)?.value;
  const theme = resolveAppTheme(storedTheme);

  return {
    colorScheme: isDarkAppTheme(theme) ? "dark" : "light",
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const storedTheme = cookieStore.get(APP_THEME_COOKIE_KEY)?.value;
  const storedAuthSession = parseAuthSessionCookie(cookieStore.get(AUTH_SESSION_COOKIE_KEY)?.value);
  const requestTheme = resolveAppTheme(storedTheme);
  const requestThemeColor = appThemeBrowserColors[requestTheme];
  const requestThemePatternImage = getThemeWallpaperThumbnailPath(requestTheme);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={
        (
          requestThemePatternImage
            ? { "--app-pattern-image": `url("${requestThemePatternImage}")` }
            : { "--app-pattern-image": "none" }
        ) as CSSProperties
      }
    >
      <head>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={requestThemeColor} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={requestThemeColor} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
              try {
                  var theme = localStorage.getItem("textplex.theme") || localStorage.getItem("textplex.readerTheme") || "neutral";
                  var followSystem = localStorage.getItem("textplex.themeFollowSystem") === "on";
                  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
                  var patternOpacity = Number(localStorage.getItem("textplex.themePatternOpacity"));
                  var patternTiling = localStorage.getItem("textplex.themePatternTiling") === "on";
                  var gridEnabled = localStorage.getItem("textplex.themeGridEnabled") === "on";
                  if (theme === "day") theme = "neutral";
                  if (theme === "night") theme = "ink";
                  if (theme === "forest") theme = "jade";
                  if (theme === "matrix") theme = "ceramic";
                  if (followSystem) theme = prefersDark ? "ink" : "neutral";
                  document.cookie = "textplex.theme=" + encodeURIComponent(theme) + "; Max-Age=31536000; Path=/; SameSite=Lax";
                  var inventoryLabels = localStorage.getItem("textplex.inventoryLabels") === "on" ? "on" : "off";
                  document.documentElement.dataset.appTheme = theme;
                  if (Number.isFinite(patternOpacity)) document.documentElement.style.setProperty("--app-pattern-opacity", String(Math.min(100, Math.max(0, patternOpacity)) / 100));
                  document.documentElement.style.setProperty("--app-pattern-size", patternTiling ? "420px auto" : "cover");
                  document.documentElement.style.setProperty("--app-pattern-repeat", patternTiling ? "repeat" : "no-repeat");
                  document.documentElement.style.setProperty("--app-grid-opacity", gridEnabled ? "0.9" : "0");
                  document.documentElement.dataset.inventoryLabels = inventoryLabels;
                  var isDarkTheme = ["ink", "black", "jade", "nes", "snes", "super-famicom", "fruit-strawberry-night", "city-moscow-night", "city-st-petersburg-night", "city-kazan-night", "city-hong-kong-night", "season-summer-citrus-night", "season-summer-meadow-night", "season-summer-seaside-night", "season-fall-maple-night", "season-fall-pumpkin-night", "season-fall-harvest-night"].includes(theme);
                  document.documentElement.style.colorScheme = isDarkTheme ? "dark" : "light";
                  var colorScheme = document.querySelector('meta[name="color-scheme"]');
                  if (colorScheme) colorScheme.setAttribute("content", isDarkTheme ? "dark" : "light");
                  var browserColors = {
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
                    "season-fall-harvest-night": "#111923"
                  };
                  var themeColor = browserColors[theme];
                  document.querySelectorAll('meta[name="theme-color"]').forEach(function (entry) {
                    if (themeColor) entry.setAttribute("content", themeColor);
                  });
                } catch (error) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="app-frame">
          <AuthProvider initialUser={storedAuthSession ? (storedAuthSession.user as unknown as User) : null}>
            <ThemeProvider>
              <Suspense fallback={null}>
                <ImportProgressProvider>
                  <AppFrame>
                    <AppShell />
                    <div className="app-shell-content">
                      <Suspense fallback={null}>{children}</Suspense>
                      <FeedbackWidget />
                      <AccountFooter />
                      <BuildFooter rebootedAt={appRebootedAt} version={appVersion} />
                    </div>
                  </AppFrame>
                </ImportProgressProvider>
              </Suspense>
            </ThemeProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
