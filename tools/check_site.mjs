// Clicks through every component of index.html and guide.html in headless Chrome and reports PASS/FAIL.
// Usage: node tools/check_site.mjs [--shots DIR]
// Needs Node 22+ (built-in WebSocket) and Google Chrome (set CHROME=/path if not in /Applications). No npm packages.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, extname, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.argv.includes('--shots') ? resolve(process.argv[process.argv.indexOf('--shots') + 1]) : null;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`); };

// Static server for the repo root.
const TYPES = { '.html': 'text/html', '.pdf': 'application/pdf', '.md': 'text/markdown', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const path = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try { const body = await readFile(path.endsWith('/') ? join(path, 'index.html') : path); res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// Chrome over the DevTools protocol.
const profile = await mkdtemp(join(tmpdir(), 'fme-check-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', 'about:blank'], { stdio: 'ignore' });
let port;
for (let i = 0; i < 100 && !port; i++) { await sleep(100); try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch {} }
if (!port) throw new Error('Chrome did not start; set CHROME to its path');

class Page {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map(); this.errors = [];
    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.id) { const p = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); return; }
      if (msg.method === 'Runtime.exceptionThrown') this.errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') this.errors.push(msg.params.args.map(a => a.value ?? a.description).join(' '));
      if (msg.method === 'Page.javascriptDialogOpening') this.send('Page.handleJavaScriptDialog', { accept: true });
      if (msg.method === 'Page.loadEventFired') this.onLoad?.();
    };
  }
  static async open() {
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    const page = new Page(ws);
    await page.send('Page.enable'); await page.send('Runtime.enable');
    return page;
  }
  send(method, params = {}) { const id = ++this.seq; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async size(width, height, mobile = false) { await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }); }
  async goto(path) { const loaded = new Promise(r => { this.onLoad = r; }); await this.send('Page.navigate', { url: BASE + path }); await loaded; await sleep(400); }
  async settle() { let last = -1; for (let i = 0; i < 40; i++) { const y = await this.eval('scrollY'); if (y === last) return; last = y; await sleep(100); } }
  // A real mouse click at the element's center; fails if something else covers that point.
  async click(selector, index = 0) {
    const pt = await this.eval(`(() => {
      const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
      if (!el) return { err: 'missing' };
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return { err: 'not visible' };
      const x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
      if (!hit || !(el === hit || el.contains(hit) || hit.contains(el) || hit.closest('label')?.contains(el))) return { err: 'covered by ' + (hit ? hit.tagName + '.' + hit.className : 'nothing') };
      return { x, y };
    })()`);
    if (pt.err) throw new Error(`${selector}[${index}] ${pt.err}`);
    for (const type of ['mousePressed', 'mouseReleased']) await this.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    await sleep(150);
  }
  async type(text) { await this.send('Input.insertText', { text }); await sleep(100); }
  async key(key, code = key, keyCode = 0) { for (const type of ['keyDown', 'keyUp']) await this.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode }); await sleep(150); }
  async shot(name) { if (!SHOTS) return; await mkdir(SHOTS, { recursive: true }); const { data } = await this.send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(SHOTS, `${name}.png`), Buffer.from(data, 'base64')); }
}

async function step(name, fn) { try { await fn(); } catch (error) { check(name, false, error.message.split('\n')[0]); } }
// Is the element in view, near the top, after a jump link?
const landed = (id) => `(() => { const el = document.getElementById(${JSON.stringify(id)}); if (!el) return 'missing'; const r = el.getBoundingClientRect(); if (!r.height) return 'hidden'; return r.top > -5 && r.top < innerHeight * .5 ? 'ok' : 'top=' + Math.round(r.top); })()`;

const page = await Page.open();

// ---------- guide.html ----------
await page.size(1440, 900);
await page.goto('/guide.html');
await page.eval('localStorage.clear()'); await page.goto('/guide.html');
check('guide: loads without script errors', !page.errors.length, page.errors.join(' | '));
await page.shot('guide-desktop');
const railLinks = await page.eval(`[...document.querySelectorAll('.rail a[href^="#"]')].map(a => a.getAttribute('href').slice(1))`);
check('guide: rail lists 13 sessions plus review links', railLinks.filter(h => h.startsWith('session-')).length === 13 && railLinks.length >= 19, railLinks.join(','));
const pageOrder = await page.eval(`[...document.querySelectorAll('main [id]')].map(el => el.id)`);
const railOrder = railLinks.map(id => pageOrder.indexOf(id));
check('guide: rail order matches page order', railOrder.every((n, i) => n >= 0 && (i === 0 || n > railOrder[i - 1])), railLinks.join(','));

