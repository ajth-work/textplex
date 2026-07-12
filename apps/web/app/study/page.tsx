import { StudySurfaceView } from "../../components/surface-views";
import { MockStudySurfaceView } from "../../components/mock-route-views";
import { isDemoMode } from "../../lib/textplex";

export default function StudyPage() {
  return isDemoMode ? <MockStudySurfaceView /> : <StudySurfaceView />;
}
