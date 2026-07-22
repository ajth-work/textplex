import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "../components/app-shell";
import { AuthProvider } from "../components/auth-provider";
import { ThemeProvider } from "../components/theme-provider";

export const metadata: Metadata = {
  title: "TextPlex",
  description: "Read scanned books and build a language-learning profile from real reading exposure.",
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
                  if (theme === "day") theme = "neutral";
                  if (theme === "night") theme = "ink";
                  if (theme === "forest") theme = "jade";
                  if (theme === "matrix") theme = "ceramic";
                  document.documentElement.dataset.appTheme = theme;
                  document.documentElement.style.colorScheme = (["ink", "black", "jade", "nes", "snes", "super-famicom"].includes(theme)) ? "dark" : "light";
                } catch (error) {}
              })();
            `,
          }}
        />
        <div className="app-frame">
          <AuthProvider>
            <ThemeProvider>
              <Suspense fallback={null}>
                <AppShell />
              </Suspense>
              <div className="app-shell-content">
                <Suspense fallback={null}>{children}</Suspense>
              </div>
            </ThemeProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
