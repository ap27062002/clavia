/* ------------------------------------------------------------------
   Issues list — the artifact.

   Clavia already keeps the deal's issues list twice: as a tab on the
   intake request (modules-work.js, over MX_ISSUES) and as a clause-by-
   clause list inside a review (review.js issuesRows). Both are good
   where they are and neither can be put on the canvas, handed to the
   version control, or saved to a file.

   So this is a bridge, not a third issues engine. It reads the two
   lists that exist, flattens each into the same seven columns, and
   registers one artifact kind to hold them. Nothing here decides what
   an issue is or where it stands — that is still the request's and the
   review's own work.

   The one thing it adds is shaping: which risk, in what order, with
   which columns. That lives on the artifact rather than in chat,
   because the thing being shaped is in front of you.
------------------------------------------------------------------ */

/* The seven columns, in the order a deal team reads them: where it is,
   what it is, how bad it is, then the two positions and who holds it.
   Clause, Issue, Risk and Status are the spine and stay; the other
   three can be dropped, which is what people do before sending the
   list to someone outside the deal. */
const AQI_COLS = ['Clause', 'Issue', 'Risk', 'Our position', 'Their position', 'Owner', 'Status'];
const AQI_OPTIONAL = ['Our position', 'Their position', 'Owner'];

/* Worst first. The order is the argument the list makes when you sort
   it: what is outside the playbook, what is missing from the contract
   altogether, then what we have already decided we can live with. */
const AQI_RANK = { Outside: 0, Missing: 1, Fallback: 2, Starting: 3, Within: 4 };

/* what the intake request's four groups are called. The request page
   says "With Brightwell" using the counterparty's first word, so this
   takes that word rather than hard-coding "them". */
const AQI_STATUS = (side) => ({
  reply: 'Needs our reply',
  signoff: 'Needs sign-off',
  them: `With ${side}`,
  agreed: 'Agreed',
});

/* A review grades a clause against the playbook; the issues list grades
   the risk. They are the same judgement under two names, so the names
   are mapped rather than recomputed. */
const AQI_FROM_REVIEW = { Unacceptable: 'Outside', Fallback: 'Fallback', Missing: 'Missing', Preferred: 'Within' };

/* ── the shaped view ──────────────────────────────────────────────
   One place decides what is on screen, so the table and all three
   writers agree. Everything downstream reads this and nothing reads
   the stored sheet, which is why an export can never disagree with
   what you were looking at when you asked for it. */
function aqiShape(a) {
  const store = (state.artIssues ||= {});
  const s = (store[a.id] ||= { risk: null, sort: false, hide: {} });
  s.hide ||= {};
  return s;
}

function aqiSheet(a) {
  return bodyOf(a, 'sheets')[0];
}

function aqiView(a) {
  const sh = aqiSheet(a), S = a.shape || aqiShape(a);
  const ri = sh.cols.indexOf('Risk');
  const keep = sh.cols.map(c => !S.hide[c]);
  let idx = sh.rows.map((_, i) => i);
  if (S.risk) idx = idx.filter(i => sh.rows[i][ri] === S.risk);
  /* a stable sort, so two Outside rows stay in the order the request
     put them in rather than swapping about between repaints */
  if (S.sort) idx = idx
    .map((i, k) => [i, k])
    .sort((x, y) => (AQI_RANK[sh.rows[x[0]][ri]] ?? 9) - (AQI_RANK[sh.rows[y[0]][ri]] ?? 9) || x[1] - y[1])
    .map(p => p[0]);
  return {
    name: sh.name,
    cols: sh.cols.filter((_, c) => keep[c]),
    rows: idx.map(i => sh.rows[i].filter((_, c) => keep[c])),
    refs: idx.map(i => sh.refs?.[i] || null),
    total: sh.rows.length,
  };
}

/* ── the table ────────────────────────────────────────────────────
   Built with h() rather than through the spreadsheet grid, because
   three of the seven cells are not text: the risk is a chip, the
   status is a pill, and the clause is a way back into the document
   that carried it. A grid of editable strings would lose all three.

   The jump is a callback the caller hands over — the request page
   already has openRef and knows which pane the document is in; this
   file has no business reaching into it. */
