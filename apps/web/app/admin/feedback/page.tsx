import { AdminOnly } from "../../../components/admin-only";
import { AdminFeedbackView } from "../../../components/admin-feedback-view";

export default function AdminFeedbackPage() {
  return (
    <AdminOnly>
      <AdminFeedbackView />
    </AdminOnly>
  );
}
