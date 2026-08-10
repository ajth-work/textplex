import { AdminOnly } from "../../../components/admin-only";
import { AdminThemeConsole } from "../../../components/admin-theme-console";

export default function AdminThemesPage() {
  return (
    <AdminOnly>
      <AdminThemeConsole />
    </AdminOnly>
  );
}
