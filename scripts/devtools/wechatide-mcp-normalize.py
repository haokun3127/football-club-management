#!/usr/bin/env python3
"""Normalize a WeChatIDE raw simulator PNG to the logical 375x812 evidence size."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--width", required=True, type=int)
    parser.add_argument("--height", required=True, type=int)
    args = parser.parse_args()

    source = Path(args.input)
    target = Path(args.output)
    with Image.open(source) as image:
        fitted = ImageOps.fit(
            image.convert("RGBA"),
            (args.width, args.height),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        fitted.save(target, format="PNG", optimize=False)


if __name__ == "__main__":
    main()
