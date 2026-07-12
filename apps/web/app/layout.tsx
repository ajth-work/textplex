import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "../components/app-shell";

export const metadata: Metadata = {
  title: "TextPlex",
  description: "Read scanned books and build a language-learning profile from real reading exposure.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-frame">
          <AppShell />
          <div className="app-shell-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
