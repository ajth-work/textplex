from __future__ import annotations

import argparse
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
API_ROOT = ROOT / "apps" / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.services.korean_lexicon_builder import write_korean_lexicon_csv  # noqa: E402


def _default_source_path() -> Path:
    return ROOT / "resources" / "lexicon" / "korean"


def _default_output_path() -> Path:
    return ROOT / "resources" / "lexicon" / "korean" / "lexicon.csv"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the Korean lexicon CSV from an official KRDICT export.")
    parser.add_argument(
        "--source",
        type=Path,
        required=True,
        help="Path to a KRDICT XML, JSON export file, or the folder containing downloaded export chunks.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=_default_output_path(),
        help="Destination CSV path for the TextPlex Korean pack.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional maximum number of headwords to keep after ranking and deduplication.",
    )
    args = parser.parse_args()

    if not args.source.exists():
        parser.error(f"Source export not found: {args.source}")

    rows = write_korean_lexicon_csv(args.source, args.output, max_rows=args.limit)
    print(f"Wrote {len(rows)} Korean lexicon rows to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
