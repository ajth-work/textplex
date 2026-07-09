import { ReaderView } from "../../../../components/reader-view";
import { DEMO_BOOK_ID, getDemoPageNumbers } from "../../../../lib/demo-data";
import { isDemoMode } from "../../../../lib/textplex";

export const dynamic = isDemoMode ? "force-static" : "force-dynamic";
export const revalidate = 0;
export const dynamicParams = !isDemoMode;

export function generateStaticParams(): Array<{ bookId: string; pageNumber: string }> {
  return isDemoMode
    ? getDemoPageNumbers().map((pageNumber) => ({
        bookId: DEMO_BOOK_ID,
        pageNumber: String(pageNumber),
      }))
    : [];
}

export default function ReaderPage({
  params,
}: {
  params: { bookId: string; pageNumber: string };
}) {
  return <ReaderView bookId={params.bookId} pageNumber={Number(params.pageNumber)} />;
}
