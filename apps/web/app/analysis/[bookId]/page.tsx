import { AnalysisSurfaceView } from "../../../components/surface-views";
import { DEMO_BOOK_ID } from "../../../lib/demo-data";
import { isDemoMode } from "../../../lib/textplex";

export const dynamic = isDemoMode ? "force-static" : "force-dynamic";
export const revalidate = 0;
export const dynamicParams = !isDemoMode;

export function generateStaticParams(): Array<{ bookId: string }> {
  return isDemoMode ? [{ bookId: DEMO_BOOK_ID }] : [];
}

export default function AnalysisPage({ params }: { params: { bookId: string } }) {
  return <AnalysisSurfaceView bookId={params.bookId} />;
}
