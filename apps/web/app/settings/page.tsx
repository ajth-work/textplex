import { SettingsSurfaceView } from "../../components/surface-views";
import { MockSettingsSurfaceView } from "../../components/mock-route-views";
import { isDemoMode } from "../../lib/textplex";

export default function SettingsPage() {
  return isDemoMode ? <MockSettingsSurfaceView /> : <SettingsSurfaceView />;
}
