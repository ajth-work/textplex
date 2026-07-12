import { SearchSurfaceView } from "../../components/surface-views";
import { MockSearchSurfaceView } from "../../components/mock-route-views";
import { isDemoMode } from "../../lib/textplex";

export default function SearchPage() {
  return isDemoMode ? <MockSearchSurfaceView /> : <SearchSurfaceView />;
}
