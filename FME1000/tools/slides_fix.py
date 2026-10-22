#!/usr/bin/env python3
"""Repair the combined FME1000 slide PDF, then run slides_check.py on the result.

Fixes: mixed page sizes, slides hidden under PowerPoint's empty picture placeholders,
back-to-back duplicate slides, wrong/missing bookmarks, and the 144 MB file size.

Usage: python3 slides_fix.py [input.pdf] [output.pdf]   (defaults: Desktop copy, in place)
"""

from __future__ import annotations

import hashlib
import io
import re
import shutil
import sys
from pathlib import Path

from slides_check import DEFAULT_PDF, covering_images, fitz, hidden_text, run_checks

from PIL import Image, ImageChops, ImageStat  # noqa: E402  (bundled in .context/pdfdeps)
from pypdf import PdfWriter  # noqa: E402

BACKUP_DIR = Path.home() / "Documents" / "FME1000" / "_backup"


def uniform_size(src: Path) -> bytes:
    """Scale every page to page 1's size; all decks are 16:9 so nothing is distorted."""
    w = PdfWriter(clone_from=src)
    width, height = w.pages[0].mediabox.width, w.pages[0].mediabox.height
    for page in w.pages:
        if (page.mediabox.width, page.mediabox.height) != (width, height):
            page.scale_to(width, height)
    buf = io.BytesIO()
    w.write(buf)
    return buf.getvalue()


def remove_covers(doc: fitz.Document) -> list[int]:
    """Stop drawing full-page images that sit on top of a slide's text (this page only)."""
    fixed = []
    for page in doc:
        covers = covering_images(page)
        zoom = 0.4
        if not covers or not hidden_text(page, page.get_pixmap(matrix=fitz.Matrix(zoom, zoom)), zoom):
            continue  # full-page photos with a caption on top are real content
        page.clean_contents()
        xref = page.get_contents()[0]
        stream = doc.xref_stream(xref)
        for item in page.get_images(full=True):
            box = page.get_image_bbox(item)
            if any(max(abs(a - b) for a, b in zip(box, c)) < 1 for c in covers):
                stream = re.sub(rb"/" + re.escape(item[7].encode()) + rb"\s+Do\b", b"", stream)
        doc.update_stream(xref, stream)
        fixed.append(page.number + 1)
    return fixed


def drop_duplicates(doc: fitz.Document, toc: list) -> list[int]:
    """Delete pages identical to the page before them, shifting bookmarks to match."""
    digests = [hashlib.md5(p.get_pixmap(matrix=fitz.Matrix(0.4, 0.4)).samples).hexdigest() for p in doc]
    dupes = [i for i in range(1, len(digests)) if digests[i] == digests[i - 1]]
    for i in reversed(dupes):
        doc.delete_page(i)
        toc[:] = [[lvl, t, pg - (pg > i + 1)] for lvl, t, pg in toc if not (lvl == 2 and pg == i + 1)]
    return [i + 1 for i in dupes]


def slide_title(page: fitz.Page) -> str:
    """Biggest-font line on the slide, which is its heading."""
    best = (0.0, "")
    for b in page.get_text("dict")["blocks"]:
        for line in b.get("lines", []):
            text = " ".join(s["text"] for s in line["spans"]).strip()
            size = max((s["size"] for s in line["spans"]), default=0)
            if text and not text.isdigit() and size > best[0]:
                best = (size, text)
    return re.sub(r"\s+", " ", best[1])[:80]


def fix_bookmarks(doc: fitz.Document, toc: list) -> list:
    """Name each session after its title slide and give every slide a bookmark."""
    out, sessions = [], [t for t in toc if t[0] == 1]
    for k, (_, title, start) in enumerate(sessions):
        end = sessions[k + 1][2] - 1 if k + 1 < len(sessions) else len(doc)
        first = " ".join(doc[pg - 1].get_text() for pg in range(start, min(start + 3, end + 1)))
        m = re.search(r"Session\s+(\d+)", first)
        topic = re.sub(r"^Session \d+( file)? - ", "", title)
        num = m.group(1) if m else re.search(r"\d+", title).group()
        out.append([1, f"Session {num} - {topic}", start])
        kids = [t for t in toc if t[0] == 2 and start <= t[2] <= end]
        have = {t[2] for t in kids}
        for pg in range(start, end + 1):
            if pg not in have:
                heading = slide_title(doc[pg - 1])
                kids.append([2, f"Slide {pg - start + 1}" + (f": {heading}" if heading else ""), pg])
        out += sorted(kids, key=lambda t: t[2])
    return out


