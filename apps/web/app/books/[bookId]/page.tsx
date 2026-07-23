import { BookDetailView } from "../../../components/book-detail-view";
import { DEMO_BOOK_ID } from "../../../lib/demo-data";
import { isDemoMode } from "../../../lib/textplex";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

export function generateStaticParams(): Array<{ bookId: string }> {
  return isDemoMode ? [{ bookId: DEMO_BOOK_ID }] : [];
}

export default async function BookDetailPage(props: Promise<{ params: { bookId: string } }> | { params: { bookId: string } }) {
  const { params } = await props;
  const resolvedParams = await params;
  return <BookDetailView bookId={resolvedParams.bookId} />;
}
