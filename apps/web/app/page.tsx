import type { Metadata } from "next";

import { LandingPage } from "../components/landing-page";

export const metadata: Metadata = {
  title: "TextPlex",
  description: "Read real books for free, build language exposure, and add deeper AI practice when you want more.",
};

export default function RootPage() {
  return <LandingPage />;
}
