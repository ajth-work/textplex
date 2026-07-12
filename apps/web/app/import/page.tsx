import { ImportSurfaceView } from "../../components/surface-views";
import { MockImportSurfaceView } from "../../components/mock-route-views";
import { isDemoMode } from "../../lib/textplex";

export default function ImportPage() {
  return isDemoMode ? <MockImportSurfaceView /> : <ImportSurfaceView />;
}
