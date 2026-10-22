#!/usr/bin/env python3
"""Check the combined FME1000 slide PDF for known defects. Exits 1 if any check fails.

Usage: python3 slides_check.py [path/to/combined.pdf]
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".context" / "pdfdeps"))

import fitz  # noqa: E402

DEFAULT_PDF = Path.home() / "Desktop" / "FME1000 Session Slides - Combined.pdf"
MAX_MB = 60


def covering_images(page: fitz.Page) -> list[fitz.Rect]:
    """Near-full-page images painted after text, which hide the slide (PowerPoint's empty placeholders)."""
    area = page.rect.width * page.rect.height
    seen_text, hits = False, []
    for kind, bbox in page.get_bboxlog():
        r = fitz.Rect(bbox)
        if "text" in kind:
            seen_text = True
        elif kind == "fill-image" and seen_text and r.width * r.height >= 0.9 * area:
            hits.append(r)
    return hits


def hidden_text(page: fitz.Page, pix: fitz.Pixmap, zoom: float) -> bool:
    """True when most text spans render with almost no contrast, meaning something is drawn over them."""
    spans = [s for b in page.get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"]
             if s["text"].strip()]
    if len(spans) < 3:
        return False
    flat = 0
    for s in spans:
        r = (fitz.Rect(s["bbox"]) * zoom) & fitz.Rect(0, 0, pix.width, pix.height)
        lum = [sum(pix.pixel(x, y)[:3]) for x in range(int(r.x0), int(r.x1)) for y in range(int(r.y0), int(r.y1))]
        flat += not lum or max(lum) - min(lum) < 40  # visible text has hundreds of levels of contrast
    return flat / len(spans) >= 0.8


def run_checks(path: Path) -> list[str]:
    doc = fitz.open(path)
    errors: list[str] = []
    zoom = 0.4

    sizes = {(round(p.rect.width), round(p.rect.height)) for p in doc}
    if len(sizes) != 1:
        errors.append(f"mixed page sizes: {sorted(sizes)}")

    prev = None
    for p in doc:
        n = p.number + 1
        pix = p.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        digest = hashlib.md5(pix.samples).hexdigest()
        if digest == prev:
            errors.append(f"p{n}: exact duplicate of p{n - 1}")
        prev = digest
        if len(set(pix.samples[::997])) <= 1:
            errors.append(f"p{n}: blank page")
        if hidden_text(p, pix, zoom):
            errors.append(f"p{n}: slide text is hidden under something drawn on top")

    toc = doc.get_toc()
    sessions = [(i, t) for i, t in enumerate(toc) if t[0] == 1]
    for k, (i, (_, title, start)) in enumerate(sessions):
        end = sessions[k + 1][1][2] - 1 if k + 1 < len(sessions) else len(doc)
        first = " ".join(doc[pg - 1].get_text() for pg in range(start, min(start + 3, end + 1)))
        m = re.search(r"Session\s+(\d+)", first)
        b = re.match(r"Session (\d+) - ", title)
        if not b:
            errors.append(f"bookmark '{title}' is not in 'Session N - Topic' form")
        elif m and m.group(1) != b.group(1):
            errors.append(f"bookmark '{title}' but its title slide says Session {m.group(1)}")
        children = {t[2] for t in toc[i + 1:] if t[0] == 2 and start <= t[2] <= end}
        missing = set(range(start, end + 1)) - children
        if missing:
            errors.append(f"'{title}': {len(missing)} slides have no bookmark")

    mb = path.stat().st_size / 1e6
    if mb > MAX_MB:
        errors.append(f"file is {mb:.0f} MB (limit {MAX_MB} MB)")
    return errors


if __name__ == "__main__":
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    errs = run_checks(pdf)
    for e in errs:
        print("FAIL", e)
    print(f"{len(errs)} problem(s) in {pdf.name}" if errs else f"PASS {pdf.name}")
    sys.exit(1 if errs else 0)