function aqiTable(a, repaint) {
  const V = aqiView(a), S = a.shape;
  const onRef = a.onRef;

  const cell = (col, value, ref) => {
    if (col === 'Clause') {
      if (!value) return h('td', { class: 'aqi-td aqi-td--ref' }, '—');
      return h('td', { class: 'aqi-td aqi-td--ref' }, onRef && ref
        ? h('button', { class: 'aqi-ref', type: 'button', 'data-tip': 'Show the clause in the document', onclick: () => onRef(ref) }, value)
        : h('span', { class: 'aqi-where' }, value));
    }
    if (col === 'Risk') return h('td', { class: 'aqi-td' },
      h('span', { class: 'aqi-risk', 'data-risk': value }, value || '—'));
    if (col === 'Status') return h('td', { class: 'aqi-td' },
      h('span', { class: 'aqi-pill' }, value || '—'));
    if (col === 'Issue') return h('td', { class: 'aqi-td aqi-td--issue' }, value || '—');
    if (col === 'Owner') return h('td', { class: 'aqi-td aqi-td--who' }, value || '—');
    return h('td', { class: 'aqi-td aqi-td--pos' }, value || '—');
  };

  const head = h('tr', {}, V.cols.map(c => h('th', { class: 'aqi-th', scope: 'col' }, c)));
  const body = V.rows.length
    ? V.rows.map((row, i) => h('tr', { class: 'aqi-tr' }, row.map((v, c) => cell(V.cols[c], v, V.refs[i]))))
    : [h('tr', {}, h('td', { class: 'aqi-td aqi-empty', colspan: String(V.cols.length) },
        'No issue is at that risk. ',
        h('button', { class: 'aqi-link', type: 'button', onclick: () => { S.risk = null; save(); repaint(); } }, 'Show every risk')))];

  /* the caption says what you are looking at, and says it out loud when
     that is less than everything — a filtered table that does not
     mention the filter is how people send half a list by accident */
  const sh = aqiSheet(a), ri = sh.cols.indexOf('Risk');
  /* a clause the playbook requires and the contract does not have is
     outside it as surely as one that contradicts it */
  const worst = sh.rows.filter(r => r[ri] === 'Outside' || r[ri] === 'Missing').length;
  const hidden = AQI_COLS.length - V.cols.length;
  const cap = [
    h('b', {}, V.rows.length === V.total
      ? `${V.total} ${V.total === 1 ? 'issue' : 'issues'}`
      : `${V.rows.length} of ${V.total} issues`),
    worst ? h('span', { class: 'aqi-cap-warn' }, `${worst} outside the playbook`) : null,
    S.risk ? h('span', { class: 'aqi-cap-note' }, `${S.risk} only`) : null,
    S.sort ? h('span', { class: 'aqi-cap-note' }, 'sorted by risk') : null,
    hidden ? h('span', { class: 'aqi-cap-note' }, `${hidden} ${hidden === 1 ? 'column' : 'columns'} hidden`) : null,
  ].filter(Boolean);

  /* the caption and the table, as two rows rather than one wrapped box:
     the body of an artifact is a grid child of the shell, and a box in
     between it and the scroller is where a sticky header stops working */
  return [
    h('div', { class: 'aqi-cap' }, cap),
    h('div', { class: 'aqi-scroll' },
      h('table', { class: 'aqi-t' }, h('thead', {}, head), h('tbody', {}, body))),
  ];
}

/* ── shaping, on the thing being shaped ──────────────────────────
   Risk, order and columns, with a tick against whatever is on — the
   same menu shape the request page uses to move an issue between
   groups. The choices are kept per artifact id so reopening the list
   finds it as you left it.

   The two controls are the shell's own icon buttons rather than
   anything new: the header beside a conversation is 300px of room
   already holding exports, comments and the way out, and a labelled
   box there takes the width off the artifact's name. */
const AQI_SHAPE_D = '<path d="M4 7h16M7 12h10M10 17h4"/>';
const AQI_DOWN_D = '<path d="M12 3.5v11"/><path d="M7.5 10.5l4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>';
const aqiIcon = (d, label, extra) => h('button', Object.assign({
  class: 'icon-btn icon-btn-canvas aqi-btn', type: 'button',
  'aria-label': label, title: label, 'aria-haspopup': 'menu',
  html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
      + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>',
}, extra || {}));

