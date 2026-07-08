import { ReaderView } from "../../../../components/reader-view";

export default function ReaderPage({
  params,
}: {
  params: { bookId: string; pageNumber: string };
}) {
  return <ReaderView bookId={params.bookId} pageNumber={Number(params.pageNumber)} />;
}
