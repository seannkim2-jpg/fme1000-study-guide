"""Build knittr-guide.html from FME1000_Knittr_Deep_Study_Guide.md.

Usage: python3 tools/build_knittr_guide.py   (requires: pip install markdown)

Source shape: ## part → ### Session N: name → #### topic → ##### view heading.
"""
import html
import json
import re
from pathlib import Path

from build_guide import render, slug, split
from flashcards import CARDS

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "FME1000_Knittr_Deep_Study_Guide.md"
TEMPLATE = Path(__file__).resolve().parent / "knittr_template.html"
OUTPUT = ROOT / "knittr-guide.html"

AREAS = {"Joint foundation": "joint", "Entrepreneurship: Knittr case": "ent", "Organizational Behavior": "ob"}
AREA_LABELS = {"joint": "Joint", "ent": "Entrepreneurship", "ob": "Organizational Behavior"}
# Each ##### heading belongs to one of the three study views.
VIEWS = {
    "General concept": "learn", "Important distinction": "learn", "Important distinctions": "learn",
    "Knittr application": "apply", "Mini-case application": "apply", "Mini-practice": "apply",
    "Exam move": "practice",
}
VIEW_LABELS = {"learn": "Learn", "apply": "Application", "practice": "Practice"}


def render_topic(sid, title, body):
    tid = f"s{sid}-{slug(title)}"
    lead, *blocks = split(body, "##### ")
    inner = render("\n".join(lead[1])) if "".join(lead[1]).strip() else ""
    for heading, lines in blocks:
        view = VIEWS.get(heading)
        assert view, f"Session {sid} / {title}: unknown view heading '{heading}'"
        inner += f'<div class="view" data-view="{view}"><p class="view-label">{html.escape(heading)}</p>{render(chr(10).join(lines))}</div>'
    return tid, (
        f'<section class="topic" id="{tid}" data-topic="{tid}">'
        f'<header class="topic-head"><h4>{html.escape(title)}</h4>'
        f'<label class="studied"><input type="checkbox" data-studied="{tid}"> Studied</label></header>{inner}</section>'
    )


def render_session(title, body, area):
    number = int(re.match(r"Session (\d+)", title).group(1))
    name = title.split(":", 1)[1].strip()
    lead, *topics = split(body, "#### ")
    assert topics, f"Session {number} has no #### topics"
    rendered = [render_topic(number, t, b) for t, b in topics]
    pairs = [(t, tid) for (t, _), (tid, _) in zip(topics, rendered)]
    topic_map = "".join(f'<li><a href="#{tid}">{html.escape(t)}</a></li>' for t, tid in pairs)
    hub = '<a class="btn hub-link" href="#knittr-case-hub">Knittr case hub</a>' if area in ("ent", "joint") else ""
    views = "".join(
        f'<button class="chip" type="button" data-set-view="{v}" aria-pressed="{str(v == "all").lower()}">{label}</button>'
        for v, label in [("all", "All"), *VIEW_LABELS.items()]
    )
    block = (
        f'<article class="session" id="session-{number}" data-area="{area}" data-session="{number}" data-show="all">'
        f'<header class="session-head">'
        f'<div class="session-meta"><span class="num">Session {number}</span><span class="area area-{area}">{AREA_LABELS[area]}</span><span class="topic-progress" data-progress="{number}"></span></div>'
        f'<h3>{html.escape(name)}</h3></header>'
        f'<div class="overview">{render(chr(10).join(lead[1]))}</div>'
        f'<nav class="topic-map" aria-label="Topics in session {number}"><p class="view-label">Topic map</p><ol>{topic_map}</ol></nav>'
        f'<div class="session-tools"><div class="segmented" role="group" aria-label="Study view for session {number}">{views}</div>{hub}</div>'
        f'{"".join(b for _, b in rendered)}</article>'
    )
    toc_topics = "".join(f'<li><a href="#{tid}" data-toc-topic="{tid}">{html.escape(t)}</a></li>' for t, tid in pairs)
    link = (
        f'<li><a href="#session-{number}" data-toc="{number}"><span class="toc-num">{number}</span><span class="toc-name">{html.escape(name)}</span></a>'
        f'<ul class="toc-topics">{toc_topics}</ul></li>'
    )
    return block, link, len(topics)


def main():
    lines = SOURCE.read_text().splitlines()
    preamble, *parts = split(lines, "## ")
    intro = [l for l in preamble[1] if not l.startswith(("# ", "Fall 2026"))]

    sections, rail, loose, session_count, topic_count = [], [], [], 0, 0
    for heading, body in parts:
        area = AREAS.get(heading)
        sid = slug(heading)
        if not area:
            loose.append(f'<li><a href="#{sid}">{html.escape(heading)}</a></li>')
            sections.append(f'<section class="part" id="{sid}"><h2>{html.escape(heading)}</h2>{render(chr(10).join(body))}</section>')
            continue
        if loose:
            rail.append(f'<div class="toc-group"><p class="toc-label">Start here</p><ul class="toc">{"".join(loose)}</ul></div>')
            loose = []
        lead, *session_parts = split(body, "### ")
        items, links = [], []
        for title, sbody in session_parts:
            block, link, n = render_session(title, sbody, area)
            items.append(block)
            links.append(link)
            topic_count += n
        session_count += len(links)
        rail.append(
            f'<div class="toc-group" data-area="{area}"><a class="toc-label" href="#{sid}"><span class="dot"></span>{AREA_LABELS[area]}<span class="toc-count">{len(links)}</span></a><ul class="toc">{"".join(links)}</ul></div>'
        )
        sections.append(
            f'<section class="part part-sessions" id="{sid}" data-area="{area}"><h2>{html.escape(heading)}</h2>{render(chr(10).join(lead[1]))}{"".join(items)}</section>'
        )
    rail.append('<div class="toc-group"><p class="toc-label">Review</p><ul class="toc"><li><a href="#flashcards">Flashcards</a></li></ul></div>')
    cards = [{"s": s, "t": t, "d": d} for s, t, d in CARDS]

    page = TEMPLATE.read_text()
    for key, value in {
        "{{INTRO}}": render("\n".join(intro)),
        "{{SECTIONS}}": "\n".join(sections),
        "{{TOC}}": "".join(rail),
        "{{SESSION_COUNT}}": str(session_count),
        "{{TOPIC_COUNT}}": str(topic_count),
        "{{CARD_COUNT}}": str(len(cards)),
        "{{CARDS_JSON}}": json.dumps(cards, ensure_ascii=False),
    }.items():
        page = page.replace(key, value)
    # Self-checks: every marker filled, every in-page link lands, all 13 sessions present.
    assert "{{" not in page, "unresolved template marker"
    ids = set(re.findall(r'id="([^"]+)"', page))
    broken = {h for h in re.findall(r'href="#([^"]+)"', page) if h not in ids}
    assert not broken, f"broken internal links: {broken}"
    assert session_count == 13, f"expected 13 sessions, found {session_count}"
    OUTPUT.write_text(page)
    print(f"Wrote {OUTPUT.name}: {session_count} sessions, {topic_count} topics, {len(cards)} flashcards")


if __name__ == "__main__":
    main()
