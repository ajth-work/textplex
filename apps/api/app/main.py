from fastapi import FastAPI, HTTPException

from app.core.paths import get_data_root
from app.schemas.books import BookImportRequest, BookRecord
from app.services.book_registry import import_book_from_path, load_registry


app = FastAPI(title="TextPlex API", version="0.1.0")
app.state.data_root = get_data_root()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/books/import", response_model=BookRecord)
def import_book(payload: BookImportRequest) -> BookRecord:
    try:
        return import_book_from_path(
            payload.source_path,
            language_code=payload.language_code,
            title=payload.title,
            author=payload.author,
            data_root=app.state.data_root / "books",
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/books/{book_id}", response_model=BookRecord)
def get_book(book_id: str) -> BookRecord:
    registry_path = app.state.data_root / "books" / "registry.json"
    registry = load_registry(registry_path)
    try:
        return registry[book_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}") from exc
