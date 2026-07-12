import { RoutePage } from "../../../components/route-page";
import { DEMO_BOOK_ID } from "../../../lib/demo-data";
import { isDemoMode } from "../../../lib/textplex";

export const dynamic = isDemoMode ? "force-static" : "force-dynamic";
export const revalidate = 0;
export const dynamicParams = !isDemoMode;

export function generateStaticParams(): Array<{ bookId: string }> {
  return isDemoMode ? [{ bookId: DEMO_BOOK_ID }] : [];
}

export default function AnalysisPage({ params }: { params: { bookId: string } }) {
  return (
    <RoutePage
      eyebrow="Analysis"
      title="Text analysis summary"
      description="This route will surface difficulty, vocabulary distribution, and reading recommendations derived from the processed book data."
      badge={params.bookId}
      links={[
        { href: "/library", label: "Library" },
        { href: `/reader/${params.bookId}/1`, label: "Reader" },
      ]}
      metrics={[
        { label: "Book", value: params.bookId, detail: "Live book analysis route" },
        { label: "Status", value: "Planned", detail: "Connect to extraction and lexicon data" },
      ]}
    />
  );
}
