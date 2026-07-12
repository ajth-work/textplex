import { ActivitySurfaceView } from "../../components/surface-views";
import { MockActivitySurfaceView } from "../../components/mock-route-views";
import { isDemoMode } from "../../lib/textplex";

export default function ActivityPage() {
  return isDemoMode ? <MockActivitySurfaceView /> : <ActivitySurfaceView />;
}
