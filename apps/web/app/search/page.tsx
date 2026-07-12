import { RoutePage } from "../../components/route-page";

export default function SearchPage() {
  return (
    <RoutePage
      eyebrow="Search"
      title="Search across books and vocabulary"
      description="This route will query processed texts, lexicon entries, and reading history once the shared search contract is wired in."
      badge="Planned"
      links={[
        { href: "/library", label: "Library" },
        { href: "/progress", label: "Progress" },
      ]}
      metrics={[
        { label: "Scope", value: "Books, tokens, and history" },
        { label: "State", value: "Planned", detail: "No live search backend yet" },
      ]}
    />
  );
}
