"""Build the local JMdict projection used by TextPlex lookups.

The source XML is intentionally supplied by the caller so the imported snapshot,
version, and checksum are explicit and reproducible.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "apps" / "api"))
sys.path.insert(0, str(REPO_ROOT / "packages" / "processor" / "src"))

from app.core.paths import get_data_root  # noqa: E402
from app.services.jmdict import import_jmdict  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Import a pinned JMdict XML snapshot into TextPlex.")
    parser.add_argument("source_path", type=Path, help="Path to JMdict_e.xml or JMdict_e.gz")
    parser.add_argument("--version", required=True, help="Upstream snapshot date or release identifier")
    parser.add_argument("--data-root", type=Path, default=get_data_root(), help="TextPlex data root")
    parser.add_argument(
        "--source-url",
        default="http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz",
        help="Canonical upstream URL for the pinned source",
    )
    parser.add_argument("--keep-old", action="store_true", help="Keep prior JMdict projection rows")
    args = parser.parse_args()

    summary = import_jmdict(
        args.source_path,
        data_root=args.data_root.resolve(),
        source_version=args.version,
        source_url=args.source_url,
        replace_existing=not args.keep_old,
    )
    print(summary.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
