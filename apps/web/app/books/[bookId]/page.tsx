import { BookDetailView } from "../../../components/book-detail-view";
import { DEMO_BOOK_ID } from "../../../lib/demo-data";
import { isDemoMode } from "../../../lib/textplex";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

export function generateStaticParams(): Array<{ bookId: string }> {
  return isDemoMode ? [{ bookId: DEMO_BOOK_ID }] : [];
}

export default function BookDetailPage({ params }: { params: { bookId: string } }) {
  return <BookDetailView bookId={params.bookId} />;
}