function aqiShapeBtn(a, repaint) {
  const S = a.shape || aqiShape(a);
  /* a table that has been cut down says so on the control that cut it,
     not only in the caption — the header is what you see first */
  const shaped = () => !!S.risk || S.sort || AQI_OPTIONAL.some(c => S.hide[c]);
  const btn = aqiIcon(AQI_SHAPE_D, 'Shape the table', { 'data-on': String(shaped()) });
  /* the control is outside the body, so a repaint of the table cannot
     reach it; the table asks it to catch up instead */
  btn.sync = () => { btn.dataset.on = String(shaped()); };
  btn.onclick = (e) => {
    e.stopPropagation();
    const sh = aqiSheet(a), ri = sh.cols.indexOf('Risk');
    const risks = [...new Set(sh.rows.map(r => r[ri]))]
      .sort((x, y) => (AQI_RANK[x] ?? 9) - (AQI_RANK[y] ?? 9));
    const set = (fn) => { fn(); save(); repaint(); };
    menu(btn, [
      ...(risks.length > 1 ? [
        { label: 'Every risk', tick: !S.risk, run: () => set(() => { S.risk = null; }) },
        ...risks.map(k => ({ label: `${k} only`, tick: S.risk === k, run: () => set(() => { S.risk = k; }) })),
        { rule: true },
      ] : []),
      { label: 'Sort by risk', tick: S.sort, run: () => set(() => { S.sort = !S.sort; }) },
      { rule: true },
      ...AQI_OPTIONAL.map(c => ({ label: c, tick: !S.hide[c], run: () => set(() => { S.hide[c] = !S.hide[c]; }) })),
    ]);
  };
  return btn;
}

/* ── writing a file ──────────────────────────────────────────────
   Three formats a browser can genuinely produce on its own, so these
   download rather than promise to: CSV, a Markdown pipe table, and a
   Word document through the application/msword HTML trick review.js
   already uses for the issues list it downloads today. Excel and PDF
   need a library this codebase does not carry, so they stay in the
   shared export menu with the rest of the next pass.

   All three read the shaped view, which is the point of shaping. */
const aqiSafe = (s) => String(s).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
const aqiEsc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function aqiSave(name, body, mime) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const el = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(el); el.click(); el.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function aqiCsv(a) {
  const V = aqiView(a);
  /* a leading BOM because Excel on Windows reads a plain UTF-8 CSV as
     Latin-1 and turns every curly quote in a clause into mojibake;
     CRLF for the same reason */
  const q = (v) => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const text = '﻿' + [V.cols, ...V.rows].map(r => r.map(q).join(',')).join('\r\n') + '\r\n';
  aqiSave(`${aqiSafe(a.name)}.csv`, text, 'text/csv;charset=utf-8');
  toast(`${V.rows.length} rows downloaded as CSV`);
}

function aqiMarkdown(a) {
  const V = aqiView(a);
  const c = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
  const text = `# ${a.name}\n\n`
    + `| ${V.cols.map(c).join(' | ')} |\n`
    + `|${V.cols.map(() => ' --- ').join('|')}|\n`
    + V.rows.map(r => `| ${r.map(c).join(' | ')} |`).join('\n') + '\n';
  aqiSave(`${aqiSafe(a.name)}.md`, text, 'text/markdown;charset=utf-8');
  toast(`${V.rows.length} rows downloaded as Markdown`);
}

function aqiWord(a) {
  const V = aqiView(a);
  const rows = V.rows.map(r => `<tr>${r.map((v, i) => `<td>${V.cols[i] === 'Issue' ? `<b>${aqiEsc(v)}</b>` : aqiEsc(v)}</td>`).join('')}</tr>`).join('');
  const html = '<html><head><meta charset="utf-8"><style>'
    + 'body{font-family:Calibri,Arial;font-size:10.5pt}table{border-collapse:collapse;width:100%}'
    + 'td,th{border:1px solid #D8D3CC;padding:6px 8px;vertical-align:top;text-align:left}th{background:#F4F2EF}'
    + '</style></head><body>'
    + `<h2>${aqiEsc(a.name)}</h2>`
    + `<p>${aqiEsc(a.sub || '')} · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>`
    + `<table><tr>${V.cols.map(x => `<th>${aqiEsc(x)}</th>`).join('')}</tr>${rows}</table></body></html>`;
  aqiSave(`${aqiSafe(a.name)}.doc`, html, 'application/msword');
  toast(`${V.rows.length} rows downloaded as a Word table`);
}

function aqiDownBtn(a) {
  const btn = aqiIcon(AQI_DOWN_D, 'Download this table');
  btn.onclick = (e) => {
    e.stopPropagation();
    menu(btn, [
      { label: 'CSV', run: () => aqiCsv(a) },
      { label: 'Word table', run: () => aqiWord(a) },
      { label: 'Markdown', run: () => aqiMarkdown(a) },
    ]);
  };
  return btn;
}

