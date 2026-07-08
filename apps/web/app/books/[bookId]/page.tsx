import { BookDetailView } from "../../../components/book-detail-view";

export default function BookDetailPage({ params }: { params: { bookId: string } }) {
  return <BookDetailView bookId={params.bookId} />;
}