for (const [i, id] of railLinks.entries()) {
  await step(`guide: rail link #${id}`, async () => {
    await page.click('.rail a[href^="#"]', i); await page.settle();
    const where = await page.eval(landed(id));
    check(`guide: rail link #${id} scrolls to its section`, where === 'ok', where);
    if (id === 'session-6') { await sleep(700); await page.shot('guide-session'); }
  });
}

const visible = () => page.eval(`[...document.querySelectorAll('.session')].filter(s => !s.hidden && s.offsetHeight).length`);
for (const [filter, want] of [['ent', 6], ['ob', 5], ['joint', 2], ['todo', 13], ['all', 13]]) {
  await step(`guide: filter ${filter}`, async () => { await page.click(`[data-filter="${filter}"]`); check(`guide: filter "${filter}" shows ${want} sessions`, await visible() === want, `shows ${await visible()}`); });
}
await step('guide: review link while filtered', async () => {
  await page.click('[data-filter="ob"]');
  const id = railLinks.find(h => !h.startsWith('session-') && h !== 'flashcards');
  await page.click(`.rail a[href="#${id}"]`); await page.settle();
  const where = await page.eval(landed(id));
  check('guide: review link still works while a filter is on', where === 'ok', where);
  await page.click('[data-filter="all"]');
});
await step('guide: search', async () => {
  await page.click('#search'); await page.type('DiSC');
  const ok = await page.eval(`[...document.querySelectorAll('.session')].filter(s => !s.hidden).every(s => s.textContent.toLowerCase().includes('disc'))`);
  check('guide: search "DiSC" narrows to matching sessions', ok && await visible() >= 1, `visible ${await visible()}`);
  await page.eval(`(() => { const s = document.getElementById('search'); s.value = 'zzqqzz'; s.dispatchEvent(new Event('input')); })()`);
  check('guide: search with no match shows the empty message', await page.eval(`getComputedStyle(document.getElementById('empty')).display !== 'none'`));
  await page.eval(`(() => { const s = document.getElementById('search'); s.value = ''; s.dispatchEvent(new Event('input')); })()`);
  check('guide: clearing search restores all sessions', await visible() === 13);
});
await step('guide: studied tracking', async () => {
  await page.click('#studied-3');
  const count = await page.eval(`document.getElementById('studied-count').textContent`);
  check('guide: marking a session studied updates the meter', count.startsWith('1'), count);
  await page.goto('/guide.html');
  check('guide: studied state survives a reload', await page.eval(`document.getElementById('studied-3').checked`));
  await page.click('#studied-3');
});
await step('guide: copy template', async () => {
  const n = await page.eval(`document.querySelectorAll('blockquote.template .copy').length`);
  check('guide: every answer template has a copy button', n > 0 && n === await page.eval(`document.querySelectorAll('blockquote.template').length`), `${n}`);
  await page.click('blockquote.template .copy');
  check('guide: copy shows a confirmation', await page.eval(`document.getElementById('toast').classList.contains('show')`));
});
await step('guide: flashcards', async () => {
  await page.click('.rail a[href="#flashcards"]'); await page.settle();
  const term = await page.eval(`document.querySelector('#flash .term')?.textContent`);
  check('guide: flashcard shows a term', !!term, term);
  await page.shot('guide-flashcards');
  await page.click('#flash');
  await sleep(700);
  check('guide: clicking the card flips it to the definition', await page.eval(`document.getElementById('flash').classList.contains('flipped') && !!document.querySelector('#flash .def')?.textContent`));
  await page.shot('guide-flashcard-flipped');
  await page.click('#deck-next');
  const next = await page.eval(`document.querySelector('#flash .term')?.textContent`);
  check('guide: Next shows a different card', next && next !== term, next);
  await page.click('#deck-prev');
  check('guide: Previous goes back', await page.eval(`document.querySelector('#flash .term')?.textContent`) === term);
  await page.key('ArrowRight', 'ArrowRight', 39);
  check('guide: arrow key moves the deck', await page.eval(`document.querySelector('#flash .term')?.textContent`) === next);
  const before = await page.eval(`document.getElementById('deck-count').textContent`);
  await page.click('#deck-known');
  const after = await page.eval(`document.getElementById('deck-count').textContent`);
  check('guide: "I know this one" removes the card', before !== after && /1 known/.test(after), `${before} -> ${after}`);
  await page.eval(`(() => { const s = document.getElementById('deck-session'); s.value = '4'; s.dispatchEvent(new Event('change')); })()`);
  check('guide: session filter limits the deck', /Session 4/.test(await page.eval(`document.querySelector('#flash .side-label').textContent`)));
  await page.click('#deck-shuffle');
  check('guide: shuffle confirms', await page.eval(`document.getElementById('toast').textContent`) === 'Deck shuffled');
  await page.click('#deck-reset');
  check('guide: reset clears known cards', /0 known/.test(await page.eval(`document.getElementById('deck-count').textContent`)));
});
await step('guide: nav and PDF', async () => {
  const pdf = await page.eval(`fetch('./FME1000_Midterm_Master_Study_Guide.pdf').then(r => r.status + ' ' + r.headers.get('content-type'))`);
  check('guide: PDF link resolves', pdf.startsWith('200') && pdf.includes('pdf'), pdf);
  const links = await page.eval(`[...document.querySelectorAll('a[href^="./"]')].map(a => a.getAttribute('href').split('#')[0])`);
  const statuses = await page.eval(`Promise.all(${JSON.stringify([...new Set(links)])}.map(h => fetch(h).then(r => r.status)))`);
  check('guide: every internal link resolves', statuses.every(s => s === 200), statuses.join(','));
});

