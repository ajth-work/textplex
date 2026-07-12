import { ProgressSurfaceView } from "../../components/surface-views";
import { MockProgressSurfaceView } from "../../components/mock-route-views";
import { isDemoMode } from "../../lib/textplex";

export default function ProgressPage() {
  return isDemoMode ? <MockProgressSurfaceView /> : <ProgressSurfaceView />;
}
