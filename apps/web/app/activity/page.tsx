import { RoutePage } from "../../components/route-page";

export default function ActivityPage() {
  return (
    <RoutePage
      eyebrow="Activity"
      title="Reading activity feed"
      description="This route will show reading sessions, page completions, token lookups, and other learner events as a time-ordered feed."
      badge="Planned"
      links={[
        { href: "/progress", label: "Progress" },
        { href: "/study", label: "Study" },
      ]}
      metrics={[
        { label: "Feed", value: "Session events" },
        { label: "State", value: "Planned", detail: "Needs event records" },
      ]}
    />
  );
}