await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await page.goto('/guide.html'); await page.shot('guide-dark');
await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

await page.size(390, 844, true);
await page.goto('/guide.html');
await step('guide mobile', async () => {
  check('guide mobile: session list starts collapsed', !await page.eval(`document.getElementById('toc-details').open`));
  check('guide mobile: no sideways scroll', await page.eval(`document.documentElement.scrollWidth <= innerWidth + 1`), await page.eval('document.documentElement.scrollWidth'));
  await page.shot('guide-mobile');
  await page.click('#toc-details > summary');
  await page.click('.rail a[href="#session-6"]'); await page.settle();
  check('guide mobile: tapping a session jumps to it', await page.eval(landed('session-6')) === 'ok', await page.eval(landed('session-6')));
});

// ---------- index.html ----------
page.errors = [];
await page.size(1440, 900);
await page.goto('/index.html');
check('index: loads without script errors', !page.errors.length, page.errors.join(' | '));
await page.shot('index-desktop');
await step('index: data integrity', async () => {
  const bad = await page.eval(`questions.filter(q => !(q.answer >= 0 && q.answer < q.choices.length) || !q.why || !q.session).length + writtenCases.filter(c => c.checks.length !== 4 || !c.model).length`);
  check('index: every question has a valid answer and every case has 4 checks', bad === 0, `${bad} bad`);
  const sessions = await page.eval(`[...new Set(questions.map(q => q.session))].length`);
  check('index: concept questions cover all 13 sessions', sessions === 13, `${sessions}`);
  const guideIds = await page.eval(`fetch('./guide.html').then(r => r.text()).then(t => [...t.matchAll(/id="session-(\\d+)"/g)].map(m => +m[1]))`);
  const missing = await page.eval(`[...new Set(questions.map(q => q.session))].filter(s => !${JSON.stringify(guideIds)}.includes(s))`);
  check('index: every "review in guide" link has a matching guide section', !missing.length, missing.join(','));
});
await step('index: topic tree', async () => {
  const n = await page.eval(`document.querySelectorAll('.tree-session').length`);
  check('index: topic tree lists 13 sessions', n === 13, `${n}`);
  await page.click('.tree-session > summary', 0);
  check('index: a topic-tree session opens', await page.eval(`document.querySelectorAll('.tree-session')[0].open`));
  await page.click('.tree-session > summary', 0);
  check('index: and closes again', !await page.eval(`document.querySelectorAll('.tree-session')[0].open`));
});
await step('index: concept check', async () => {
  await page.click('#open-test');
  check('index: setup dialog opens', await page.eval(`document.getElementById('test-modal').open`));
  await page.shot('index-setup');
  for (const id of ['ent', 'ob', 'joint']) await page.click(`#${id}`);
  await page.click('#begin');
  check('index: Begin with no area picked keeps the dialog open', await page.eval(`document.getElementById('test-modal').open`));
  for (const id of ['ent', 'ob', 'joint']) await page.click(`#${id}`);
  await page.click('#begin'); await sleep(200);
  const total = await page.eval(`state.items.length`);
  check('index: full test uses all 60 questions', total === 60, `${total}`);
  for (let i = 0; i < total; i++) {
    await page.click('.choice', i % 4 === 0 ? 0 : 1);
    await page.click('#next-question');
    if (i === 0) { check('index: checking shows an explanation', await page.eval(`document.getElementById('explanation').classList.contains('show')`)); await page.shot('index-question'); }
    await page.click('#next-question');
  }
  check('index: results appear after the last question', await page.eval(`document.getElementById('results').classList.contains('active')`));
  check('index: results show a score and 3 area stats', /%$/.test(await page.eval(`document.getElementById('final-score').textContent`)) && await page.eval(`document.querySelectorAll('#breakdown .stat').length`) === 3);
  await page.shot('index-results');
  await page.click('#home');
  check('index: stats strip counts answered questions', await page.eval(`document.getElementById('stat-questions').textContent`) === '60');
  await page.click('#quick-start'); await page.click('#begin'); await sleep(200);
  check('index: quick check uses 10 questions', await page.eval(`state.items.length`) === 10);
  await page.click('#exit-test');
  await page.click('#open-test'); await page.click('#test-modal button[value="cancel"]');
  check('index: Cancel closes the dialog', !await page.eval(`document.getElementById('test-modal').open`));
});
await step('index: written coach', async () => {
  await page.click('#written-card-start');
  check('index: case coach opens with a case', await page.eval(`document.getElementById('written-page').classList.contains('active') && !!document.getElementById('written-title').textContent`));
  await page.click('#written-answer'); await page.type('Prediction logic is risky here because the evidence is thin.');
  check('index: word count updates while typing', /^1\d words/.test(await page.eval(`document.getElementById('written-words').textContent`)));
  await page.click('#reveal-written');
  check('index: Compare shows checklist and model answer', await page.eval(`document.getElementById('written-coach').classList.contains('show') && document.querySelectorAll('.check-item').length === 4`));
  await page.click('.rate-button', 3);
  check('index: self-rating confirms', /3\/4/.test(await page.eval(`document.getElementById('toast').textContent`)));
  await page.shot('index-coach');
  const title = await page.eval(`document.getElementById('written-title').textContent`);
  await page.click('#new-written');
  check('index: Try another case changes the case', await page.eval(`document.getElementById('written-title').textContent`) !== title);
  await page.click('#exit-written');
});
await step('index: mock exam', async () => {
  await page.click('#mock-start');
  check('index: mock shows 4 essay prompts', await page.eval(`document.querySelectorAll('.mock-card').length`) === 4);
  await sleep(2200);
  check('index: timer counts down', await page.eval(`document.getElementById('timer-display').textContent`) < '90:00');
  await page.click('#mock-answer-0'); await page.type('Draft answer for the first prompt.');
  await page.shot('index-mock');
  await page.click('#exit-mock'); await page.click('#mock-start');
  check('index: Save and exit keeps the draft', await page.eval(`document.getElementById('mock-answer-0').value`) === 'Draft answer for the first prompt.');
  await page.click('#submit-mock'); await sleep(300);
  check('index: Finish shows 4 model answers', await page.eval(`document.getElementById('mock-review').classList.contains('show') && document.querySelectorAll('#mock-models .review-answer').length === 4`));
  await page.click('#new-mock');
  check('index: new mock starts blank', await page.eval(`document.getElementById('mock-answer-0').value`) === '');
  await page.click('#exit-mock');
  check('index: leaving the mock returns home', await page.eval(`getComputedStyle(document.getElementById('home-screen')).display !== 'none'`));
});
check('index: no script errors during the run', !page.errors.length, page.errors.join(' | '));

