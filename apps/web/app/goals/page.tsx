import { GoalsSurface } from "../../components/goals-view";
import { isDemoMode } from "../../lib/textplex";

export default function GoalsPage() {
  return <GoalsSurface demo={isDemoMode} />;
}
