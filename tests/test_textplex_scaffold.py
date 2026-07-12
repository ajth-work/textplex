from pathlib import Path


def test_textplex_shared_contract_and_route_scaffold_exists() -> None:
    root = Path(__file__).resolve().parents[1]

    expected_paths = [
        root / "packages" / "shared" / "src" / "contracts.ts",
        root / "packages" / "shared" / "src" / "index.ts",
        root / "packages" / "shared" / "package.json",
        root / "apps" / "web" / "components" / "route-page.tsx",
        root / "apps" / "web" / "app" / "analysis" / "[bookId]" / "page.tsx",
        root / "apps" / "web" / "app" / "search" / "page.tsx",
        root / "apps" / "web" / "app" / "study" / "page.tsx",
        root / "apps" / "web" / "app" / "progress" / "page.tsx",
        root / "apps" / "web" / "app" / "activity" / "page.tsx",
        root / "apps" / "web" / "app" / "import" / "page.tsx",
        root / "apps" / "web" / "app" / "settings" / "page.tsx",
    ]

    for path in expected_paths:
        assert path.exists(), f"Expected scaffold path missing: {path}"


def test_textplex_web_library_uses_shared_contracts() -> None:
    root = Path(__file__).resolve().parents[1]
    text = (root / "apps" / "web" / "lib" / "textplex.ts").read_text(encoding="utf-8")

    assert "../../../packages/shared/src" in text
    assert "BookExtractionTriggerRequest" in text
    assert "LearningProfileSummary" in text
