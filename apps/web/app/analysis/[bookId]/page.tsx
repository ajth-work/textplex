import { AnalysisSurfaceView } from "../../../components/surface-views";
import { MockAnalysisSurfaceView } from "../../../components/mock-route-views";
import { DEMO_BOOK_ID } from "../../../lib/demo-data";
import { isDemoMode } from "../../../lib/textplex";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

export function generateStaticParams(): Array<{ bookId: string }> {
  return isDemoMode ? [{ bookId: DEMO_BOOK_ID }] : [];
}

export default async function AnalysisPage(props: Promise<{ params: { bookId: string } }> | { params: { bookId: string } }) {
  const { params } = await props;
  const resolvedParams = await params;
  return isDemoMode ? (
    <MockAnalysisSurfaceView bookId={resolvedParams.bookId} />
  ) : (
    <AnalysisSurfaceView bookId={resolvedParams.bookId} />
  );
}
