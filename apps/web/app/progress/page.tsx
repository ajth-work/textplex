import { RoutePage } from "../../components/route-page";

export default function ProgressPage() {
  return (
    <RoutePage
      eyebrow="Progress"
      title="Reading and vocabulary progress"
      description="This route will summarize sentence reads, unique exposures, and vocabulary-state counts from the user profile database."
      badge="Planned"
      links={[
        { href: "/study", label: "Study" },
        { href: "/activity", label: "Activity" },
      ]}
      metrics={[
        { label: "Focus", value: "Exposure + fluency" },
        { label: "State", value: "Planned", detail: "Derived from profile activity" },
      ]}
    />
  );
}