/* ── the kind ─────────────────────────────────────────────────────
   Registered from this file the way modules.js registers template, so
   nothing in artifacts.js has to know this exists. */
RENDER.issues = (a) => {
  a.shape ||= aqiShape(a);
  const root = h('div', { class: 'aqi' });
  const shapeBtn = aqiShapeBtn(a, () => paint());
  const paint = () => { root.replaceChildren(...aqiTable(a, paint)); shapeBtn.sync(); };
  paint();
  return { body: root, extras: [shapeBtn, aqiDownBtn(a)] };
};

/* A ruled sheet with a risk column marked down the left — the same
   drawn-paper family as the template mark, so the two new kinds read
   as a set beside the Office artwork. */
KIND_ICON.issues =
    '<rect x="2.6" y="3.4" width="18.8" height="17.2" rx="2.4" fill="#FCFCFB" stroke="#D8D3CC" stroke-width="1"/>'
  + '<path d="M2.6 8.2h18.8" stroke="#D8D3CC" stroke-width="1"/>'
  + '<path d="M8.4 8.2v12.4" stroke="#E8E4DF" stroke-width="1"/>'
  + '<path d="M11.4 11.4h7.2M11.4 14.4h7.2M11.4 17.4h4.6" stroke="#CFC8BE" stroke-width="1" stroke-linecap="round"/>'
  + '<circle cx="5.5" cy="11.4" r="1.25" fill="#C8483A"/>'
  + '<circle cx="5.5" cy="14.4" r="1.25" fill="#C9962F"/>'
  + '<circle cx="5.5" cy="17.4" r="1.25" fill="#2E7D4F"/>';
KIND_LABEL.issues = 'Issues list';
KIND_SHORT.issues = 'ISSUES';
NOUN.issues = 'issues list';

/* Excel and PDF are here because this is where the rest of the app
   puts them and they behave the same way as every other stub row.
   The three formats that really write a file are on the artifact's own
   Download button instead, where a working row cannot be mistaken for
   a promised one. */
EXPORT.issues = {
  primary: 'xlsx',
  open: ['gsheets', 'sharepoint'],
  download: ['xlsx', 'pdf'],
  copy: ['clipboard'],
};

/* what the trace says it read when a step came from here */
SOURCES.issues = { label: 'the issues list', verb: 'Read',
  icon: '<rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M3 9h18M9 9v11"/>'
      + '<path d="M12 12.5h6M12 16h3.5"/>' };

/* ── making one ──────────────────────────────────────────────────
   Either source produces the same seven columns, so the artifact
   itself is made in one place. Asked for a second time the rows are
   rebuilt from the fixtures and, if the deal has moved since, the
   difference becomes a version rather than a silent overwrite. */
function aqiArtifact(id, name, sub, sheet, onRef) {
  const prev = ARTIFACTS[id];
  if (prev && prev.kind === 'issues') {
    const cur = aqiSheet(prev);
    const moved = JSON.stringify([cur.cols, cur.rows]) !== JSON.stringify([sheet.cols, sheet.rows]);
    if (moved) bumpVersion(prev, { name: 'Rebuilt from the issues list' }, { sheets: [sheet] });
    /* rebuilding may change what the list is called, but a name typed
       into the header is the owner's and survives */
    if (prev.name === prev.autoName) prev.name = name;
    prev.autoName = name; prev.sub = sub; prev.onRef = onRef;
    /* asking for the issues list puts you on the issues list as it
       stands, even if you wandered back through the history first */
    prev.vi = prev.versions.length - 1;
    openArtifact(prev);
    if (moved) toast('The issues list has moved on — this is a new version');
    return prev;
  }
  const a = defineArtifact({
    id, kind: 'issues', name, ext: 'xlsx', sub,
    versions: [{ name: 'From the issues list', when: 'Just now', by: 'Assistant', sheets: [sheet] }],
    onRef, autoName: name,
  });
  /* made in this conversation, so its history starts here rather than
     claiming the seeded one */
  startVersions(a);
  a.shape = aqiShape(a);
  openArtifact(a);
  return a;
}

/* The intake request's Issues tab, as a table.
   mxIssues is the only reader of MX_ISSUES and stays that way; this
   flattens what it returns. `where` can name more than one document —
   breach notification lives in both the MSA and the DPA — so the
   clause cell carries both and the jump takes the first. */
