"""Build guide.html from FME1000_Midterm_Master_Study_Guide.md.

Usage: python3 tools/build_guide.py   (requires: pip install markdown)
"""
import html
import json
import re
from pathlib import Path

import markdown

from flashcards import CARDS

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "FME1000_Midterm_Master_Study_Guide.md"
TEMPLATE = Path(__file__).resolve().parent / "guide_template.html"
OUTPUT = ROOT / "guide.html"

AREAS = {"Joint sessions": "joint", "Entrepreneurship study guides": "ent", "Organizational Behavior study guides": "ob"}
AREA_LABELS = {"joint": "Joint", "ent": "Entrepreneurship", "ob": "Organizational Behavior"}


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def render(md_text):
    out = markdown.markdown(md_text, extensions=["tables", "sane_lists"])
    # A paragraph that is only bold text is a subheading in the source.
    out = re.sub(r"<p><strong>([^<]+)</strong></p>", r"<h4>\1</h4>", out)
    out = re.sub(r"<table>", '<div class="table-wrap"><table>', out)
    out = out.replace("</table>", "</table></div>")
    out = out.replace("<blockquote>", '<blockquote class="template">')
    return out


def split(lines, prefix):
    """Split lines into (heading, body_lines) on headings that start with prefix."""
    parts, heading, body = [], None, []
    for line in lines:
        if line.startswith(prefix):
            parts.append((heading, body))
            heading, body = line[len(prefix):].strip(), []
        else:
            body.append(line)
    parts.append((heading, body))
    return parts


def render_session(title, body, area):
    number = int(re.match(r"Session (\d+)", title).group(1))
    name = title.split(":", 1)[1].strip() if ":" in title else re.sub(r"^Session \d+\s*[—-]?\s*", "", title)
    text = "\n".join(body)
    main, _, check = text.partition("**Check yourself**")
    check_html = ""
    if check.strip():
        check_html = f'<aside class="check"><p class="check-label">Check yourself</p>{render(check)}</aside>'
    return (
        f'<article class="session" id="session-{number}" data-area="{area}" data-session="{number}">'
        f'<header class="session-head">'
        f'<div class="session-meta"><span class="num">Session {number}</span><span class="area area-{area}">{AREA_LABELS[area]}</span></div>'
        f'<h3>{html.escape(name)}</h3>'
        f'<label class="studied"><input type="checkbox" id="studied-{number}" data-studied="{number}"> Studied</label>'
        f"</header>{render(main)}{check_html}</article>"
    ), (number, name, area)


def main():
    lines = SOURCE.read_text().splitlines()
    preamble, *parts = split(lines, "## ")
    intro = [l for l in preamble[1] if not l.startswith(("# ", "Fall 2026"))]

    # The rail mirrors page order: loose parts before the first area are "Start here", after it "Review".
    sections, rail, loose, session_count = [], [], [], 0

    def flush_loose(label):
        if loose:
            rail.append(f'<div class="toc-group"><p class="toc-label">{label}</p><ul class="toc">{"".join(loose)}</ul></div>')
            loose.clear()

    for heading, body in parts:
        clean = re.sub(r"^\d+\.\s*", "", heading)
        area = AREAS.get(clean)
        sid = slug(clean)
        if area:
            flush_loose("Start here")
            lead, *sessions = split(body, "### ")
            items, links = [], []
            for title, sbody in sessions:
                block, (number, name, _) = render_session(title, sbody, area)
                items.append(block)
                links.append(f'<li><a href="#session-{number}" data-toc="{number}"><span class="toc-num">{number}</span><span class="toc-name">{html.escape(name)}</span></a></li>')
            session_count += len(links)
            rail.append(
                f'<div class="toc-group" data-area="{area}"><a class="toc-label" href="#{sid}"><span class="dot"></span>{AREA_LABELS[area]}<span class="toc-count">{len(links)}</span></a><ul class="toc">{"".join(links)}</ul></div>'
            )
            sections.append(
                f'<section class="part part-sessions" id="{sid}" data-area="{area}"><h2>{html.escape(clean)}</h2>{render(chr(10).join(lead[1]))}{"".join(items)}</section>'
            )
        else:
            loose.append(f'<li><a href="#{sid}">{html.escape(clean)}</a></li>')
            sections.append(f'<section class="part" id="{sid}"><h2>{html.escape(clean)}</h2>{render(chr(10).join(body))}</section>')
    loose.append('<li><a href="#flashcards">Flashcards</a></li>')
    flush_loose("Review")
    cards = [{"s": s, "t": t, "d": d} for s, t, d in CARDS]

    page = TEMPLATE.read_text()
    page = page.replace("{{INTRO}}", render("\n".join(intro)))
    page = page.replace("{{SECTIONS}}", "\n".join(sections))
    page = page.replace("{{TOC}}", "".join(rail))
    page = page.replace("{{SESSION_COUNT}}", str(session_count))
    page = page.replace("{{CARD_COUNT}}", str(len(cards)))
    page = page.replace("{{CARDS_JSON}}", json.dumps(cards, ensure_ascii=False))
    OUTPUT.write_text(page)
    print(f"Wrote {OUTPUT.name}: {session_count} sessions, {len(cards)} flashcards")


if __name__ == "__main__":
    main()
