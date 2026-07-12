import { RoutePage } from "../../components/route-page";

export default function SettingsPage() {
  return (
    <RoutePage
      eyebrow="Settings"
      title="Profile and app preferences"
      description="This route will hold display preferences, reading behavior, and future sync/profile controls."
      badge="Planned"
      links={[
        { href: "/library", label: "Library" },
        { href: "/activity", label: "Activity" },
      ]}
      metrics={[
        { label: "Profile", value: "Local first" },
        { label: "State", value: "Planned", detail: "Will consume user preference contracts" },
      ]}
    />
  );
}