function artIssuesFromRequest(r, onRef) {
  const list = typeof mxIssues === 'function' ? mxIssues(r) : null;
  if (!list?.items?.length) return toast('This request has no issues list yet.');
  const docs = (typeof mxDocuments === 'function' ? mxDocuments(r) : []) || [];
  const side = String(r.counterparty || 'Them').split(/\s+/)[0];
  const label = AQI_STATUS(side);

  const docTag = (id) => {
    const d = docs.find(x => x.id === id);
    if (!d) return '';
    const src = d.source || '', t = d.title || '';
    return /msa/i.test(src) ? 'MSA' : /^dpa$/i.test(src) ? 'DPA' : /nda/i.test(src) ? 'NDA'
      : /order/i.test(src) ? 'Order Form'
      : (/\b(MSA|DPA|NDA|SOW)\b/i.exec(t) || [])[1] || t.replace(/\.\w+$/, '');
  };
  const clauseNo = (head) => (/^(\d+(?:\.\d+)*)\./.exec(head) || [])[1] || head;
  /* the last thing each side actually said; a turn that left the point
     alone carries null, so this walks back rather than taking the end */
  const last = (it, who) => {
    for (let i = it.pos.length - 1; i >= 0; i--) {
      if (it.pos[i] != null && list.turns[i]?.side === who) return it.pos[i];
    }
    return null;
  };

  const rows = list.items.map(it => [
    (it.where || []).map(([id, hd]) => `${docTag(id)} ${clauseNo(hd)}`).join(', '),
    it.name,
    /* the playbook verdict reads "Fallback · 48 hours"; the first word
       is the verdict and the rest is the detail */
    String(it.playbook || '').split(/\s*·\s*|\s+/)[0] || '',
    last(it, 'ours') || '',
    last(it, 'theirs') || '',
    it.owner || '',
    label[it.status] || it.status || '',
  ]);
  const refs = list.items.map(it => (it.where?.[0] ? { doc: it.where[0][0] } : null));
  /* the documents the issues are actually in, not every document on the
     request — a signed order form is on the request and in nobody's
     issues list, and saying "across four documents" over a list that
     touches two is the sort of number people quote back at you */
  const touched = new Set(list.items.flatMap(it => (it.where || []).map(([id]) => id))).size;

  return aqiArtifact(
    `issues-${r.id}`,
    `${r.title || r.counterparty || r.id} — issues list`,
    `${rows.length} issues across ${touched || 1} ${touched === 1 ? 'document' : 'documents'}`,
    { name: 'Issues', cols: AQI_COLS.slice(), rows, refs },
    onRef);
}

/* The review's own issues list, as a table.
   issuesRows() is a closure inside the review workspace, so the rows
   arrive already made — this file never recomputes what a clause is
   worth. Owner is the attorney the request is with, which is the only
   ownership a single-document review knows about; the per-clause
   sign-off it does know is already in Status. */
function artIssuesFromReview(req, A, rows, onRef) {
  if (!rows?.length) return toast('Nothing open to put in a table yet.');
  const tag = (/\b(MSA|DPA|NDA|SOW|Order Form)\b/i.exec(A?.name || '') || [])[1] || 'Clause';
  const owner = req?.attorney || req?.requester || '';

  const made = rows.map(r => [
    r.c?.n != null ? `${tag} ${r.c.n}` : '',
    r.point || '',
    AQI_FROM_REVIEW[r.status] || r.status || '',
    r.ours || '',
    r.theirs || '',
    owner,
    r.state || '',
  ]);
  const refs = rows.map(r => (r.c?.n != null ? { clause: r.c.n } : null));

  return aqiArtifact(
    `issues-${A?.id || req?.id || 'review'}`,
    `${A?.name || req?.title || 'Review'} — issues list`,
    `${made.length} open points against the ${A?.playbook?.name || 'playbook'}`,
    { name: 'Issues', cols: AQI_COLS.slice(), rows: made, refs },
    onRef);
}

/* ── its own stylesheet ──────────────────────────────────────────
   Appended once at load, because the shared sheets are not this
   feature's to edit. Feature colours are fallbacks behind the tokens
   the redline already uses, so a theme change moves them together. */