def shrink_images(doc: fitz.Document) -> None:
    """Downsample oversized images, but keep inverted-CMYK JPEGs as-is: MuPDF drops their
    /Decode array when rewriting, which turns the persona slide's photo into noise."""
    keep = {}
    for page in doc:
        for item in page.get_images(full=True):
            if doc.xref_get_key(item[0], "Decode")[0] != "null":
                keep[(page.number, tuple(page.get_image_bbox(item)))] = (doc.xref_object(item[0]),
                                                                       doc.xref_stream_raw(item[0]))
    doc.rewrite_images(dpi_threshold=220, dpi_target=150, quality=80)
    for (pno, bbox), (obj, raw) in keep.items():
        filt = re.search(r"/Filter\s*(/\w+|\[[^\]]*\])", obj).group(1)
        # rewriting renames and renumbers images, so find the new one by position
        xref = next(i["xref"] for i in doc[pno].get_image_info(xrefs=True) if tuple(i["bbox"]) == bbox)
        doc.update_object(xref, obj)
        doc.update_stream(xref, raw, compress=False)
        doc.xref_set_key(xref, "Filter", filt)  # update_stream drops the filter of raw data


def unintended_changes(original: Path, fixed: Path, uncovered: list[int], removed: list[int]) -> list[str]:
    """Original pages whose text changed or that now look different, apart from the ones we meant to fix."""
    def thumb(page: fitz.Page) -> Image.Image:
        z = 240 / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(z, z))
        return Image.frombytes("RGB", (pix.width, pix.height), pix.samples).resize((240, 135))

    o, f = fitz.open(original), fitz.open(fixed)
    kept = [n for n in range(1, len(o) + 1) if n not in removed]
    if len(kept) != len(f):
        return [f"page count {len(f)}, expected {len(kept)}"]
    problems = []
    for new, n in enumerate(kept):
        if o[n - 1].get_text().split() != f[new].get_text().split():
            problems.append(f"p{n} text changed")
        elif n not in uncovered:
            diff = sum(ImageStat.Stat(ImageChops.difference(thumb(o[n - 1]), thumb(f[new]))).mean) / 3
            if diff > 20:  # scaling and image downsampling stay under ~10
                problems.append(f"p{n} looks different ({diff:.0f})")
    return problems


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else src
    if dst == src:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        backup = BACKUP_DIR / src.name
        if not backup.exists():  # keep the first, untouched original
            shutil.copy2(src, backup)
        print(f"backup: {backup}")

    doc = fitz.open("pdf", uniform_size(src))
    toc = doc.get_toc(simple=True)
    fixed, dupes = remove_covers(doc), drop_duplicates(doc, toc)
    print("uncovered slides on pages:", fixed)
    print("removed duplicate pages:", dupes)
    doc.set_toc(fix_bookmarks(doc, toc))
    shrink_images(doc)

    tmp = dst.with_suffix(".tmp.pdf")
    # garbage>=2 merges same-named font subsets from different decks and garbles text
    doc.save(tmp, garbage=1, deflate=True)
    doc.close()
    damaged = unintended_changes(src, tmp, fixed, dupes)
    if damaged:
        tmp.unlink()
        print("ABORT, output left untouched; unexpected changes:", damaged)
        return 1
    tmp.replace(dst)
    print(f"wrote {dst} ({dst.stat().st_size / 1e6:.0f} MB)")

    errors = run_checks(dst)
    for e in errors:
        print("FAIL", e)
    print("PASS all checks" if not errors else f"{len(errors)} problem(s) remain")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
