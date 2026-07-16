import { MockProfileSurfaceView } from "../../components/mock-route-views";
import { ProfileSurfaceView } from "../../components/surface-views";
import { isDemoMode } from "../../lib/textplex";

export default function ProfilePage() {
  return isDemoMode ? <MockProfileSurfaceView /> : <ProfileSurfaceView />;
}
