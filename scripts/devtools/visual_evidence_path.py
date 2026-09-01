"""Shared safety rules for screenshot and visual-comparison outputs."""

import os
import re
import tempfile
import time
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DIRECTORY_NAME = "cq-talent-visual-evidence"


def assert_visual_evidence_path(path: str | os.PathLike[str]) -> Path:
    """Return a normalized PNG path outside the repo and the Desktop folder."""
    candidate = Path(path).expanduser().resolve()
    try:
        candidate.relative_to(REPOSITORY_ROOT)
    except ValueError:
        pass
    else:
        raise ValueError("visual evidence must not be written inside this repository worktree")

    if any(part.lower() == "desktop" for part in candidate.parts):
        raise ValueError("visual evidence must not be written to the desktop")
    if candidate.suffix.lower() != ".png":
        raise ValueError("visual evidence output must be a PNG")
    return candidate


def visual_evidence_directory() -> Path:
    configured = os.environ.get("CQ_TALENT_VISUAL_EVIDENCE_DIR")
    directory = Path(configured).expanduser() if configured else Path(tempfile.gettempdir()) / DEFAULT_DIRECTORY_NAME
    directory = directory.resolve()
    try:
        directory.relative_to(REPOSITORY_ROOT)
    except ValueError:
        pass
    else:
        raise ValueError("visual evidence must not be written inside this repository worktree")
    if any(part.lower() == "desktop" for part in directory.parts):
        raise ValueError("visual evidence must not be written to the desktop")
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def default_visual_evidence_path(prefix: str) -> Path:
    safe_prefix = re.sub(r"[^\w.-]+", "-", str(prefix or "screenshot"), flags=re.UNICODE).strip("-") or "screenshot"
    return assert_visual_evidence_path(visual_evidence_directory() / f"{safe_prefix}-{int(time.time() * 1000)}.png")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Resolve the isolated visual-evidence directory.")
    parser.add_argument("--print-dir", action="store_true", help="print the validated evidence directory")
    args = parser.parse_args()
    if args.print_dir:
        print(visual_evidence_directory())
