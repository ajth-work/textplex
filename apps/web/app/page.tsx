import type { Metadata } from "next";

import { LandingPage } from "../components/landing-page";

export const metadata: Metadata = {
  title: "TextPlex",
  description: "Read real books, build language exposure, and support the project with one-time theme packs.",
};

export default function RootPage() {
  return <LandingPage />;
}
