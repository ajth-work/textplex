import { RoutePage } from "../../components/route-page";

export default function ImportPage() {
  return (
    <RoutePage
      eyebrow="Import"
      title="Paste text or upload a book"
      description="This route will host the import workflow for PDFs, pasted text, and future source types."
      badge="Planned"
      links={[
        { href: "/library", label: "Library" },
        { href: "/progress", label: "Progress" },
      ]}
      metrics={[
        { label: "Inputs", value: "PDF, paste, URL" },
        { label: "State", value: "Planned", detail: "Connect to API import endpoints" },
      ]}
    />
  );
}
