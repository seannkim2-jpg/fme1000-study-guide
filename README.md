# FME 1000 Midterm Study Guide

A standalone study site for the FME 1000 midterm. It covers all 13 sessions on the midterm subject list.

## Pages

- `index.html` — practice lab: 60 shuffled concept questions (4–6 per session), a written C-E-A-R case coach with 14 cases and model answers, and a timed 90-minute mock exam
- `guide.html` — the full study guide by session, with filters, search, "studied" tracking, copyable answer templates, the Knittr cross-reference, rapid recall, the final self-test, and 61 flashcards
- `knittr-guide.html` — the deep guide: every session broken into specific topics, each with Learn, Application, and Practice views; every entrepreneurship topic applied to the Knittr case; a Knittr case hub; per-topic studied tracking kept separate from `guide.html`
- `site.css` — shared colors, top bar, buttons, and motion for both pages
- `FME1000_Midterm_Master_Study_Guide.pdf` — printable guide
- `FME1000_Midterm_Master_Study_Guide.md` — editable guide source

Both pages follow the system light or dark theme and work at phone width. Progress, drafts, and known flashcards are stored in the browser's local storage only.

## Editing the guide

`guide.html` is generated from the Markdown source. After editing the `.md` file or the flashcards in `tools/flashcards.py`, rebuild it:

```bash
pip install markdown
python3 tools/build_guide.py
```

`knittr-guide.html` is generated the same way from `FME1000_Knittr_Deep_Study_Guide.md` (headings: `##` part, `###` session, `####` topic, `#####` General concept / Knittr application / Exam move):

```bash
python3 tools/build_knittr_guide.py
```

## Local preview

The site has no build step for deployment and no external dependencies. Open `index.html` directly or serve the directory:

```bash
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000`.

## Checking every component

`tools/check_site.mjs` clicks through all three pages in headless Chrome (outline links, filters, search, studied tracking, flashcards, the full concept check, the case coach, and the mock exam) at desktop and phone widths, and saves screenshots. It needs Node 22+ and Google Chrome, and no npm packages:

```bash
node tools/check_site.mjs --shots /tmp/fme-shots
```

## Deploying

Any static host works. With Vercel, import the repository with the "Other" framework preset and no build command, or run `vercel --prod` from the repo root.
