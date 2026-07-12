import { RoutePage } from "../../components/route-page";

export default function StudyPage() {
  return (
    <RoutePage
      eyebrow="Study"
      title="Review queue and study loop"
      description="This route will become the due-item review surface driven by learner state and exposure history."
      badge="Planned"
      links={[
        { href: "/progress", label: "Progress" },
        { href: "/activity", label: "Activity" },
      ]}
      metrics={[
        { label: "Queue", value: "Due items" },
        { label: "State", value: "Planned", detail: "Needs review scheduling" },
      ]}
    />
  );
}