await page.size(390, 844, true);
await page.goto('/index.html');
check('index mobile: no sideways scroll', await page.eval(`document.documentElement.scrollWidth <= innerWidth + 1`), await page.eval('document.documentElement.scrollWidth'));
await page.shot('index-mobile');

// ---------- knittr-guide.html ----------
await page.size(1440, 900);
page.errors = [];
await page.goto('/knittr-guide.html');
await page.eval('localStorage.clear()'); await page.goto('/knittr-guide.html');
check('knittr: loads without script errors', !page.errors.length, page.errors.join(' | '));
await page.shot('knittr-desktop');
const shape = await page.eval(`[...document.querySelectorAll('.session')].map(s => ({ n: s.dataset.session, area: s.dataset.area, topics: s.querySelectorAll('.topic').length, map: s.querySelectorAll('.topic-map li').length, knittr: [...s.querySelectorAll('[data-view="apply"]')].some(v => v.textContent.includes('Knittr') || v.textContent.includes('Kayden')) }))`);
check('knittr: 13 sessions, each with a topic map matching its topics', shape.length === 13 && shape.every(s => s.topics > 0 && s.map === s.topics), JSON.stringify(shape.map(s => [s.n, s.topics, s.map])));
check('knittr: every entrepreneurship and joint session applies Knittr', shape.filter(s => s.area !== 'ob').every(s => s.knittr), shape.filter(s => s.area !== 'ob' && !s.knittr).map(s => s.n).join(','));
check('knittr: every topic has Learn, Application, and Practice', await page.eval(`[...document.querySelectorAll('.topic')].every(t => ['learn', 'apply', 'practice'].every(v => t.querySelector('[data-view="' + v + '"]')))`));
const firstTopics = await page.eval(`[...document.querySelectorAll('.session')].map(s => s.querySelector('.topic').id)`);
for (const id of firstTopics) {
  await step(`knittr: rail topic #${id}`, async () => {
    await page.click(`.rail a[href="#session-${id.match(/^s(\d+)/)[1]}"]`); await page.settle();
    await page.click(`.rail a[href="#${id}"]`); await page.settle();
    const where = await page.eval(landed(id));
    check(`knittr: rail topic link #${id} lands`, where === 'ok', where);
  });
}
await step('knittr: view switch', async () => {
  await page.click('#session-7 [data-set-view="practice"]');
  const shown = await page.eval(`[...document.querySelectorAll('#session-7 .view')].filter(v => v.offsetHeight).map(v => v.dataset.view)`);
  check('knittr: Practice view shows only exam moves', shown.length > 0 && shown.every(v => v === 'practice'), shown.join(','));
  await sleep(500); await page.shot('knittr-practice-view');
  await page.click('#session-7 [data-set-view="all"]');
});
await step('knittr: topic studied tracking', async () => {
  const boxes = await page.eval(`document.querySelectorAll('#session-1 [data-studied]').length`);
  for (let i = 0; i < boxes; i++) await page.click('#session-1 [data-studied]', i);
  check('knittr: meter counts topics', (await page.eval(`document.getElementById('studied-count').textContent`)).startsWith(`${boxes} /`));
  check('knittr: session marked done in the rail when all topics are checked', await page.eval(`document.querySelector('[data-toc="1"]').classList.contains('done')`));
  await page.goto('/knittr-guide.html');
  check('knittr: topic progress survives a reload', await page.eval(`document.querySelectorAll('#session-1 [data-studied]:checked').length`) === boxes);
  check('knittr: progress is stored apart from guide.html', await page.eval(`localStorage.getItem('fme-studied') === null && JSON.parse(localStorage.getItem('fme-knittr-studied')).length`) === boxes);
  await page.click('[data-filter="todo"]');
  check('knittr: Not studied hides the finished session', await page.eval(`document.getElementById('session-1').hidden`));
  await page.click('[data-filter="all"]');
});
await step('knittr: search', async () => {
  await page.eval(`(() => { const s = document.getElementById('search'); s.value = 'Beatrice'; s.dispatchEvent(new Event('input')); })()`);
  const r = await page.eval(`(() => { const t = [...document.querySelectorAll('.topic')].filter(t => !t.hidden && !t.closest('[hidden]')); return { n: t.length, ok: t.every(x => x.textContent.includes('Beatrice')) }; })()`);
  check('knittr: search "Beatrice" narrows to matching Knittr topics', r.n > 0 && r.ok, JSON.stringify(r));
  await page.eval(`(() => { const s = document.getElementById('search'); s.value = ''; s.dispatchEvent(new Event('input')); })()`);
});
await step('knittr: hub link while filtered', async () => {
  await page.click('[data-filter="ent"]');
  await page.click('#session-7 .hub-link'); await page.settle();
  const where = await page.eval(landed('knittr-case-hub'));
  check('knittr: Knittr case hub link lands even with a filter on', where === 'ok', where);
});
check('knittr: no script errors during the run', !page.errors.length, page.errors.join(' | '));
await page.size(390, 844, true);
await page.goto('/knittr-guide.html');
check('knittr mobile: no sideways scroll', await page.eval(`document.documentElement.scrollWidth <= innerWidth + 1`), await page.eval('document.documentElement.scrollWidth'));
await page.shot('knittr-mobile');
await step('knittr mobile: outline link', async () => {
  await page.click('#toc-details summary');
  await page.click(`.rail a[href="#session-11"]`); await page.settle();
  check('knittr mobile: outline link closes the outline and lands', (await page.eval(landed('session-11'))) === 'ok' && !(await page.eval(`document.getElementById('toc-details').open`)));
  await sleep(500); await page.shot('knittr-mobile-session');
});

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed${SHOTS ? `; screenshots in ${SHOTS}` : ''}`);
const exited = new Promise(r => chrome.once('exit', r));
chrome.kill(); await exited; server.close();
await rm(profile, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
process.exit(failed.length ? 1 : 0);