(function aqiStyle() {
  if (document.getElementById('aqi-css')) return;
  document.head.insertAdjacentHTML('beforeend', '<style id="aqi-css">'
    + `
/* the same shape the spreadsheet uses: a header row that keeps its
   height and a scroller that takes the rest, straight onto the shell */
.aqi { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; background: var(--surface, #fff); }

.aqi-cap {
  display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 14px;
  padding: 9px 16px; border-bottom: 1px solid var(--line, #E8E4DF);
  font-size: 12.4px; color: var(--text-soft, #6B6862);
}
.aqi-cap b { color: var(--text, #1A1A18); font-weight: 560; }
.aqi-cap-warn { color: var(--pos-walkaway, #B4472F); }
/* what shaping has done to the list, said quietly beside the count —
   a filtered table that does not mention its filter gets emailed */
.aqi-cap-note { color: var(--text-faint, #9A968E); }

.aqi-scroll { overflow: auto; min-height: 0; scrollbar-width: thin; }
.aqi-t { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.9px; }

.aqi-th {
  position: sticky; top: 0; z-index: 2;
  background: var(--surface, #fff);
  text-align: left; white-space: nowrap;
  font-size: 11.2px; font-weight: 560; letter-spacing: .05em; text-transform: uppercase;
  color: var(--text-faint, #9A968E);
  padding: 9px 13px; border-bottom: 1px solid var(--line, #E8E4DF);
}
.aqi-td {
  padding: 11px 13px; vertical-align: top; line-height: 1.46;
  color: var(--text, #1A1A18);
  border-bottom: 1px solid var(--line-soft, #F0EDE7);
}
.aqi-tr:last-child .aqi-td { border-bottom: 0; }
.aqi-tr:hover .aqi-td { background: rgba(26, 26, 24, .022); }

.aqi-td--issue { font-weight: 560; min-width: 136px; }
.aqi-td--pos { color: var(--text-soft, #6B6862); min-width: 150px; }
.aqi-td--who { white-space: nowrap; color: var(--text-soft, #6B6862); }
.aqi-td--ref { white-space: nowrap; }

.aqi-where, .aqi-ref {
  font-family: var(--mono, ui-monospace, Menlo, monospace);
  font-size: 11.4px; color: var(--text-soft, #6B6862);
}
.aqi-ref {
  appearance: none; cursor: pointer; background: none; border: 0; padding: 0;
  text-align: left; border-bottom: 1px dashed var(--line, #E8E4DF);
}
.aqi-ref:hover { color: var(--text, #1A1A18); border-bottom-color: currentColor; }

/* The risk chip is the playbook's verdict under another name, so it
   wears the playbook's own three colours rather than a fourth set:
   within is where we start, fallback is where we can move to, outside
   is what we will not accept. A starting position is not a verdict and
   takes no colour. */
.aqi-risk {
  display: inline-block; white-space: nowrap;
  font-size: 11.4px; font-weight: 560; letter-spacing: .01em;
  padding: 2px 8px; border-radius: 999px;
  color: var(--text-soft, #6B6862); background: var(--line-soft, #F0EDE7);
}
.aqi-risk[data-risk="Outside"],
.aqi-risk[data-risk="Missing"] { color: var(--pos-walkaway, #B4472F); background: var(--pos-walkaway-bg, #F1E2DC); }
.aqi-risk[data-risk="Fallback"] { color: var(--pos-fallback, #8A6B22); background: var(--pos-fallback-bg, #F1E9D8); }
.aqi-risk[data-risk="Within"] { color: var(--pos-preferred, #2F6B45); background: var(--pos-preferred-bg, #E1EDE4); }

.aqi-pill {
  display: inline-block; white-space: nowrap;
  font-size: 11.6px; color: var(--text-soft, #6B6862);
  padding: 2px 8px; border-radius: 5px;
  border: 1px solid var(--line, #E8E4DF);
}

.aqi-empty { color: var(--text-soft, #6B6862); padding: 28px 13px; text-align: center; }
.aqi-link {
  appearance: none; background: none; border: 0; padding: 0; cursor: pointer;
  font: inherit; color: var(--text, #1A1A18); text-decoration: underline;
  text-decoration-color: var(--line, #E8E4DF); text-underline-offset: 2px;
}

/* shaping on: the control that did it carries a dot, so a cut-down
   table is never a surprise in the header */
.aqi-btn { position: relative; }
.aqi-btn[data-on="true"] { color: var(--text, #1A1A18); }
.aqi-btn[data-on="true"]::after {
  content: ''; position: absolute; top: 5px; right: 5px;
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--pos-fallback, #8A6B22);
  box-shadow: 0 0 0 1.5px var(--surface, #fff);
}
`
    + '</style>');
})();
