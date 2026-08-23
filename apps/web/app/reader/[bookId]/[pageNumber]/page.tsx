import { ReaderView } from "../../../../components/reader-view";
import { DEMO_BOOK_ID, getDemoPageNumbers } from "../../../../lib/demo-data";
import { isDemoMode } from "../../../../lib/textplex";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

export function generateStaticParams(): Array<{ bookId: string; pageNumber: string }> {
  return isDemoMode
    ? getDemoPageNumbers().map((pageNumber) => ({
        bookId: DEMO_BOOK_ID,
        pageNumber: String(pageNumber),
      }))
    : [];
}

export default async function ReaderPage(
  { params }: { params: Promise<{ bookId: string; pageNumber: string }> },
) {
  const resolvedParams = await params;
  return <ReaderView bookId={resolvedParams.bookId} pageNumber={Number(resolvedParams.pageNumber)} />;
}
