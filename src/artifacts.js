/* ------------------------------------------------------------------
   Deck — the artifact a research request produces.

   Built to feel like the real tool rather than a styled table: a left
   filmstrip of true thumbnails, one 16:9 canvas floating on a darker
   surround (the surround is the cue that this is a deck), speaker
   notes under it, and a rail that says where each slide came from.
------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   Every artifact is {id, kind, name, ext, ...body}. The chrome is
   shared; only the body differs, so a new kind is one render function
   and one registry entry.
------------------------------------------------------------------ */


/* ------------------------------------------------------------------
   Constructs every artifact shares.

   Versioning, commenting and the selection toolbar are not properties
   of one kind — a deck has revisions as surely as a document does, and
   a comment is a comment wherever it is left. They live here, on the
   shell, and each renderer only says WHERE it currently is so a
   comment can name its own location.
------------------------------------------------------------------ */

/* ── versioning ──────────────────────────────────────────────
   A version overrides only the key it changes, so history costs one
   object per revision rather than a copy of the artifact. Viewing an
   older one is read-only; restoring does not rewind history, it adds
   a new current version carrying the old body — the way every tool
   that people trust with their work behaves. */
const VERSION_META = new Set(['name', 'when', 'by']);   // metadata, not body

const currentIndex = (a) => a.versions ? (a.vi ?? a.versions.length - 1) : 0;
const isCurrentVersion = (a) => !a.versions || currentIndex(a) === a.versions.length - 1;
const versionOf = (a) => a.versions?.[currentIndex(a)] || null;
const versionLabel = (a, i) => 'v' + (i + 1);

const bodyOf = (a, key) => {
  const v = versionOf(a);
  return (v && v[key] !== undefined) ? v[key] : a[key];
};

/* Something made just now is on its first version. The seeded artifacts
   ship with a history so the version control has something to show, but a
   build in a live conversation starts its own count — "created just now,
   Version 3" is a lie about where it came from. */
function startVersions(a) {
  if (!a?.versions) return;
  /* Back to what shipped, not to whatever the last run left behind.
     Everything here is mutated in place, so running the same conversation
     twice was compounding one update on top of the last one. */
  const src = a.seed || a.versions;
  const v = src[src.length - 1];
  const body = {};
  for (const k of Object.keys(v)) if (!VERSION_META.has(k)) body[k] = v[k];
  a.versions = [{ when: 'Just now', by: 'Assistant', ...body }];
  a.vi = 0;
}

/* A new version carrying the current body — what the assistant does when
   it is asked to bring something up to date rather than make a new one. */
function bumpVersion(a, meta = {}, edit = null) {
  if (!a?.versions) return null;
  const v = a.versions[a.versions.length - 1];
  const body = {};
  for (const k of Object.keys(v)) if (!VERSION_META.has(k)) body[k] = v[k];
  /* An update that carries the body forward unchanged is a version number
     and nothing else — you switch to v2 and the page is identical, which
     reads as a bug. An artifact that knows what "brought up to date" means
     for it says so here, and the new version carries the difference. */
  const moved = edit || (typeof a.update === 'function' ? a.update(body) : null);
  a.versions.push({ when: 'Just now', by: 'Assistant', ...meta, ...body, ...(moved || {}) });
  a.vi = a.versions.length - 1;
  return a.versions.length;
}

function restoreVersion(a) {
  const v = versionOf(a);
  if (!v) return;
  const body = {};
  for (const k of Object.keys(v)) if (!VERSION_META.has(k)) body[k] = v[k];
  a.versions.push({ when: 'Just now', by: 'You', ...body });
  a.vi = a.versions.length - 1;
}

const ARTIFACTS = {};
const defineArtifact = (a) => { ARTIFACTS[a.id] = a; return a; };

const DECK = defineArtifact({
  id: 'deck-ai-adoption',
  kind: 'deck',
  name: 'Where We Stand on AI Adoption',
  ext: 'pptx',
  sub: 'Board briefing · Q4 FY26',
  slides: [
    {
      kicker: 'The question',
      title: 'Where we stand on AI adoption',
      bullets: [
        'Board asked for a read on adoption against the market',
        'Nine sources: three internal, four external, two systems of record',
        'Written 26 Aug, from data pulled the same morning',
      ],
      notes: 'Open on the question the board actually asked, not on our answer. '
           + 'Say the sources out loud — it buys trust for the numbers later.',
      sources: ['drive', 'web'],
    },
    {
      kicker: 'Market',
      title: 'The benchmark moved faster than we did',
      bullets: [
        'Peer median reached production on 4 of 9 workflows',
        'We are live on 2, with a third in pilot since June',
        'Gap is concentrated in customer-facing work, not internal tooling',
      ],
      notes: 'The gap is real but narrower than it looks — our two are the '
           + 'harder two. Do not let this land as a failure slide.',
      sources: ['web'],
    },
    {
      kicker: 'Inside',
      title: 'Usage is deep in three teams and absent elsewhere',
      bullets: [
        'Sales ops and finance account for 71% of weekly active use',
        'Support has plateaued since the March rollout',
        'No measurable adoption in legal, procurement or facilities',
      ],
      notes: 'The plateau in support is the interesting one. It is a training '
           + 'problem, not a product problem — the data is in the Drive doc.',
      sources: ['drive', 'sharepoint'],
    },
    {
      kicker: 'Pipeline',
      title: 'Two renewals now hinge on the AI roadmap',
      bullets: [
        'Kestrel Industries — $840k, in negotiation, roadmap named in the redlines',
        'Emirates NBD — $1.2m, proposal stage, expansion contingent on Q1 delivery',
        'Neither has a committed date from us yet',
      ],
      notes: 'This is the slide that changes the conversation from interesting '
           + 'to urgent. Have the Q1 date ready before you present it.',
      sources: ['salesforce'],
    },
    {
      kicker: 'Constraint',
      title: 'Policy is the bottleneck, not capability',
      bullets: [
        'AI Usage Policy v3 still requires per-workflow legal sign-off',
        'Median approval time: 19 days, against a 3-day build cycle',
        'Discount matrix has no clause for AI-delivered scope',
      ],
      notes: 'Legal will push back. The 19-day number is from their own '
           + 'tracker, so use theirs, not ours.',
      sources: ['sharepoint'],
    },
    {
      kicker: 'Ask',
      title: 'Three decisions, this quarter',
      bullets: [
        'Move to workflow-class approval, not per-workflow',
        'Commit a Q1 date for the two renewals at risk',
        'Fund the support retraining, not more product',
      ],
      notes: 'End on decisions the room can actually make today. Do not open '
           + 'the budget question unless asked.',
      sources: ['drive', 'salesforce', 'sharepoint'],
    },
  ],
});

/* the deck grew from a three-slide skeleton into the six it is now */
DECK.versions = [
  { name: 'First outline', when: 'Yesterday · 15:02', by: 'Assistant',
    slides: DECK.slides.slice(0, 3) },
  { name: 'Added the pipeline slide', when: 'Today · 09:40', by: 'Assistant',
    slides: DECK.slides.slice(0, 5) },
  { name: 'Board-ready', when: 'Today · 11:47', by: 'You', slides: DECK.slides },
];


/* ══════════════════ SHEET ══════════════════ */
const SHEET = defineArtifact({
  id: 'sheet-churn',
  kind: 'sheet',
  name: 'Churn Risk — Accounts at Renewal',
  ext: 'xlsx',
  sub: 'Customer success',
  sheets: [
    {
      name: 'Risk Scores',
      cols: ['Account', 'ARR', 'Renewal', 'Usage Δ 90d', 'Tickets', 'Risk', 'Owner'],
      widths: [180, 96, 100, 104, 74, 68, 124],
      heat: 5,
      formulaCell: 'F2',
      formula: '=ROUND(0.45*UsageDrop + 0.35*TicketRate + 0.20*(1-NPS), 0)',
      rows: [
        ['Pinewood Group',    '$88,000',    '05 Sep 2026', '-45%', '17', '92', 'A. Osei'],
        ['Halden Freight',    '$310,000',   '12 Sep 2026', '-38%', '14', '87', 'R. Bennett'],
        ['Kestrel Health',    '$275,000',   '30 Sep 2026', '-31%', '9',  '81', 'A. Osei'],
        ['Marlow Logistics',  '$196,000',   '02 Oct 2026', '-22%', '11', '73', 'A. Osei'],
        ['Vantage Labs',      '$365,000',   '09 Oct 2026', '-19%', '8',  '69', 'S. Kaur'],
        ['Kestrel Industries', '$840,000',   '14 Nov 2026', '-12%', '6',  '64', 'R. Bennett'],
        ['Caldera Energy',    '$530,000',   '22 Nov 2026', '-8%',  '5',  '44', 'R. Bennett'],
        ['Orion Retail',  '$412,000',   '18 Dec 2026', '-4%',  '3',  '38', 'S. Kaur'],
        ['Emirates NBD',      '$1,200,000', '31 Jan 2027', '+9%',  '2',  '21', 'S. Kaur'],
        ['Orbit Financial',   '$725,000',   '14 Feb 2027', '+3%',  '1',  '18', 'R. Bennett'],
      ],
    },
    {
      name: 'Usage Trend',
      cols: ['Account', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Δ 90d'],
      widths: [180, 76, 76, 76, 76, 76, 88],
      formulaCell: 'G2',
      formula: '=(F2-C2)/C2',
      rows: [
        ['Pinewood Group',    '412', '388', '301', '244', '227', '-45%'],
        ['Halden Freight',    '1,940', '1,802', '1,455', '1,288', '1,203', '-38%'],
        ['Kestrel Health',    '2,610', '2,504', '2,101', '1,922', '1,801', '-31%'],
        ['Marlow Logistics',  '880', '861', '760', '712', '686', '-22%'],
        ['Vantage Labs',      '3,120', '3,044', '2,801', '2,610', '2,527', '-19%'],
        ['Kestrel Industries', '7,410', '7,288', '6,955', '6,704', '6,521', '-12%'],
        ['Caldera Energy',    '4,220', '4,190', '4,051', '3,944', '3,882', '-8%'],
        ['Orion Retail',  '5,880', '5,901', '5,772', '5,701', '5,645', '-4%'],
        ['Emirates NBD',      '9,140', '9,388', '9,655', '9,804', '9,963', '+9%'],
        ['Orbit Financial',   '6,010', '6,077', '6,102', '6,155', '6,190', '+3%'],
      ],
    },
    {
      name: 'Renewals',
      cols: ['Account', 'Renewal', 'ARR', 'Stage', 'Owner', 'Days out'],
      widths: [180, 104, 100, 132, 124, 84],
      formulaCell: 'F2',
      formula: '=DAYS(B2, TODAY())',
      rows: [
        ['Pinewood Group',    '05 Sep 2026', '$88,000',    'At risk',       'A. Osei',    '9'],
        ['Halden Freight',    '12 Sep 2026', '$310,000',   'At risk',       'R. Bennett', '16'],
        ['Kestrel Health',    '30 Sep 2026', '$275,000',   'At risk',       'A. Osei',    '34'],
        ['Marlow Logistics',  '02 Oct 2026', '$196,000',   'Watch',         'A. Osei',    '36'],
        ['Vantage Labs',      '09 Oct 2026', '$365,000',   'Watch',         'S. Kaur',    '43'],
        ['Kestrel Industries', '14 Nov 2026', '$840,000',   'Negotiation',   'R. Bennett', '79'],
        ['Caldera Energy',    '22 Nov 2026', '$530,000',   'On track',      'R. Bennett', '87'],
        ['Orion Retail',  '18 Dec 2026', '$412,000',   'On track',      'S. Kaur',    '113'],
        ['Emirates NBD',      '31 Jan 2027', '$1,200,000', 'Expansion',     'S. Kaur',    '157'],
        ['Orbit Financial',   '14 Feb 2027', '$725,000',   'On track',      'R. Bennett', '171'],
      ],
    },
    {
      name: 'Method',
      cols: ['Signal', 'Weight', 'Source', 'Window', 'Note'],
      widths: [168, 78, 176, 96, 300],
      formulaCell: 'B2',
      formula: '0.45',
      rows: [
        ['Usage decline', '0.45', 'Product usage — weekly actives', '90 days',
         'Steepest predictor in the last four renewal cohorts'],
        ['Ticket rate',   '0.35', 'Salesforce — Case',              '90 days',
         'Normalised per 100 seats so small accounts are comparable'],
        ['NPS',           '0.20', 'CX — Q2 verbatims and scores',   'Latest',
         'Inverted; a high score lowers risk'],
        ['—',             '1.00', '—',                              '—',
         'Weights are a judgement call, not a fit. Argue with them here.'],
      ],
    },
  ],
});

/* the first cut scored six accounts; the weights arrived with v2 */
SHEET.versions = [
  { name: 'Top six accounts', when: 'Today · 08:15', by: 'Assistant',
    sheets: [{ ...SHEET.sheets[0], rows: SHEET.sheets[0].rows.slice(0, 6) }, SHEET.sheets[1]] },
  { name: 'All renewals, weighted', when: 'Today · 09:12', by: 'You', sheets: SHEET.sheets },
];

const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/* A spreadsheet is a grid that continues past its data — stopping the ruled
   lines at the last row makes it a table. Pad out to these. */
const SHEET_COLS = 16;
const SHEET_ROWS = 34;
const PAD_W = 104;

function renderSheet(a) {
  const sheets = bodyOf(a, 'sheets');
  let tab = 0;
  const bar = h('div', { class: 'sheet-bar' },
    h('span', { class: 'sheet-ref' }, 'A1'),
    h('span', { class: 'sheet-fx' }, 'fx'),
    h('span', { class: 'sheet-formula' }, ''));
  const grid = h('div', { class: 'sheet-grid' });

  const paint = () => {
    const sh = sheets[tab];
    /* nothing is selected until you pick something */
    bar.querySelector('.sheet-ref').textContent = 'A1';
    bar.querySelector('.sheet-formula').textContent = '';

    const width = (i) => sh.widths[i] ?? PAD_W;

    const head = h('div', { class: 'sheet-row sheet-head' },
      h('span', { class: 'sheet-gutter' }),
      ...Array.from({ length: SHEET_COLS }, (_, i) => h('span', {
        class: 'sheet-cell sheet-col', style: `width:${width(i)}px`,
      }, COLS[i], sh.cols[i] ? h('span', { class: 'sheet-colname' }, sh.cols[i]) : null)));

    const padded = [
      ...sh.rows.map(r => [...r, ...Array(Math.max(0, SHEET_COLS - r.length)).fill('')]),
      ...Array.from({ length: Math.max(0, SHEET_ROWS - sh.rows.length) },
        () => Array(SHEET_COLS).fill('')),
    ];

    const body = h('div', { class: 'sheet-body' }, padded.map((row, r) =>
      h('div', { class: 'sheet-row' },
        h('span', { class: 'sheet-gutter' }, String(r + 2)),
        ...row.map((v, c) => {
          const heat = sh.heat === c && v !== '';
          return h('span', {
            class: 'sheet-cell'
              + (heat ? ' sheet-risk' : '')
              + (/^[-+$\d]/.test(v) ? ' sheet-num' : ''),
            style: `width:${width(c)}px` + (heat ? `;--heat:${Math.round(+v)}` : ''),
            contenteditable: 'true',
            spellcheck: 'false',
            onfocus: (e) => {
              for (const el of grid.querySelectorAll('.sheet-sel')) el.classList.remove('sheet-sel');
              e.currentTarget.classList.add('sheet-sel');
              bar.querySelector('.sheet-ref').textContent = COLS[c] + (r + 2);
              bar.querySelector('.sheet-formula').textContent =
                (sh.heat === c && sh.rows[r]?.[c]) ? sh.formula : '';
            },
            oninput: (e) => {
              const next = e.currentTarget.textContent;
              /* an edit below or beyond the data grows the sheet to hold it */
              while (sh.rows.length <= r) sh.rows.push([]);
              while (sh.rows[r].length <= c) sh.rows[r].push('');
              sh.rows[r][c] = next;
              /* the data bar is driven by the value, so it has to follow the edit */
              if (heat) e.currentTarget.style.setProperty('--heat', String(Math.round(+next) || 0));
            },
            onkeydown: (e) => {
              if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
              if (e.key === 'Escape') {
                e.currentTarget.textContent = sh.rows[r]?.[c] ?? '';
                e.currentTarget.blur();
              }
            },
          }, v);
        }))));

    grid.replaceChildren(head, body);
  };

  const tabs = h('div', { class: 'sheet-tabs' }, sheets.map((sh, i) =>
    h('button', {
      class: 'sheet-tab', type: 'button', 'aria-current': String(i === 0),
      onclick: (e) => {
        tab = i;
        for (const b of tabs.children) b.setAttribute('aria-current', 'false');
        e.currentTarget.setAttribute('aria-current', 'true');
        paint();
        grid.scrollTo({ top: 0, left: 0 });
      },
    }, sh.name)));

  paint();
  return {
    body: h('div', { class: 'sheet' }, bar, grid, tabs),
  };
}

/* ══════════════════ DOC ══════════════════ */
const DOC_BODY = [
  { t: 'h1', v: 'Kestrel Renewal — Position Brief' },
  { t: 'meta', v: 'Prepared 27 Aug 2026 · Deal desk · Confidential' },
  { t: 'p', v: 'Kestrel Industries renews on 14 November at $840k ARR. The account is in negotiation and the redlines now name our AI roadmap as a condition of renewal. This brief sets out where we stand, what they have asked for, and what we can commit to without a further approval cycle.' },
  { t: 'h2', v: 'Where the deal stands' },
  { t: 'p', v: 'Usage is down 12% over ninety days, concentrated in the two teams that ran the March pilot. Support volume is stable. Priya Raman has been consistent that the commercial terms are settled and the roadmap is the open item.' },
  { t: 'ul', v: [
    'Committed: connector parity with their existing stack by Q1',
    'Asked for, not committed: workflow-class approval and a named delivery date',
    'Out of scope: bespoke model hosting, which we should decline plainly',
  ] },
  { t: 'h2', v: 'What we can say now' },
  { t: 'p', v: 'The Approval SLA tracker puts median legal turnaround at nineteen days against a three-day build cycle. That gap, not engineering capacity, is what prevents a firm date today. We can commit to a date within two weeks of a decision on workflow-class approval, and we should say exactly that rather than hedge.' },
  { t: 'quote', v: 'The roadmap is the only open item. Give us a date and we will sign. — Priya Raman, 22 Aug' },
  { t: 'h2', v: 'Recommendation' },
  { t: 'p', v: 'Take the approval question to the board this quarter as its own decision, not as part of the renewal. The renewal then closes on a date we control.' },
];

const DOC = defineArtifact({
  id: 'doc-renewal-brief',
  kind: 'doc',
  name: 'Kestrel Renewal — Position Brief',
  ext: 'docx',
  sub: 'Deal desk · 2 pages',
  /* versions are real: each is a full body, so switching actually changes
     the page rather than announcing that it would */
  versions: [
    { name: 'Where the deal stands', when: 'Yesterday · 16:20', by: 'You',
      blocks: DOC_BODY.slice(0, 6) },
    { name: 'Hold-the-line recommendation', when: 'Today · 09:04', by: 'You', blocks: [
      ...DOC_BODY.slice(0, 9),
      { t: 'h2', v: 'Recommendation' },
      { t: 'p', v: 'Hold the renewal until legal confirms a turnaround. We should not commit to a date we cannot control.' },
    ] },
    { name: 'Commit-to-a-date recommendation', when: 'Today · 11:47', by: 'Assistant',
      blocks: DOC_BODY },
  ],
});

function renderDoc(a) {
  const blocks = bodyOf(a, 'blocks');
  const page = h('div', { class: 'doc-page' });
  const scroll = h('div', { class: 'doc-scroll' }, page);

  /* which section the reader is in, so a comment can name it */
  let here = 'the document';
  page.addEventListener('click', (e) => {
    const b = e.target.closest('.doc-h2, .doc-h1, .doc-p, .doc-ul, .doc-quote');
    if (!b) return;
    let n = b, label = null;
    while (n && !label) { if (n.classList?.contains('doc-h2')) label = n.textContent; n = n.previousElementSibling; }
    here = label || 'the document';
  });

  const blockEl = (b, i) => {
    const tag = { h1: 'h1', h2: 'h2', meta: 'p', quote: 'blockquote', ul: 'ul', p: 'p' }[b.t];
    const cls = { h1: 'doc-h1', h2: 'doc-h2', meta: 'doc-meta', quote: 'doc-quote', ul: 'doc-ul', p: 'doc-p' }[b.t];
    if (b.t === 'ul') {
      /* bullets carry markup like every other block — read as text they
         printed their own <b> tags on the page */
      return h('ul', { class: cls }, b.v.map((x, j) => h('li', {
        contenteditable: 'true', spellcheck: 'false',
        oninput: (e) => { b.v[j] = e.currentTarget.innerHTML; },
        html: x,
      })));
    }
    return h(tag, {
      class: cls,
      contenteditable: b.t === 'meta' ? null : 'true',
      spellcheck: 'false',
      /* the toolbar writes real markup, so keep it rather than flattening
         the block back to text on every keystroke */
      oninput: (e) => { b.v = e.currentTarget.innerHTML; },
      html: b.v,
    });
  };

  const paint = () => {
    page.replaceChildren(...blocks.map(blockEl));
    page.dataset.readonly = String((a.vi ?? a.versions.length - 1) !== a.versions.length - 1);
  };

  paint();
  return { body: scroll, where: () => here };
}

/* ══════════════════ INTERACTIVE APP ══════════════════
   Pipeline Command, brought over from the GTM Enterprise Context Graph.
   Sales, Marketing and Customer Success resolved onto one Account ×
   Opportunity spine: the forecast, the funnel, the movement across the
   quarter, and the deals the graph has flagged.

   Every figure is computed from one of the tables below — quotas sum to
   the quarter quota, closed sums to what is already booked, and coverage
   and the gap are derived rather than restated. Nothing in the dashboard
   can disagree with anything else in it.

   All SVG, drawn by hand — a chart library would be a bigger dependency
   than the whole app.                                                  */

const PIPE_COMPETITOR = 'Atlas Data Cloud';
const PIPE_SOURCES = ['Salesforce', 'Gong', 'Outreach', 'Clari', 'Snowflake', 'Zuora',
                      '6sense', 'Gainsight', 'Zendesk'];

/* $M unless noted. Commit, best case, coverage and the gap are derived. */
const PIPE_Q = {
  quota: 9.2, pipeline: 24.6, closed: 5.6, commitOpen: 2.8, bestOpen: 2.8,
  cycleDays: 68, winRate: 24, elapsedPct: 68,
};
PIPE_Q.commit   = Math.round((PIPE_Q.closed + PIPE_Q.commitOpen) * 10) / 10;
PIPE_Q.best     = Math.round((PIPE_Q.commit + PIPE_Q.bestOpen) * 10) / 10;
PIPE_Q.coverage = Math.round((PIPE_Q.pipeline / PIPE_Q.quota) * 10) / 10;
PIPE_Q.gap      = Math.round((PIPE_Q.quota - PIPE_Q.commit) * 10) / 10;

/* the accounts the opportunities hang off — health bands the renewal
   conversation opens with, not decoration */
const PIPE_ACCOUNTS = {
  orion: { name: 'Orion Logistics', health: 72, segment: 'Enterprise' },
  cascade:   { name: 'Cascade Analytics',   health: 88, segment: 'Enterprise' },
  ashford:  { name: 'Ashford Labs',       health: 64, segment: 'Enterprise' },
  horizon:   { name: 'Horizon Tech',        health: 91, segment: 'Strategic'  },
  summit:    { name: 'Summit Partners',     health: 55, segment: 'Mid-Market' },
  apex:      { name: 'Apex Global',         health: 79, segment: 'Strategic'  },
  quantum:   { name: 'Quantum Dynamics',    health: 83, segment: 'SMB'        },
  vertex:    { name: 'Vertex Solutions',    health: 47, segment: 'Enterprise' },
  beacon:    { name: 'Beacon Industries',   health: 86, segment: 'Enterprise' },
  delphi:    { name: 'Delphi Networks',     health: 68, segment: 'Mid-Market' },
  forge:     { name: 'Forge Systems',       health: 71, segment: 'Mid-Market' },
  pinnacle:  { name: 'Pinnacle Systems',    health: 81, segment: 'Enterprise' },
};
const healthBand = (n) => n >= 80 ? 'good' : n >= 65 ? 'warn' : 'bad';
for (const a of Object.values(PIPE_ACCOUNTS)) a.band = healthBand(a.health);

/* quotas sum to the $9.2M quarter; closed sums to the $5.6M booked;
   quota × coverage sums to the $24.6M of open pipeline */
const PIPE_REPS = [
  { name: 'Priya Raman',     quota: 1800000, closed: 1310000, coverage: 3.3, slipping: 1, trend: [58, 62, 66, 69, 71, 73] },
  { name: 'Daniel Osei',     quota: 1600000, closed: 1090000, coverage: 3.0, slipping: 2, trend: [46, 51, 57, 61, 65, 68] },
  { name: 'Sofia Marchetti', quota: 1500000, closed: 930000,  coverage: 2.8, slipping: 2, trend: [41, 46, 50, 55, 59, 62] },
  { name: 'Tom Bradley',     quota: 1600000, closed: 880000,  coverage: 2.5, slipping: 3, trend: [38, 42, 46, 49, 52, 55] },
  { name: 'Elena Ruiz',      quota: 1400000, closed: 700000,  coverage: 2.3, slipping: 4, trend: [31, 35, 40, 44, 47, 50] },
  { name: 'Marcus Webb',     quota: 1300000, closed: 690000,  coverage: 1.9, slipping: 5, trend: [36, 41, 44, 47, 50, 53] },
];
for (const r of PIPE_REPS) {
  r.attain = Math.round((r.closed / r.quota) * 100);
  r.pipeline = Math.round(r.quota * r.coverage);
}

const PIPE_OPEN = ['Discovery', 'Proposal', 'Negotiation'];
const PIPE_RISKS = {
  nonext: 'No next step',
  single: 'Single-threaded',
  pushed: 'Pushed twice',
  silent: 'Champion silent',
};

const PIPE_OPPS = [
  { id: 'OPP-4412', acct: 'orion', name: 'Platform expansion — 240 seats', amount: 310000, stage: 'Negotiation', prob: 70, close: 'Nov 14', idle: 6,  rep: 'Priya Raman',     next: 'Legal redlines back from Procurement',   comp: PIPE_COMPETITOR, risks: [] },
  { id: 'OPP-4508', acct: 'orion', name: 'Analytics add-on',               amount: 120000, stage: 'Proposal',    prob: 45, close: 'Dec 5',  idle: 26, rep: 'Priya Raman',     next: 'No next step logged',                   comp: PIPE_COMPETITOR, risks: ['nonext', 'silent'] },
  { id: 'OPP-4577', acct: 'orion', name: 'API Gateway cross-sell',         amount: 50000,  stage: 'Discovery',   prob: 20, close: 'Jan 30', idle: 4,  rep: 'Priya Raman',     next: 'Technical discovery with Alex Reyes',   comp: null, risks: [] },
  { id: 'OPP-4601', acct: 'horizon',   name: 'Platform renewal + 80 seats',    amount: 420000, stage: 'Negotiation', prob: 75, close: 'Sep 26', idle: 3,  rep: 'Daniel Osei',     next: 'Security review scheduled',             comp: null, risks: [] },
  { id: 'OPP-4620', acct: 'apex',      name: 'Analytics rollout — 4 plants',   amount: 380000, stage: 'Proposal',    prob: 50, close: 'Oct 12', idle: 12, rep: 'Sofia Marchetti', next: 'Pricing workshop with Finance',         comp: PIPE_COMPETITOR, risks: [] },
  { id: 'OPP-4633', acct: 'beacon',    name: 'API Gateway platform deal',      amount: 265000, stage: 'Discovery',   prob: 25, close: 'Dec 18', idle: 8,  rep: 'Tom Bradley',     next: 'Architecture review booked',            comp: null, risks: [] },
  { id: 'OPP-4644', acct: 'cascade',   name: 'Seat expansion — 60 seats',      amount: 190000, stage: 'Negotiation', prob: 65, close: 'Sep 30', idle: 5,  rep: 'Priya Raman',     next: 'Order form with Procurement',           comp: null, risks: [] },
  { id: 'OPP-4655', acct: 'pinnacle',  name: 'Analytics add-on',               amount: 240000, stage: 'Proposal',    prob: 40, close: 'Nov 8',  idle: 18, rep: 'Elena Ruiz',      next: 'Awaiting security questionnaire',       comp: PIPE_COMPETITOR, risks: ['single'] },
  { id: 'OPP-4662', acct: 'vertex',    name: 'Renewal FY27',                   amount: 640000, stage: 'Negotiation', prob: 35, close: 'Nov 6',  idle: 21, rep: 'Marcus Webb',     next: 'Chasing a new exec sponsor',            comp: PIPE_COMPETITOR, risks: ['silent', 'pushed'] },
  { id: 'OPP-4671', acct: 'summit',    name: 'Seat expansion — 40 seats',      amount: 210000, stage: 'Proposal',    prob: 30, close: 'Sep 30', idle: 34, rep: 'Marcus Webb',     next: 'No next step logged',                   comp: null, risks: ['pushed', 'nonext'] },
  { id: 'OPP-4688', acct: 'ashford',  name: 'Analytics platform',             amount: 180000, stage: 'Discovery',   prob: 20, close: 'Dec 20', idle: 29, rep: 'Elena Ruiz',      next: 'One contact engaged',                   comp: null, risks: ['single'] },
  { id: 'OPP-4694', acct: 'quantum',   name: 'API Gateway',                    amount: 95000,  stage: 'Discovery',   prob: 20, close: 'Jan 15', idle: 31, rep: 'Tom Bradley',     next: 'No next step logged',                   comp: null, risks: ['nonext'] },
  { id: 'OPP-4702', acct: 'delphi',    name: 'Platform expansion — 50 seats',  amount: 155000, stage: 'Proposal',    prob: 45, close: 'Oct 30', idle: 9,  rep: 'Sofia Marchetti', next: 'Business case with the CFO',            comp: null, risks: [] },
  { id: 'OPP-4711', acct: 'forge',     name: 'Analytics add-on',               amount: 130000, stage: 'Discovery',   prob: 20, close: 'Jan 22', idle: 14, rep: 'Daniel Osei',     next: 'Discovery call booked',                 comp: null, risks: [] },
];

/* stage totals for the funnel — book-wide $M summing to the open pipeline.
   The conversions are historical, and their product is the win rate. */
const PIPE_FUNNEL = [
  { stage: 'Discovery',   usd: 10.9, conv: 62 },
  { stage: 'Proposal',    usd: 8.3,  conv: 66 },
  { stage: 'Negotiation', usd: 5.4,  conv: 59 },
];

/* movement starts at last quarter's close and lands on the open pipeline */
const PIPE_MOVE = [
  ['Opening',     23.9, 'base'],
  ['Opened',       9.8, 'up'],
  ['Upsized',      0.8, 'up'],
  ['Slipped out', -2.4, 'down'],
  ['Lost',        -1.9, 'down'],
  ['Won',         -5.6, 'down'],
  ['Now',         24.6, 'base'],
];

const APP = defineArtifact({
  id: 'app-pipeline',
  kind: 'app',
  name: 'Pipeline Command',
  ext: 'html',
  sub: 'Interactive',
  quarter: 'Q3 26',
  q: PIPE_Q,
  reps: PIPE_REPS,
  funnel: PIPE_FUNNEL,
  movement: PIPE_MOVE,
  opps: PIPE_OPPS,
});

/* v1 was the strategic and enterprise book, before the whole quarter
   was pulled in */
APP.versions = [
  { when: 'Yesterday · 14:30', by: 'Assistant',
    opps: PIPE_OPPS.filter(o => ['Enterprise', 'Strategic'].includes(PIPE_ACCOUNTS[o.acct].segment)) },
  { when: 'Yesterday · 16:04', by: 'You', opps: PIPE_OPPS },
];

/* What "bring it up to date" means for a pipeline view: two of the six
   deals nobody had marked now have a next step against them, so they come
   off the exposure and the money they carry lands in commit. Two numbers
   in the strip move with them — Commit and Best case — because a version
   you cannot see is not a version. */
const PIPE_MOVED = {
  'OPP-4508': 'Scoping call with Procurement — Thu 11:00',
  'OPP-4688': 'Second contact engaged — Data lead on the call',
};
APP.update = () => {
  /* Off the book as it shipped, never off the current version — otherwise
     a second run adds the same $300k to commit a second time. */
  const opps = PIPE_OPPS.map(o =>
    PIPE_MOVED[o.id] ? { ...o, next: PIPE_MOVED[o.id], risks: [], idle: 1 } : o);
  const freed = PIPE_OPPS
    .filter(o => PIPE_MOVED[o.id])
    .reduce((sum, o) => sum + o.amount, 0) / 1e6;
  const base = PIPE_Q;
  const commitOpen = Math.round((base.commitOpen + freed) * 10) / 10;
  const commit = Math.round((base.closed + commitOpen) * 10) / 10;
  return { opps, q: { ...base, commitOpen, commit,
    best: Math.round((commit + base.bestOpen) * 10) / 10,
    gap:  Math.round((base.quota - commit) * 10) / 10 } };
};

/* Taken once, before anything can have changed it. */
for (const a of Object.values(ARTIFACTS)) {
  if (a.versions) a.seed = JSON.parse(JSON.stringify(a.versions));
}

/* ── the palette the app reasons in ─────────────────────────
   Colour carries meaning here — green is booked, blue is forecast,
   coral is exposure — so these are the app's own, not the workspace's. */
const PC = {
  blue: '#2F6FDB', blueSoft: '#8FB0E8', green: '#0F8A5F', coral: '#C2543A',
  purple: '#6B5AA6', gold: '#D99214',
  good: '#2F9E5A', warn: '#D99214', bad: '#C0492F',
};
const PC_BAND = { good: PC.good, warn: PC.warn, bad: PC.bad };

/* ── chart primitives ───────────────────────────────────────── */
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const k of kids.flat()) if (k) el.append(k);
  return el;
};
const txt = (s) => document.createTextNode(String(s));

const usdM = (n) => '$' + (Math.abs(n) >= 100 ? Math.round(n) : n.toFixed(1)) + 'M';
const fmtUSD = (n) => {
  const x = Math.abs(n);
  if (x >= 1e6) return '$' + (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (x >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
};

/* the quarter as one bar: what is banked, what is committed, what is hoped
   for — and the quota cutting across all three */
function quotaBar(q, { w = 620, h = 116 } = {}) {
  const padL = 6, padR = 6, top = 26, bh = 38;
  const max = 12.4;
  const X = (v) => padL + (v / max) * (w - padL - padR);
  const seg = (from, to, fill, opacity, r) => {
    const x = X(from), width = Math.max(0, X(to) - X(from));
    return sv('rect', { x, y: top, width, height: bh, fill, opacity,
                        rx: r ? 5 : 0, ry: r ? 5 : 0 });
  };

  const ticks = [0, 2, 4, 6, 8, 10, 12];
  return sv('svg', { viewBox: `0 0 ${w} ${h}`, class: 'pc-svg', role: 'img',
                     'aria-label': `Forecast against quota: commit ${usdM(q.commit)} of ${usdM(q.quota)}` },
    ticks.map(t => sv('line', { x1: X(t), x2: X(t), y1: top - 8, y2: top + bh + 8,
                                stroke: 'var(--line-soft)', 'stroke-width': 1 })),
    ticks.map(t => sv('text', { x: X(t), y: top + bh + 24, 'text-anchor': 'middle',
                                class: 'pc-axis' }, txt(`$${t}M`))),
    /* rounded ends come from a full-width rounded plate the segments sit on */
    sv('clipPath', { id: 'pcQuotaClip' },
       sv('rect', { x: X(0), y: top, width: X(q.best) - X(0), height: bh, rx: 6, ry: 6 })),
    sv('g', { 'clip-path': 'url(#pcQuotaClip)' },
      seg(0, q.closed, PC.green, .82),
      seg(q.closed, q.commit, PC.blue, .74),
      seg(q.commit, q.best, PC.blue, .3)),
    sv('line', { x1: X(q.quota), x2: X(q.quota), y1: top - 14, y2: top + bh + 10,
                 stroke: PC.coral, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }),
    sv('text', { x: X(q.quota) - 7, y: top - 4, 'text-anchor': 'end', class: 'pc-quota' },
       txt(`Quota ${usdM(q.quota)}`)),
  );
}

/* the funnel, as a funnel — each stage a band whose width is its share */
function funnelChart(stages, { w = 440, h = 210, active = 'all', onPick } = {}) {
  const gap = 4, bandH = (h - gap * (stages.length - 1)) / stages.length;
  const wide = w * 0.98, narrow = w * 0.4;
  const at = (i) => wide - (wide - narrow) * (i / stages.length);

  return sv('svg', { viewBox: `0 0 ${w} ${h}`, class: 'pc-svg pc-funnel', role: 'img' },
    stages.map((f, i) => {
      const y = i * (bandH + gap);
      const tw = at(i), bw = at(i + 1);
      const dim = active !== 'all' && active !== f.stage;
      const g = sv('g', { class: 'pc-band', 'data-dim': String(dim),
                          role: onPick ? 'button' : null, tabindex: onPick ? '0' : null },
        sv('path', {
          d: `M${(w - tw) / 2} ${y} H${(w + tw) / 2} L${(w + bw) / 2} ${y + bandH} `
           + `H${(w - bw) / 2} Z`,
          fill: PC.blue, opacity: 0.62 - i * 0.13,
          stroke: '#fff', 'stroke-width': 1.5,
        }),
        sv('text', { x: w / 2, y: y + bandH / 2 + 4, 'text-anchor': 'middle', class: 'pc-band-l' },
           txt(`${f.stage}   ${usdM(f.usd)}`)),
        sv('title', {}, txt(`${f.stage} — ${usdM(f.usd)} open`)));
      if (onPick) {
        g.addEventListener('click', () => onPick(active === f.stage ? 'all' : f.stage));
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(active === f.stage ? 'all' : f.stage); }
        });
      }
      return g;
    }));
}

/* where the quarter went: a waterfall from last close to today's book */
function waterfall(rows, { w = 900, h = 250 } = {}) {
  const padL = 46, padR = 12, padT = 16, padB = 30;
  const max = 36;
  const bw = (w - padL - padR) / rows.length;
  const Y = (v) => h - padB - (v / max) * (h - padT - padB);

  let run = 0;
  const bars = rows.map(([label, v, kind], i) => {
    const x = padL + i * bw + bw * 0.24, width = bw * 0.52;
    let y0, y1, fill, opacity;
    if (kind === 'base')   { run = Math.abs(v); y0 = Y(run); y1 = Y(0); fill = 'var(--text)'; opacity = .3; }
    else if (v >= 0)       { y0 = Y(run + v); y1 = Y(run); run += v; fill = PC.green; opacity = .7; }
    else                   { y0 = Y(run); y1 = Y(run + v); run += v; fill = PC.coral; opacity = .7; }
    /* a base column is the whole bar; a delta is only its own slice */
    const height = Math.max(3, y1 - y0);
    return { label, v, x, width, y: y0, height, fill, opacity, top: y0 };
  });

  const ticks = [0, 10, 20, 30, 36];
  return sv('svg', { viewBox: `0 0 ${w} ${h}`, class: 'pc-svg', role: 'img',
                     'aria-label': 'Pipeline movement across the quarter' },
    ticks.map(t => sv('line', { x1: padL, x2: w - padR, y1: Y(t), y2: Y(t),
                                stroke: 'var(--line-soft)', 'stroke-width': 1 })),
    ticks.map(t => sv('text', { x: padL - 8, y: Y(t) + 3.5, 'text-anchor': 'end', class: 'pc-axis' },
                      txt(`$${t}M`))),
    bars.slice(0, -1).map((b, i) => sv('line', {
      x1: b.x, x2: bars[i + 1].x + bars[i + 1].width,
      y1: rows[i][2] === 'down' ? b.y + b.height : b.y,
      y2: rows[i][2] === 'down' ? b.y + b.height : b.y,
      stroke: 'var(--line)', 'stroke-width': 1, 'stroke-dasharray': '3 3',
    })),
    bars.map(b => sv('g', {},
      sv('rect', { x: b.x, y: b.y, width: b.width, height: b.height, rx: 3,
                   fill: b.fill, opacity: b.opacity }),
      sv('text', { x: b.x + b.width / 2, y: b.top - 7, 'text-anchor': 'middle', class: 'pc-bar-v' },
         txt(b.v >= 0 ? usdM(b.v) : '−' + usdM(Math.abs(b.v)))),
      sv('title', {}, txt(`${b.label} · ${b.v >= 0 ? '+' : '−'}${usdM(Math.abs(b.v))}`)))),
    rows.map(([label], i) => sv('text', {
      x: padL + i * bw + bw / 2, y: h - 9, 'text-anchor': 'middle', class: 'pc-axis',
    }, txt(label))),
  );
}

function sparkline(pts, color) {
  const w = 100, h = 24, max = Math.max(...pts), min = Math.min(...pts), span = (max - min) || 1;
  const d = pts.map((v, i) =>
    `${i ? 'L' : 'M'}${(i / (pts.length - 1)) * w} ${h - ((v - min) / span) * (h - 5) - 2.5}`).join(' ');
  return sv('svg', { viewBox: `0 0 ${w} ${h}`, class: 'pc-spark' },
    sv('path', { d, fill: 'none', stroke: color, 'stroke-width': 1.8,
                 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

function renderApp(a) {
  const opps = bodyOf(a, 'opps');
  const q = bodyOf(a, 'q');
  /* A heading is text, and a comment asking for different text should
     change the text and nothing else. Versions carry the renames as a
     map so the numbers underneath stay exactly as they were. */
  const labels = bodyOf(a, 'labels') || {};
  const L = (t) => labels[t] || t;
  const open = opps.filter(o => PIPE_OPEN.includes(o.stage));
  const atRisk = open.filter(o => o.risks.length).sort((x, y) => y.idle - x.idle);
  const atRiskUsd = atRisk.reduce((s, o) => s + o.amount, 0);
  const repQuota = a.reps.reduce((s, r) => s + r.quota, 0);
  const repPipeline = a.reps.reduce((s, r) => s + r.pipeline, 0);
  const repSlipping = a.reps.reduce((s, r) => s + r.slipping, 0);
  const funnelTotal = Math.round(a.funnel.reduce((s, f) => s + f.usd, 0) * 10) / 10;

  let stage = 'all';           // which stage the deals table is scoped to
  let sortBy = 'attain';       // how the leaderboard is ordered

  const kept = () => (stage === 'all' ? open
    : stage === 'risk' ? atRisk
    : open.filter(o => o.stage === stage));

  /* ── shells ── */
  const card = (rawTitle, right, { accent, wide, cls } = {}) => {
    const title = L(rawTitle);
    const el = h('div', {
      class: 'pc-card' + (wide ? ' pc-wide' : '') + (cls ? ' ' + cls : ''),
      style: accent ? `--accent:${accent}` : null,
      'data-accent': accent ? 'true' : null,
      'data-title': rawTitle,
    },
      h('div', { class: 'pc-card-head' },
        h('span', { class: 'pc-card-t', style: accent ? `color:${accent}` : null }, title),
        right ? h('span', { class: 'pc-card-r' }, right) : null));
    return el;
  };
  const note = (...kids) => h('p', { class: 'pc-note' }, ...kids);
  const b = (s, color) => h('b', { style: color ? `color:${color}` : null }, s);

  const kpi = (label, value, foot, tone) => h('div', { class: 'pc-kpi', 'data-title': label },
    h('span', { class: 'pc-kpi-l' }, L(label)),
    h('span', { class: 'pc-kpi-v' }, value),
    foot ? h('span', { class: 'pc-kpi-f', style: tone ? `color:${tone}` : null }, foot) : null);

  const chip = (label, tone) => h('span', { class: 'pc-chip', 'data-tone': tone }, label);

  /* ── the strip ── */
  const kpis = h('div', { class: 'pc-kpis' },
    kpi('Commit',    usdM(q.commit), `${usdM(q.gap)} short of quota`, PC.bad),
    kpi('Best case', usdM(q.best),   `${usdM(q.bestOpen)} of upside on commit`),
    kpi('Quota',     usdM(q.quota),  `${q.elapsedPct}% of the quarter elapsed`),
    kpi('Coverage',  `${q.coverage}x`, `${usdM(q.pipeline)} open pipeline`),
    kpi('Avg cycle', `${q.cycleDays} days`, '▲ 4 days vs last quarter', PC.bad));
    /* Five, not six. The sixth wrapped onto a row of its own and left the
       strip looking broken; the win rate is already read out under the
       funnel, which is where it is derived. */

  /* ── forecast against quota ── */
  const forecast = card('Forecast against quota',
    h('span', { style: `color:${PC.coral}` }, `${usdM(q.gap)} gap on commit`));
  forecast.append(
    quotaBar(q),
    h('div', { class: 'pc-trio' },
      [['Closed won', usdM(q.closed), PC.green],
       ['Commit', usdM(q.commit), PC.blue],
       ['Best case', usdM(q.best), PC.blueSoft]].map(([l, v, c]) =>
        h('div', { class: 'pc-tile' },
          h('span', { class: 'pc-tile-l' }, l),
          h('span', { class: 'pc-tile-v', style: `color:${c}` }, v)))),
    note('Commit lands ', b(usdM(q.gap), PC.coral), ' under quota with ',
      `${100 - q.elapsedPct}% of the quarter left. That gap is well inside the `,
      b(fmtUSD(atRiskUsd)), ` sitting in the ${atRisk.length} deals below — none of `,
      'which are forecast in commit today.'));

  /* ── the funnel ── */
  const funnelCard = card('Open pipeline by stage',
    h('span', { class: 'pc-mono' }, usdM(funnelTotal)));
  const funnelSlot = h('div', {});
  const convRow = h('div', { class: 'pc-conv' }, a.funnel.map((f, i) =>
    h('span', { class: 'pc-conv-i' },
      h('span', { class: 'pc-conv-v', style: `color:${f.conv >= 62 ? PC.green : PC.gold}` }, `${f.conv}%`),
      h('span', { class: 'pc-conv-l' },
        `${f.stage} → ${i < a.funnel.length - 1 ? a.funnel[i + 1].stage : 'Won'}`))));
  funnelCard.append(funnelSlot, convRow,
    note('62% × 66% × 59% compounds to the ', b(`${q.winRate}%`), ' win rate. Proposal → ',
      'Negotiation is where the quarter is actually being lost — ',
      b(String(atRisk.filter(o => o.stage === 'Proposal').length)), ' of the ',
      `${atRisk.length} at-risk deals are stuck there.`));

  /* ── movement ── */
  const move = card('Pipeline movement · quarter to date', null, { wide: true });
  move.append(waterfall(a.movement),
    note(usdM(9.8) + ' opened and ' + usdM(0.8) + ' was upsized, but ' + usdM(2.4)
       + ' slipped out of the quarter and ' + usdM(1.9) + ' was lost — one of the losses '
       + `went to ${PIPE_COMPETITOR}. Net, the book is up ` , b(usdM(0.7)), ' on where it opened.'));

  /* ── the leaderboard ── */
  const leaderboard = card('Rep leaderboard',
    h('span', { class: 'pc-mono' },
      `${fmtUSD(repQuota)} quota · ${fmtUSD(repPipeline)} pipeline · ${repSlipping} slipping`),
    { wide: true });
  const repSlot = h('div', {});
  leaderboard.append(repSlot,
    note('Nobody is at pace. Marcus Webb carries the thinnest coverage at ',
      b(`${a.reps.find(r => r.name === 'Marcus Webb').coverage}x`),
      ' and the most slipping deals — both of his at-risk opportunities sit on accounts '
      + 'scoring below 60 health.'));

  const repTable = () => {
    const rows = [...a.reps].sort((x, y) =>
      sortBy === 'coverage' ? y.coverage - x.coverage
      : sortBy === 'slipping' ? y.slipping - x.slipping
      : y.attain - x.attain);
    const th = (label, key, right) => h('span', {
      class: (right ? 'pc-r ' : '') + (key ? 'pc-sort' : '') + (sortBy === key ? ' is-on' : ''),
      onclick: key ? () => { sortBy = key; repSlot.replaceChildren(repTable()); } : null,
    }, label);

    return h('div', { class: 'pc-table pc-table-reps' },
      h('div', { class: 'pc-tr pc-th' },
        th('Rep'), th('Quota', null, true),
        th(`Attainment vs ${q.elapsedPct}% pace`, 'attain'),
        th('Coverage', 'coverage', true), th('Slipping', 'slipping', true), th('Trend', null, true)),
      rows.map(r => {
        const c = r.attain >= q.elapsedPct ? PC.good : r.attain >= 60 ? PC.warn : PC.bad;
        return h('div', { class: 'pc-tr' },
          h('span', { class: 'pc-strong' }, r.name),
          h('span', { class: 'pc-r pc-mono' }, fmtUSD(r.quota)),
          h('span', { class: 'pc-attain' },
            h('span', { class: 'pc-mono pc-attain-v', style: `color:${c}` }, `${r.attain}%`),
            h('span', { class: 'pc-bar' },
              h('span', { class: 'pc-bar-f', style: `--w:${r.attain}%;--c:${c}` }),
              h('span', { class: 'pc-bar-t', style: `--t:${q.elapsedPct}%` }))),
          h('span', { class: 'pc-r pc-mono', style: r.coverage < 2.7 ? `color:${PC.warn}` : null },
            `${r.coverage.toFixed(1)}x`),
          h('span', { class: 'pc-r pc-mono',
                      style: `color:${r.slipping >= 4 ? PC.bad : r.slipping >= 2 ? PC.warn : 'var(--text-faint)'}` },
            String(r.slipping)),
          h('span', { class: 'pc-r pc-sparkcell' }, sparkline(r.trend, c)));
      }));
  };

  /* ── the deals, and why the graph flagged them ── */
  const dealsCard = card('Deals at risk',
    h('span', { style: `color:${PC.coral}` }, `${fmtUSD(atRiskUsd)} exposed`),
    { wide: true, accent: PC.coral, cls: 'pc-flag' });
  const filterRow = h('div', { class: 'chips pc-filters' },
    [['risk', 'At risk'], ['all', 'All open'], ...PIPE_OPEN.map(s => [s, s])].map(([v, l]) =>
      h('button', {
        class: 'chip', type: 'button', 'data-val': v, 'aria-pressed': String(v === stage),
        onclick: () => setStage(v),
      }, l)));
  const count = h('span', { class: 'pc-count' });
  const dealSlot = h('div', {});
  dealsCard.append(
    h('div', { class: 'pc-filter-row' }, filterRow, count),
    dealSlot,
    h('div', { class: 'pc-derived' },
      h('div', { class: 'pc-derived-t' }, 'What the graph flagged, and why'),
      h('div', { class: 'pc-derived-b' },
        [['Pipeline Health',
          `${atRisk.length} open deals score below 0.4 — every one has no logged next step, `
          + 'a single thread, or a silent champion'],
         ['Champion silent',
          'Orion’s Maya Chen has not replied in 34 days while a Sev-2 has been open 9 — the '
          + fmtUSD(opps.filter(o => o.acct === 'orion' && PIPE_OPEN.includes(o.stage))
              .reduce((s, o) => s + o.amount, 0))
          + ' it has open across '
          + opps.filter(o => o.acct === 'orion' && PIPE_OPEN.includes(o.stage)).length
          + ' deals is all exposed to it'],
         ['Competitive',
          `${PIPE_COMPETITOR} is present on ${opps.filter(o => o.comp).length} opportunities and `
          + 'already took one deal off Ashford this year']].map(([sig, text]) =>
          h('div', {}, h('b', {}, sig), ' — ', text))),
      h('div', { class: 'pc-derived-n' },
        `Recomputed nightly from ${PIPE_SOURCES.slice(0, 5).join(', ')} and `
        + `${PIPE_SOURCES.length - 5} more sources.`)));

  const dealTable = () => {
    const rows = kept();
    if (!rows.length) return h('p', { class: 'pc-empty' }, 'Nothing open in this stage.');
    return h('div', { class: 'pc-table pc-table-deals' },
      h('div', { class: 'pc-tr pc-th' },
        h('span', {}, 'Opportunity'), h('span', {}, 'Account'),
        h('span', { class: 'pc-r' }, 'Amount'), h('span', {}, 'Stage'),
        h('span', { class: 'pc-r' }, 'Idle'), h('span', {}, 'Why')),
      rows.map(o => {
        const acct = PIPE_ACCOUNTS[o.acct];
        return h('div', { class: 'pc-tr', title: o.next },
          h('span', { class: 'pc-deal' },
            h('span', { class: 'pc-strong' }, o.name),
            h('span', { class: 'pc-id' }, o.id)),
          h('span', { class: 'pc-acct' },
            h('i', { class: 'pc-dot', style: `background:${PC_BAND[acct.band]}` }), acct.name),
          h('span', { class: 'pc-r pc-mono pc-strong' }, fmtUSD(o.amount)),
          h('span', { class: 'pc-muted' }, o.stage),
          h('span', { class: 'pc-r pc-mono',
                      style: `color:${o.idle >= 28 ? PC.bad : o.idle >= 14 ? PC.warn : 'var(--text-faint)'}` },
            `${o.idle}d`),
          h('span', { class: 'pc-why' },
            o.risks.map(k => chip(PIPE_RISKS[k], k === 'nonext' ? 'risk' : k === 'silent' ? 'warn' : 'sig')),
            o.comp ? chip(o.comp, 'info') : null));
      }));
  };

  function setStage(v) {
    stage = v;
    for (const el of filterRow.children) el.setAttribute('aria-pressed', String(el.dataset.val === v));
    funnelSlot.replaceChildren(funnelChart(a.funnel, { active: PIPE_OPEN.includes(v) ? v : 'all', onPick: setStage }));
    dealSlot.replaceChildren(dealTable());
    const rows = kept();
    count.textContent = `${rows.length} of ${open.length} open · `
      + fmtUSD(rows.reduce((s, o) => s + o.amount, 0)) + ' in view';
  }

  setStage('risk');
  repSlot.replaceChildren(repTable());

  /* ── refresh ──────────────────────────────────────────────
     A deck is finished when it is written; a live page is only ever as
     good as its last sync, so this one gets the control the other kinds
     have no use for. It re-reads the book, and the footer says when it
     last did — a dashboard that will not tell you how old it is cannot
     be trusted with a forecast. */
  let syncedMin = 4, syncing = false;
  const syncLine = h('span', { class: 'pc-sync' },
    h('i', { class: 'pc-sync-dot', 'aria-hidden': 'true' }),
    h('span', { class: 'pc-sync-t' }));

  const paintSync = () => {
    syncLine.querySelector('.pc-sync-t').textContent = syncing
      ? 'Syncing…'
      : syncedMin === 0
        ? 'Live · synced just now'
        : `Live · synced ${syncedMin} min ago`;
    syncLine.dataset.busy = String(syncing);
  };
  paintSync();

  const refreshBtn = h('button', {
    class: 'icon-btn icon-btn-canvas pc-refresh', type: 'button',
    'aria-label': 'Refresh the data', title: 'Refresh the data',
    html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
        + 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
        + 'stroke-linejoin="round"><path d="M20 11.5a8 8 0 1 0-.9 4.6"/>'
        + '<path d="M20 4.5v6h-6"/></svg>',
    onclick: () => {
      if (syncing) return;
      syncing = true;
      refreshBtn.dataset.spin = 'true';
      refreshBtn.setAttribute('aria-busy', 'true');
      paintSync();
      setTimeout(() => {
        syncing = false;
        syncedMin = 0;
        refreshBtn.dataset.spin = 'false';
        refreshBtn.removeAttribute('aria-busy');
        setStage(stage);
        repSlot.replaceChildren(repTable());
        paintSync();
        toast(`Refreshed from ${PIPE_SOURCES.length} sources.`);
      }, 900);
    },
  });

  const root = h('div', { class: 'appview pc' },
    h('div', { class: 'app-head' },
      h('div', { class: 'app-kicker' }, 'GTM Enterprise Context Graph'),
      h('h2', { class: 'app-title' }, 'Pipeline Command'),
      h('p', { class: 'app-lede' },
        `${a.quarter} · ${a.reps.length} reps · ${usdM(q.pipeline)} open across `
        + `${open.length} tracked opportunities. Pick a stage and the funnel and the deal `
        + 'list move together.')),
    kpis,
    h('div', { class: 'pc-grid' }, forecast, funnelCard, move, leaderboard, dealsCard));

  return { body: root, foot: syncLine, extras: [refreshBtn] };
}

/* ── one slide ── */
function slideEl(s, n, total, { thumb = false, onEdit } = {}) {
  const cover = n === 0;
  const ed = (cls, get, set, tag = 'div') => h(tag, {
    class: cls,
    contenteditable: thumb ? null : 'true',
    spellcheck: 'false',
    oninput: thumb ? null : (e) => { set(e.currentTarget.textContent); onEdit?.(); },
    onkeydown: thumb ? null : (e) => { if (e.key === 'Escape') e.currentTarget.blur(); },
  }, get());

  return h('div', {
    class: 'slide' + (cover ? ' slide-cover' : '') + (thumb ? ' slide-thumb' : ''),
    'data-n': thumb ? null : String(n),
  },
    h('div', { class: 'slide-inner' },
      cover ? null : ed('slide-kicker', () => s.kicker, v => s.kicker = v),
      ed('slide-title', () => s.title, v => s.title = v, 'h2'),
      cover
        ? ed('slide-lede', () => s.bullets[0], v => s.bullets[0] = v, 'p')
        : h('ul', { class: 'slide-bullets' }, s.bullets.map((b, j) => h('li', {
            contenteditable: thumb ? null : 'true',
            spellcheck: 'false',
            oninput: thumb ? null : (e) => { s.bullets[j] = e.currentTarget.textContent; onEdit?.(); },
          }, b))),
      cover ? h('div', { class: 'slide-foot' }, 'UnifyApps  |  Board briefing  |  Q4 FY26') : null,
    ),
    thumb ? null : h('span', { class: 'slide-badge' }, `${n + 1} / ${total}`),
  );
}

/* ══════════════════ DECK VIEWER ══════════════════
   Reading and editing are the same surface — the text is live, and
   full screen simply gives it the room and the tools.               */
function renderDeck(a) {
  const deck = { ...a, slides: bodyOf(a, 'slides') };
  let zoom = 100, cur = 0;


  const scroller = h('div', { class: 'deck-scroll' });
  const strip = h('div', { class: 'deck-strip' });
  const counter = h('span', { class: 'deck-count' }, `1 / ${deck.slides.length}`);

  let slides = [];

  /* ── filmstrip ── */
  const paintStrip = () => {
    strip.replaceChildren(
      ...deck.slides.map((s, n) => h('button', {
        class: 'deck-thumb', type: 'button', 'aria-label': `Slide ${n + 1}`,
        'data-thumb': String(n), 'aria-current': String(n === cur),
        onclick: () => goTo(n),
      },
        h('span', { class: 'deck-thumb-n' }, String(n + 1)),
        slideEl(s, n, deck.slides.length, { thumb: true }),
      )),
    );
  };

  /* ── the reel ── */
  const paintReel = () => {
    slides = deck.slides.map((s, n) =>
      slideEl(s, n, deck.slides.length, { onEdit: paintStrip }));
    scroller.replaceChildren(h('div', { class: 'deck-reel' }, slides));
    seen.disconnect();
    slides.forEach(el => seen.observe(el));
  };

  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const n = +e.target.dataset.n;
      if (n === cur) continue;
      cur = n;
      counter.textContent = `${cur + 1} / ${deck.slides.length}`;
      for (const t of strip.querySelectorAll('.deck-thumb')) {
        t.setAttribute('aria-current', String(+t.dataset.thumb === cur));
      }
    }
  }, { root: scroller, threshold: 0.55 });

  const paintAll = () => { paintReel(); paintStrip(); };

  const goTo = (n) => {
    cur = Math.max(0, Math.min(deck.slides.length - 1, n));
    slides[cur]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const setZoom = (z) => {
    zoom = z;
    scroller.style.setProperty('--zoom', String(z / 100));
    zoomBtn.firstChild.textContent = z + '%';
  };

  const onKey = (e) => {
    if (e.target.isContentEditable || e.target.closest('textarea, input, select')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(cur + 1); }
    if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); goTo(cur - 1); }
  };

  const chrome = (d, label, run, extra) => h('button', {
    class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': label, title: label,
    onclick: run,
    html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>',
  }, extra);

  /* the caret had been promising a menu while the button cycled
     75 → 100 → 125, so you could not get to a level except by passing
     through the others */
  const ZOOMS = [50, 75, 100, 125, 150, 200];
  const zoomBtn = h('button', {
    class: 'deck-zoom', type: 'button', 'aria-label': 'Zoom',
    'aria-haspopup': 'menu', 'aria-expanded': 'false',
    onclick: (e) => {
      e.stopPropagation();
      pickerMenu(e.currentTarget, ZOOMS.map(z => ({ value: z, label: z + '%' })), zoom, setZoom);
    },
  }, '100%', h('span', { class: 'caret', 'aria-hidden': 'true' }));

  const body = h('div', { class: 'deck-body', 'data-strip': 'closed' }, strip, scroller);

  const stripBtn = chrome(
    '<rect x="3" y="4.5" width="6" height="15" rx="1.5"/><rect x="11.5" y="4.5" width="9.5" height="15" rx="1.5"/>',
    'Show slide list',
    () => {
      const on = body.dataset.strip !== 'open';
      body.dataset.strip = on ? 'open' : 'closed';
      stripBtn.setAttribute('aria-pressed', String(on));
    });
  stripBtn.setAttribute('aria-pressed', 'false');

  paintAll();
  setZoom(100);

  return {
    body, foot: counter, onKey,
    onClose: () => seen.disconnect(),
    /* full screen is where this stops being a preview and becomes an editor */
    onExpand: (on) => {
      body.dataset.strip = on ? 'open' : 'closed';
      body.dataset.editor = String(on);
      stripBtn.setAttribute('aria-pressed', String(on));
    },
    lead: [stripBtn],
    extras: [zoomBtn],
  };
}


/* ── export ──────────────────────────────────────────────────
   Destination first, not format first. What people actually decide is
   *where the work goes next* — a deck they will edit with colleagues
   belongs in Slides; the .pptx is a file you download when you need a
   file. So the primary action is the live destination for this kind,
   and everything else sits one click under it, grouped by what it does
   and labelled with what you get.                                   */

const BRAND_IC = {
  /* A file, with a folded corner — the shape does the work at 16px and the
     colour separates them. PDF red, CSV slate; the clipboard is a line glyph
     rather than a tile, because copying is an action, not a format. */
  pdf:    '<path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#D93025"/>'
        + '<path d="M14 2l6 6h-4.5A1.5 1.5 0 0 1 14 6.5z" fill="#9E1B12"/>'
        + '<rect x="6.5" y="12" width="11" height="7" rx="1.4" fill="#fff"/>'
        + '<path d="M8.6 13.6h1.7a1.35 1.35 0 0 1 0 2.7H8.6zm0 2.7v1.2" stroke="#D93025" '
        + 'stroke-width="1.15" fill="none" stroke-linecap="round"/>'
        + '<path d="M12.6 13.6v3.9h1.2a1.6 1.6 0 0 0 1.6-1.6v-.7a1.6 1.6 0 0 0-1.6-1.6z" fill="#D93025"/>',

  csv:    '<path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#5F6F63"/>'
        + '<path d="M14 2l6 6h-4.5A1.5 1.5 0 0 1 14 6.5z" fill="#3F4B43"/>'
        + '<g fill="#fff">'
        + '<rect x="6.6" y="11.4" width="4.6" height="2.4" rx=".6"/>'
        + '<rect x="12.8" y="11.4" width="4.6" height="2.4" rx=".6"/>'
        + '<rect x="6.6" y="15.2" width="4.6" height="2.4" rx=".6" opacity=".65"/>'
        + '<rect x="12.8" y="15.2" width="4.6" height="2.4" rx=".6" opacity=".65"/></g>',

  clipboard:
          '<rect x="8.5" y="7.5" width="12" height="14" rx="2.5" fill="none" '
        + 'stroke="currentColor" stroke-width="1.6"/>'
        + '<path d="M15.5 4.5H5.8A1.8 1.8 0 0 0 4 6.3V16" fill="none" '
        + 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',

  gslides:'<rect x="3" y="2.5" width="18" height="19" rx="2.5" fill="#F5B400"/>'
        + '<rect x="6.5" y="8" width="11" height="8" rx="1.2" fill="#fff"/>',
  gsheets:'<rect x="3" y="2.5" width="18" height="19" rx="2.5" fill="#11A15F"/>'
        + '<path d="M7 9.5h10M7 13h10M12 9.5V17" stroke="#fff" stroke-width="1.4" fill="none"/>',
  html:   '<rect x="2.5" y="4" width="19" height="16" rx="2.5" fill="#0D1F16"/>'
        + '<path d="M9.5 9.5 6.5 12l3 2.5M14.5 9.5l3 2.5-3 2.5" stroke="#E3D8C2" '
        + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
};

/* Brand marks that arrived as real files. Anything listed here wins over the
   drawn fallback in BRAND_IC — add a file, add a line. */
const BRAND_ART = {
  gdocs: 'assets/brand/gdocs.svg',
  gmail: 'assets/brand/gmail.svg',
  outlook: 'assets/brand/outlook.svg',
  slack: 'assets/brand/slack.svg',
  sharepoint: 'assets/brand/sharepoint.svg',
  pptx: 'assets/brand/powerpoint.svg',
  xlsx: 'assets/brand/excel.svg',
  docx: 'assets/brand/word.svg',
};

const brandMark = (k) => BRAND_ART[k]
  ? `<img src="${BRAND_ART[k]}" alt="" aria-hidden="true">`
  : `<svg viewBox="0 0 24 24" aria-hidden="true">${BRAND_IC[k] || BRAND_IC.pdf}</svg>`;

/* What each row does when you click it. Not "best for" — a menu of
   trade-offs makes you weigh things; a menu of outcomes lets you pick.
   `noun` is the artifact's own word, so the line reads as a sentence. */
const NOUN = { deck: 'deck', sheet: 'spreadsheet', doc: 'document', app: 'page',
               chat: 'chat', mail: 'email' };

const DEST = {
  gslides:    { label: 'Google Slides', does: n => `Exports a copy of the ${n} to your Google Drive` },
  gsheets:    { label: 'Google Sheets', does: n => `Exports a copy of the ${n} to your Google Drive` },
  gdocs:      { label: 'Google Docs',   does: n => `Exports a copy of the ${n} to your Google Drive` },
  sharepoint: { label: 'SharePoint',    does: n => `Exports a copy of the ${n} to SharePoint` },
  pptx:       { label: 'PowerPoint', ext: '.pptx', does: () => 'Downloads a file you can open in PowerPoint or Keynote' },
  xlsx:       { label: 'Excel',      ext: '.xlsx', does: () => 'Downloads a file you can open in Excel or Numbers' },
  docx:       { label: 'Word',       ext: '.docx', does: () => 'Downloads a file you can open in Word or Pages' },
  csv:        { label: 'CSV',        ext: '.csv',  does: () => 'Downloads a plain file for anything that takes CSV' },
  pdf:        { label: 'PDF',        ext: '.pdf',  does: n => `Downloads the ${n} as a PDF` },
  html:       { label: 'HTML',       ext: '.html', does: () => 'Downloads a self-contained file, filters intact' },
  clipboard:  { label: 'Copy to clipboard',
                does: n => n === 'spreadsheet'
                  ? 'Copies the table so you can paste it straight in'
                  : 'Copies the text so you can paste it straight in' },
  slack:      { label: 'Slack',      does: n => `Posts the ${n} to a channel` },
  gmail:      { label: 'Gmail',      does: n => n === 'email'
                  ? 'Opens this draft in Gmail'
                  : `Starts an email with the ${n} attached` },
  outlook:    { label: 'Outlook',    does: n => n === 'email'
                  ? 'Opens this draft in Outlook'
                  : `Starts an email with the ${n} attached` },
};

/* The primary is the artifact's own application, so the mark in the header is
   the same mark as on the card in the conversation — a DOCX opens in Word.
   The Google and Microsoft destinations lead the dropdown, one click away. */
const EXPORT = {
  deck: {
    primary: 'pptx',
    open:     ['gslides', 'sharepoint'],
    download: ['pptx', 'pdf'],
  },
  sheet: {
    primary: 'xlsx',
    open:     ['gsheets', 'sharepoint'],
    download: ['xlsx', 'csv', 'pdf'],
    copy:     ['clipboard'],
  },
  doc: {
    primary: 'docx',
    open:     ['gdocs', 'sharepoint'],
    download: ['docx', 'pdf'],
    copy:     ['clipboard'],
  },
  app: {
    primary: 'html',
    download: ['html', 'pdf'],
  },
  /* a draft's own application is the mailbox it will be sent from */
  mail: {
    primary: 'outlook',
    /* Outlook leads the list as well as the button — a menu that omits
       the thing you are already on makes you check which one you picked */
    open:     ['outlook', 'gmail'],
    /* Copy is its own button three inches to the left; listing it here as
       well makes the menu look longer than it is. */
  },
};

/* Copying is the one export a browser can genuinely do, so it does it rather
   than promising to. A sheet pastes as TSV, which is what spreadsheets read;
   a document pastes as plain text with its headings and bullets intact. */
const stripTags = (v) => {
  const d = document.createElement('div');
  d.innerHTML = v;
  return d.textContent.replace(/\s+/g, ' ').trim();
};

function copyArtifact(a) {
  let text, said;

  if (a.kind === 'sheet') {
    const sh = bodyOf(a, 'sheets')[0];
    text = [sh.cols, ...sh.rows].map(r => r.join('\t')).join('\n');
    said = `Copied ${sh.rows.length} rows from ${sh.name}.`;
  } else if (a.kind === 'doc') {
    const blocks = bodyOf(a, 'blocks');
    text = blocks.map(b =>
      b.t === 'ul' ? b.v.map(x => '• ' + stripTags(x)).join('\n')
      : b.t === 'quote' ? '“' + stripTags(b.v) + '”'
      : stripTags(b.v)).join('\n\n');
    said = `Copied ${blocks.length} blocks.`;
  } else {
    return toast('Copying comes in the next pass.');
  }

  navigator.clipboard?.writeText(text).then(
    () => toast(said), () => toast('Could not reach the clipboard.'));
}


/* ── a small dropdown for controls that live in the chrome ────
   The publish dialog's dropdown is bound to that dialog's state. This is
   the same card and the same rows for the controls outside it, where the
   options are one word each and there is nothing to explain. */
let openPicker = null;
const closePicker = () => {
  openPicker?.el.remove();
  openPicker?.btn.setAttribute('aria-expanded', 'false');
  openPicker = null;
};

function pickerMenu(btn, items, current, onPick) {
  if (openPicker?.btn === btn) return closePicker();
  closePicker();
  btn.setAttribute('aria-expanded', 'true');

  const rows = items.map(it => h('button', {
    class: 'dd-opt dd-opt-tight' + (it.value === current ? ' is-on' : ''),
    type: 'button', role: 'menuitemradio', 'aria-checked': String(it.value === current),
    onclick: () => { closePicker(); onPick(it.value); },
  },
    h('span', { class: 'dd-opt-main' }, h('span', { class: 'sh-name' }, it.label)),
    h('span', { class: 'dd-tick', 'aria-hidden': 'true',
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
          + 'stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>' })));

  const el = h('div', {},
    h('div', { class: 'dd-shield', onclick: closePicker }),
    h('div', { class: 'dd-card dd-card-tight', role: 'menu' }, rows));
  document.body.append(el);
  openPicker = { el, btn };

  const card = el.querySelector('.dd-card');
  const r = btn.getBoundingClientRect();
  const GAP = 6, SAFE = 12, w = card.offsetWidth;
  card.style.left = Math.max(SAFE, Math.min(r.right - w, innerWidth - w - SAFE)) + 'px';
  const flip = innerHeight - r.bottom < card.offsetHeight + SAFE
            && r.top > card.offsetHeight + SAFE;
  card.style.top = (flip ? r.top - GAP - card.offsetHeight : r.bottom + GAP) + 'px';
  card.dataset.flip = String(flip);

  (rows.find(x => x.classList.contains('is-on')) || rows[0]).focus();
  card.addEventListener('keydown', (e) => {
    const i = rows.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); rows[(i + 1) % rows.length].focus(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); rows[(i - 1 + rows.length) % rows.length].focus(); }
    if (e.key === 'Escape')    { e.preventDefault(); const b = btn; closePicker(); b.focus(); }
  });
}

/* ── publishing a live artifact ───────────────────────────────
   A file gets downloaded; a live page gets an audience. So publishing
   uses the same dialog as sharing a chat, in the same order people ask
   the questions: who specifically, then what everyone else can do, then
   the link. Two dialogs that answer "who can see this" should not be two
   different dialogs.                                                   */

const PEOPLE = [
  { name: 'Matt Rivera',   role: 'Customer success' },
  { name: 'John Whitaker', role: 'Finance' },
  { name: 'Grace Coleman',  role: 'Product' },
  { name: 'Ananya Rao',    role: 'Design' },
  { name: 'Dan Whitfield', role: 'Revenue ops' },
  { name: 'Priya Raman',   role: 'Sales' },
  { name: 'Sana Kaur',     role: 'Legal' },
];

/* the same three answers a shared chat offers, worded for a page */
/* Each answer gets a mark, because "who can view it" is the kind of question
   people answer by recognising a shape — a lock, a building, a globe — long
   before they have finished reading the sentence beside it. */
const PUB_IC = {
  me:      '<path d="M16 10V7a4 4 0 0 0-8 0v3"/><rect x="5" y="10" width="14" height="10" rx="2.4"/>',
  org:     '<path d="M3 20h18M5 20V5.2a1.2 1.2 0 0 1 1.2-1.2h7.6A1.2 1.2 0 0 1 15 5.2V20"/>'
         + '<path d="M15 20v-9h3.8A1.2 1.2 0 0 1 20 12.2V20"/><path d="M8 8h4M8 12h4M8 16h4"/>',
  link:    '<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8"/>'
         + '<path d="M12 3.6a13 13 0 0 1 0 16.8 13 13 0 0 1 0-16.8"/>',
  view:    '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/>'
         + '<circle cx="12" cy="12" r="2.8"/>',
  edit:    '<path d="M4 20h4.2L19 9.2a2.1 2.1 0 0 0-3-3L5.2 17z"/><path d="M14.5 7.5l2.8 2.8"/>',
  remove:  '<circle cx="9.5" cy="8.5" r="3.6"/><path d="M3 19.5a6.5 6.5 0 0 1 12 0"/>'
         + '<path d="M16.5 12h5"/>',
  people:  '<circle cx="9" cy="8.5" r="3.4"/><path d="M2.6 19.5a6.4 6.4 0 0 1 12.8 0"/>'
         + '<path d="M15.6 5.6a3.4 3.4 0 0 1 0 5.8M17 14.4a6.4 6.4 0 0 1 4.4 5.1"/>',
};
const pubIcon = (k) =>
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
  + 'stroke-linecap="round" stroke-linejoin="round">' + PUB_IC[k] + '</svg>';

const PUB_GENERAL = {
  me:   { label: 'Restricted',            sub: 'Only the people above can view it',            ic: 'me' },
  org:  { label: 'Everyone at UnifyApps', sub: 'Anyone signed in to your workspace', ic: 'org' },
  link: { label: 'Anyone with the link',  sub: 'Anyone on the internet with the link can view',  ic: 'link' },
};

/* A published page can still be worked on, so an invitee gets a role the
   same way a chat guest does — the two dialogs answer the same question. */
/* Say what the person can do, in the order they would find out — and note
   the part that is easy to hand over by accident: an editor gets the chat
   that made this, which is where the changing actually happens. */
const PUB_ROLES = {
  view: { label: 'Viewer', sub: 'Can read it and download a copy' },
  edit: { label: 'Editor', sub: 'Can change it, and open the chat behind it' },
};

const twoUp = (n) => n.split(' ').map(w => w[0]).join('').slice(0, 2);

/* A person is a face wherever they appear. faceEl lives in app.js, which
   loads after this file — fine at call time, and initials stand in if it
   is ever missing. */
const avatarEl = (name, cls = 'sh-av') => (typeof faceEl === 'function')
  ? faceEl(name, cls)
  : h('span', { class: cls, 'data-tint': tintOf(name) }, twoUp(name));

/* a person is a name, a face and an address — the address is how you know
   it is the right Priya */
const mailOf = (n) =>
  /* the calendar keeps real addresses for people outside the company, and
     a customer with an @unifyapps.com address is worse than no address */
  (typeof MEET_BOOK !== 'undefined' && MEET_BOOK[n])
  || n.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(Boolean).join('.')
     + '@unifyapps.com';
/* a stable colour per person, so the same face is the same colour every time */
const tintOf = (n) => {
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 6;
  return String(h);
};

/* what the header button says under its dot — the audience in one phrase */
const scopeSummary = (p) => {
  if (p.general !== 'me') return PUB_GENERAL[p.general].label;
  const n = p.people.filter(x => x.role !== 'owner').length;
  return n ? `${n} invited ${n === 1 ? 'person' : 'people'}` : 'Only you';
};

/* publishing mints a link — the whole point of a live page is that it has
   an address you can send someone */
const publicUrl = (a) =>
  'unifyapps.com/a/' + a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const LINK_IC =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.4 6.4"/>'
  + '<path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4"/></svg>';

/* ── publishing an artifact as a page ─────────────────────────
   Sharing hands a thing to named people; publishing gives it an address
   and then decides who that address answers to. So the address comes
   first and is editable — an auto-slug nobody can change is a name you
   have to apologise for — and the audience sits under it as four
   answers, one of which opens its own screen because "these particular
   people" is a list, not a setting.                                    */

const SITE_GROUPS = ['Revenue team', 'Leadership', 'Deal desk'];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '').slice(0, 40);

/* Narrowest first, widest last — the room this was made in, then the
   company, then a hand-picked list, and Public at the bottom where a
   choice that puts it on the open internet belongs. */
const SITE_SCOPES = [
  { id: 'chat',       label: 'People in this chat',   sub: 'Everyone this conversation is shared with', ic: 'people' },
  { id: 'org',        label: 'Everyone at UnifyApps', sub: 'Anyone signed in to your workspace', ic: 'org' },
  { id: 'restricted', label: 'Restricted',            sub: 'Only the people and groups you choose', ic: 'me' },
  { id: 'public',     label: 'Public',                sub: 'Anyone with the link',               ic: 'link' },
];

function siteDialog(a, onDone) {
  a.publish = a.publish || {
    slug: slugify(a.name),
    scope: 'org',
    people: [],
    groups: [],
    published: false,
  };
  const P = a.publish;
  P.slug = P.slug || slugify(a.name);
  let screen = 'main', query = '';

  const dim = h('div', { class: 'sh-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const close = () => { dim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    if (screen === 'who') { screen = 'scope'; paint(); }
    else if (screen === 'scope') { screen = 'main'; paint(); }
    else close();
  };

  const head = h('header', { class: 'sh-head' });
  const body = h('div', { class: 'sh-body' });
  const foot = h('footer', { class: 'sh-foot' });

  const fullUrl = () => `${P.slug}.unifyapps.com`;
  const copyLink = () => navigator.clipboard?.writeText('https://' + fullUrl()).then(
    () => toast('Link copied.'), () => toast('Could not reach the clipboard.'));
  const save = () => { if (P.published) onDone?.(); };

  const sc = () => SITE_SCOPES.find(x => x.id === P.scope) || SITE_SCOPES[0];

  /* whoever this conversation is shared with, named */
  const chatNames = () => {
    const who = (typeof thread !== 'undefined' && thread?.people || [])
      .filter(p => p.name !== USER.name).map(p => p.name.split(' ')[0]);
    return who.length ? who.join(', ') : 'Everyone this conversation is shared with';
  };

  /* What "restricted" currently means, in a phrase — and it means the
     people in this conversation as well as anyone added, because the
     conversation is what gave them access in the first place. Naming only
     the additions made it read as though the room had been shut out. */
  const chosen = () => {
    const inChat = (typeof thread !== 'undefined' && thread?.people || [])
      .filter(p => p.name !== USER.name).map(p => p.name.split(' ')[0]);
    const bits = [...inChat, ...P.groups, ...P.people.map(n => n.split(' ')[0])];
    if (!bits.length) return 'Only you';
    if (bits.length <= 3) return bits.length < 3
      ? bits.join(' and ')
      : `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}`;
    return `${bits.slice(0, 2).join(', ')} and ${bits.length - 2} more`;
  };

  /* the one line the first screen shows for whatever is currently chosen */
  const scopeLine = () => P.scope === 'restricted' ? chosen()
    : P.scope === 'chat' ? chatNames()
    : sc().sub;

  const closeIc = '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
    + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
    + '<path d="M6 6l12 12M18 6L6 18"/></svg>';
  const backIc = '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
    + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
    + 'stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';

  const topBar = (title, back) => head.replaceChildren(...[
    back ? h('button', {
      class: 'icon-btn icon-btn-canvas sh-back', type: 'button', 'aria-label': 'Back',
      onclick: () => { screen = back; query = ''; paint(); }, html: backIc,
    }) : null,
    h('h2', { class: 'sh-title' }, ...title),
    h('div', { class: 'sh-head-act' },
      h('button', { class: 'icon-btn icon-btn-canvas', type: 'button',
                    'aria-label': 'Close', onclick: close, html: closeIc })),
  ].filter(Boolean));

  /* ── one · the address and, under it, who it answers to ── */
  const mainScreen = () => {
    topBar(['Publish']);

    const slugIn = h('input', {
      class: 'site-slug', type: 'text', value: P.slug, spellcheck: 'false',
      'aria-label': 'Address',
      oninput: (e) => { P.slug = slugify(e.target.value); },
      onblur: (e) => {
        P.slug = slugify(e.target.value) || slugify(a.name);
        e.target.value = P.slug;
        save();
      },
    });

    body.replaceChildren(
      h('div', { class: 'sh-sec sh-sec-first' }, 'Artifact URL'),
      h('div', { class: 'site-card' },
        h('div', { class: 'site-row site-url' },
          h('span', { class: 'site-mark', 'aria-hidden': 'true', html: kindMark(a.kind) }),
          h('span', { class: 'site-addr' },
            slugIn, h('span', { class: 'site-host' }, '.unifyapps.com')),
          h('button', {
            class: 'icon-btn icon-btn-canvas', type: 'button',
            title: 'Copy the link', 'aria-label': 'Copy the link', onclick: copyLink,
            html: '<svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" '
                + 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
                + 'stroke-linejoin="round"><rect x="8.5" y="8.5" width="12" height="12" rx="2.4"/>'
                + '<path d="M15.5 4.5H6a2.5 2.5 0 0 0-2.5 2.5v9.5"/></svg>',
          }))),

      h('div', { class: 'sh-sec' }, 'Visible to'),
      h('div', { class: 'site-card' },
        /* one row, one summary, one way in — the four answers live on the
           next screen, so the mark is an arrow onward and not a caret down */
        h('button', {
          class: 'site-row site-vis', type: 'button',
          onclick: () => { screen = 'scope'; paint(); },
        },
          h('span', { class: 'site-ic site-ic-sm', 'data-scope': P.scope, 'aria-hidden': 'true',
                      html: pubIcon(sc().ic) }),
          h('span', { class: 'site-main' },
            /* the section above already said "visible to" */
            h('span', { class: 'sh-name' }, sc().label),
            h('span', { class: 'sh-sub' }, scopeLine())),
          h('span', { class: 'caret caret-right', 'aria-hidden': 'true' }))),
    );

    foot.replaceChildren(
      P.published
        ? h('button', {
            class: 'sh-unpublish', type: 'button',
            onclick: () => {
              P.published = false;
              onDone?.();
              toast('Unpublished. The address no longer opens.');
              close();
            },
          }, 'Unpublish')
        : h('span', {}),
      h('span', { class: 'sh-foot-end' },
        h('button', { class: 'btn btn-quiet', type: 'button', onclick: close },
          P.published ? 'Close' : 'Cancel'),
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: () => {
            const first = !P.published;
            P.published = true;
            P.version = a.versions ? a.versions.length - 1 : 0;
            onDone?.();
            toast(first ? `Live at ${fullUrl()}` : 'Updated.');
            close();
          },
        }, P.published ? 'Update' : 'Publish')));
  };

  /* ── two · who can view it ── */
  const scopeScreen = () => {
    topBar([`Who can view this ${NOUN[a.kind]}?`], 'main');

    body.replaceChildren(
      h('div', { class: 'site-scopes', role: 'radiogroup' }, SITE_SCOPES.map(x => {
        const on = P.scope === x.id;
        const isR = x.id === 'restricted';
        return h('button', {
          class: 'site-scope' + (on ? ' is-on' : ''), type: 'button',
          role: 'radio', 'aria-checked': String(on),
          /* Three of these are radios and one is a door. Picking a radio
             is not committing to it — the choice lands where you can see
             it, and Done is what goes back. Restricted has a chevron
             because it is the door: it needs to know who, so it opens the
             picker on the click that chooses it, and Done there is what
             brings the answer back. */
          onclick: () => {
            P.scope = x.id;
            save();
            if (isR) { screen = 'who'; query = ''; }
            paint();
          },
        },
          h('span', { class: 'site-ic', 'data-scope': x.id, 'aria-hidden': 'true',
                      html: pubIcon(x.ic) }),
          h('span', { class: 'site-main' },
            h('span', { class: 'sh-name' }, x.label),
            h('span', { class: 'sh-sub' },
              isR && on ? chosen() : x.id === 'chat' ? chatNames() : x.sub)),
          isR
            ? h('span', { class: 'site-more' },
                on && (P.people.length + P.groups.length)
                  ? h('span', { class: 'site-n' }, String(P.people.length + P.groups.length))
                  : null,
                h('span', { class: 'caret caret-right', 'aria-hidden': 'true' }))
            : h('span', { class: 'site-radio', 'aria-hidden': 'true' }));
      })),
    );

    foot.replaceChildren(
      h('span', {}),
      h('span', { class: 'sh-foot-end' },
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: () => { screen = 'main'; paint(); },
        }, 'Done')));
  };

  /* ── three · which particular people ──
     The same interaction as inviting to a chat: what you pick becomes a
     pill in the field, and the field is the only place anything is
     listed. Nothing shows until you type — a standing list of everyone in
     the company is a directory, and this screen is not one. */
  const whoScreen = () => {
    topBar(['Who can view it'], 'scope');

    const inChat = (typeof thread !== 'undefined' && thread?.people || []).map(p => p.name);
    const already = new Set(inChat);
    const takenP = new Set(P.people), takenG = new Set(P.groups);
    const q = query.trim().toLowerCase();
    const people = q ? PEOPLE.filter(x => !takenP.has(x.name) && !already.has(x.name)
      && (x.name.toLowerCase().includes(q) || x.role.toLowerCase().includes(q))) : [];
    const groups = q ? SITE_GROUPS.filter(g => !takenG.has(g) && g.toLowerCase().includes(q)) : [];
    const xIc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
      + 'stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    body.replaceChildren(...[
      h('div', { class: 'sh-add' },
        h('div', { class: 'sh-add-field sh-add-chips' },
          P.groups.map(g => h('span', { class: 'sh-person' },
            h('span', { class: 'site-grp site-grp-sm', 'aria-hidden': 'true', html: pubIcon('people') }),
            g,
            h('button', {
              class: 'sh-person-x', type: 'button', 'aria-label': `Remove ${g}`,
              onclick: () => { P.groups = P.groups.filter(x => x !== g); save(); paint(); },
              html: xIc,
            }))),
          P.people.map(n => h('span', { class: 'sh-person' },
            avatarEl(n, 'sh-av sh-av-sm'),
            n,
            h('button', {
              class: 'sh-person-x', type: 'button', 'aria-label': `Remove ${n}`,
              onclick: () => { P.people = P.people.filter(x => x !== n); save(); paint(); },
              html: xIc,
            }))),
          h('input', {
            class: 'sh-search', type: 'search', value: query, autofocus: 'true',
            placeholder: P.people.length || P.groups.length ? 'Add more' : 'Search people and groups',
            'aria-label': 'Search people and groups',
            oninput: (e) => { query = e.target.value.trim().toLowerCase(); paint(); },
          })),
        (groups.length || people.length) ? h('div', { class: 'sh-suggest' },
          groups.map(g => h('button', {
            class: 'sh-sugg', type: 'button',
            onclick: () => { P.groups.push(g); query = ''; save(); paint(); },
          },
            h('span', { class: 'site-grp', 'aria-hidden': 'true', html: pubIcon('people') }),
            h('span', { class: 'sh-sugg-main' },
              h('span', { class: 'sh-name' }, g),
              h('span', { class: 'sh-sub' }, 'Group')),
            h('span', { class: 'sh-plus', 'aria-hidden': 'true' }, '+'))),
          people.map(x => h('button', {
            class: 'sh-sugg', type: 'button',
            onclick: () => { P.people.push(x.name); query = ''; save(); paint(); },
          },
            avatarEl(x.name),
            h('span', { class: 'sh-sugg-main' },
              h('span', { class: 'sh-name' }, x.name),
              h('span', { class: 'sh-sub' }, mailOf(x.name))),
            h('span', { class: 'sh-plus', 'aria-hidden': 'true' }, '+')))) : null,
        (q && !groups.length && !people.length)
          ? h('p', { class: 'sh-empty' }, 'Nothing matches.') : null),

      /* the chat already gives these people access — shown so the list does
         not look shorter than it is, and fixed because removing them here
         would take nothing away */
      inChat.length ? h('div', { class: 'sh-sec' }, 'Already have access') : null,
      inChat.length ? h('div', { class: 'sh-list' }, inChat.map(n => h('div', { class: 'sh-row' },
        avatarEl(n),
        h('span', { class: 'sh-row-main' },
          h('span', { class: 'sh-name' },
            n, n === USER.name ? h('span', { class: 'sh-you' }, 'you') : null),
          h('span', { class: 'sh-sub' }, mailOf(n))),
        h('span', { class: 'site-fixed' }, n === USER.name ? 'Owner' : 'In this chat')))) : null,
    ].filter(Boolean));

    foot.replaceChildren(
      h('span', { class: 'site-count' }, chosen()),
      h('span', { class: 'sh-foot-end' },
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: () => { screen = 'main'; query = ''; paint(); },
        }, 'Done')));
  };

  function paint() {
    if (screen === 'who') whoScreen();
    else if (screen === 'scope') scopeScreen();
    else mainScreen();
  }

  paint();
  dim.append(h('div', { class: 'sh-card sh-card-pub', role: 'dialog', 'aria-modal': 'true',
                        'aria-label': 'Publish' }, head, body, foot));
  document.body.append(dim);
  document.addEventListener('keydown', onKey);
}

/* what a share carries, said as a sentence. It is a note under the
   field, not a control — nothing here is switchable, so nothing here is
   drawn as though it were. */
const andList = (xs) => xs.length < 2 ? (xs[0] || '')
  : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
const shareLine = (n) => {
  const goes = `${andList(n.yes)} ${n.yes.length > 1 ? 'are' : 'is'} shared.`;
  if (!n.no?.length) return goes;
  const last = n.no[n.no.length - 1];
  const stay = n.no.length > 1 || /s$/i.test(last) ? 'stay' : 'stays';
  return `${goes} ${andList(n.no)} ${stay} with you.`;
};

function publishDialog(a, onDone) {
  /* who you can hand this to. A document goes to the people you work
     with; a meeting goes first to the people who were in it, and only
     then to everybody else. */
  const ROSTER = a.sharePeople && a.sharePeople.length
    ? a.sharePeople.concat(PEOPLE.filter(p => !a.sharePeople.some(q => q.name === p.name)))
    : PEOPLE;
  a.publish = a.publish || {
    people: [{ name: USER.name, role: 'owner' }],
    general: 'me',
    generalRole: 'view',
    published: false,
  };
  const P = a.publish;
  P.generalRole = P.generalRole || 'view';
  /* Editor by default — the reason to add someone to a conversation is so
     they can work on it, and Viewer is the exception you go and pick. */
  let query = '', pending = 'edit';
  /* people you have picked but not yet sent — Drive holds them in the field
     and turns the dialog into a note before anyone actually gets access */
  let staged = [], notify = true, message = '';

  const dim = h('div', { class: 'sh-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const close = () => {
    closePop();
    dim.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape' && !popOwner) close(); };

  const body = h('div', { class: 'sh-body' });
  const foot = h('footer', { class: 'sh-foot' });
  const head = h('header', { class: 'sh-head' });

  /* a conversation already has an address; do not invent a second one */
  const url = a.url || publicUrl(a);
  const copyLink = () => navigator.clipboard?.writeText('https://' + url).then(
    () => toast('Link copied.'), () => toast('Could not reach the clipboard.'));

  /* once it is out, every edit here takes effect as you make it */
  const touch = () => { if (P.published) onDone?.(); };

  /* ── one dropdown, used by every choice in the dialog ─────────
     It carries the same label-and-sub pair its trigger shows, ticks the
     current answer, can match its trigger's width, and flips above when
     there is no room below. It mounts on the backdrop: a popover inside
     the dialog's scrolling body is clipped the moment it is taller than
     the panel. */
  let popOwner = null, popEl = null;

  const closePop = () => {
    popEl?.remove();
    popEl = null;
    popOwner?.setAttribute('aria-expanded', 'false');
    popOwner = null;
  };

  const openPop = (btn, opts, current, onPick,
                   { match = false, align = 'left', extra = null } = {}) => {
    popOwner = btn;
    btn.setAttribute('aria-expanded', 'true');

    const rows = Object.entries(opts).map(([k, o]) => h('button', {
      class: 'dd-opt' + (k === current ? ' is-on' : ''), type: 'button',
      role: 'menuitemradio', 'aria-checked': String(k === current),
      onclick: () => { closePop(); onPick(k); },
    },
      h('span', { class: 'dd-opt-main' },
        h('span', { class: 'sh-name' }, o.label),
        o.sub ? h('span', { class: 'sh-sub' }, o.sub) : null),
      h('span', { class: 'dd-tick', 'aria-hidden': 'true',
        html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
            + 'stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>' })));

    /* taking someone off is a change to their access, so it belongs with
       the other answers about their access */
    const last = extra ? h('button', {
      class: 'dd-opt dd-danger', type: 'button', role: 'menuitem',
      onclick: () => { closePop(); extra.run(); },
    }, h('span', { class: 'dd-opt-main' }, h('span', { class: 'sh-name' }, extra.label))) : null;

    popEl = h('div', {},
      h('div', { class: 'dd-shield', onclick: closePop }),
      h('div', { class: 'dd-card', role: 'menu' },
        rows, last ? h('div', { class: 'dd-rule' }) : null, last));
    document.body.append(popEl);

    const card = popEl.querySelector('.dd-card');
    const r = btn.getBoundingClientRect();
    const GAP = 6, SAFE = 12;
    if (match) card.style.width = r.width + 'px';

    const w = card.offsetWidth;
    const left = align === 'right' ? r.right - w : r.left;
    card.style.left = Math.max(SAFE, Math.min(left, innerWidth - w - SAFE)) + 'px';

    const flip = innerHeight - r.bottom < card.offsetHeight + SAFE
              && r.top > card.offsetHeight + SAFE;
    card.style.top = (flip ? r.top - GAP - card.offsetHeight : r.bottom + GAP) + 'px';
    card.dataset.flip = String(flip);

    (rows.find(x => x.classList.contains('is-on')) || rows[0]).focus();
    card.addEventListener('keydown', (e) => {
      const all = last ? rows.concat(last) : rows;
      const i = all.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); all[(i + 1) % all.length].focus(); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); all[(i - 1 + all.length) % all.length].focus(); }
      if (e.key === 'Escape')    { e.preventDefault(); const b = popOwner; closePop(); b?.focus(); }
    });
  };

  /* the trigger every role choice shares, so they line up in one column */
  const roleBtn = (value, onPick, { onRemove = null } = {}) => h('button', {
    class: 'sh-role', type: 'button',
    'aria-haspopup': 'menu', 'aria-expanded': 'false',
    onclick: (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      if (popOwner === btn) return closePop();
      closePop();
      openPop(btn, PUB_ROLES, value, onPick, {
        align: 'right',
        extra: onRemove ? { label: 'Remove access', run: onRemove } : null,
      });
    },
  }, PUB_ROLES[value].label, h('span', { class: 'caret', 'aria-hidden': 'true' }));

  /* ── the note, once you have picked someone ──────────────────
     Nobody gets access the moment you click their name. They sit in the
     field while you decide the role and whether to say why, and it is Send
     that grants it — the difference between choosing someone and telling
     them. */
  const composeScreen = () => {
    const taken = new Set(P.people.map(x => x.name).concat(staged.map(x => x.name)));
    const matches = query
      ? ROSTER.filter(x => !taken.has(x.name) && x.name.toLowerCase().includes(query))
      : [];

    head.replaceChildren(
      h('button', {
        class: 'icon-btn icon-btn-canvas sh-back', type: 'button', 'aria-label': 'Back',
        onclick: () => { staged = []; query = ''; message = ''; paint(); },
        html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
            + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
            + 'stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
      }),
      h('h2', { class: 'sh-title' },
        a.kind === 'chat' ? 'Share ' : 'Publish ', h('span', {}, `“${a.name}”`)),
      h('div', { class: 'sh-head-act' },
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close', onclick: close,
          html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
              + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
              + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
        })));

    body.replaceChildren(
      h('div', { class: 'sh-compose' },
        h('div', { class: 'sh-add' },
          h('div', { class: 'sh-add-field sh-add-chips' },
            staged.map((x, i) => h('span', { class: 'sh-person' },
              avatarEl(x.name, 'sh-av sh-av-sm'),
              x.name,
              h('button', {
                class: 'sh-person-x', type: 'button', 'aria-label': `Remove ${x.name}`,
                onclick: () => {
                  staged.splice(i, 1);
                  staged.length ? paint() : (query = '', paint());
                },
                html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                    + 'stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
              }))),
            h('input', {
              class: 'sh-search', type: 'search', value: query,
              placeholder: 'Add more', 'aria-label': 'Add more people',
              oninput: (e) => { query = e.target.value.trim().toLowerCase(); paint(); },
            })),
          matches.length ? h('div', { class: 'sh-suggest' }, matches.map(x => h('button', {
            class: 'sh-sugg', type: 'button',
            onclick: () => { staged.push({ name: x.name, role: pending }); query = ''; paint(); },
          },
            avatarEl(x.name),
            h('span', { class: 'sh-sugg-main' },
              h('span', { class: 'sh-name' }, x.name),
              h('span', { class: 'sh-sub' }, mailOf(x.name))),
          ))) : null),
        /* one role for everyone in this batch, the way it is asked */
        h('div', { class: 'sh-compose-role' },
          roleBtn(pending, (r) => { pending = r; staged.forEach(x => { x.role = r; }); paint(); }))),

      h('button', {
        class: 'set-row sh-notify', type: 'button', role: 'checkbox', 'aria-checked': String(notify),
        onclick: () => { notify = !notify; paint(); },
      },
        h('span', { class: 'set-box', 'aria-hidden': 'true',
          html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" '
              + 'stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>' }),
        h('span', {}, 'Notify people')),

      notify ? h('textarea', {
        class: 'sh-message', rows: '4', placeholder: 'Message', 'aria-label': 'Message',
        oninput: (e) => { message = e.target.value; },
      }, message) : null,
    );

    foot.replaceChildren(
      h('button', {
        class: 'icon-btn icon-btn-canvas', type: 'button',
        title: 'Copy link', 'aria-label': 'Copy link', onclick: copyLink, html: LINK_IC,
      }),
      h('span', { class: 'sh-foot-end' },
        h('button', {
          class: 'btn btn-quiet', type: 'button',
          onclick: () => { staged = []; query = ''; message = ''; paint(); },
        }, 'Cancel'),
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: () => {
            /* an editor is being let into the room, not handed a file */
            const editors = staged.filter(x => x.role === 'edit').map(x => x.name);
            P.people.push(...staged);
            staged = []; query = ''; message = '';
            if (editors.length && typeof joinChat === 'function') joinChat(editors);
            if (!P.published) {
              P.published = true;
              P.version = a.versions ? a.versions.length - 1 : 0;
            }
            onDone?.();
            paint();
            /* no toast — the arrival line in the thread and the faces in
               the header already say it happened, twice over */
          },
        }, 'Send')));
  };

  const paint = () => {
    closePop();
    if (staged.length) return composeScreen();

    const taken = new Set(P.people.map(x => x.name));
    const matches = query
      ? ROSTER.filter(x => !taken.has(x.name) && x.name.toLowerCase().includes(query))
      : [];

    /* the name is the title, the way it is on the thing you are sharing */
    head.replaceChildren(
      h('h2', { class: 'sh-title' },
        a.kind === 'chat' ? 'Share ' : 'Publish ', h('span', {}, `“${a.name}”`)),
      h('div', { class: 'sh-head-act' },
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close', onclick: close,
          html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
              + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
              + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
        })));

    body.replaceChildren(...[
      /* the one thing the header's dot can only hint at */
      (P.published && P.version != null && a.versions
        && P.version !== a.versions.length - 1)
        ? h('div', { class: 'sh-stale' },
            h('span', { class: 'sh-stale-main' },
              h('span', { class: 'sh-name' },
                `${versionLabel(a, P.version)} is the version people can view`),
              h('span', { class: 'sh-sub' },
                `${versionLabel(a, a.versions.length - 1)} has changes that are not shared yet`)),
            h('button', {
              class: 'btn btn--primary sh-stale-go', type: 'button',
              onclick: () => {
                P.version = a.versions.length - 1;
                onDone?.();
                paint();
                toast(`${versionLabel(a, P.version)} is live.`);
              },
            }, 'Share it'))
        : null,

      h('div', { class: 'sh-add' },
        h('div', { class: 'sh-add-field' },
          h('input', {
            class: 'sh-search', type: 'search', value: query,
            placeholder: 'Add people and groups', 'aria-label': 'Add people and groups',
            oninput: (e) => { query = e.target.value.trim().toLowerCase(); paint(); },
          }),
          query ? roleBtn(pending, (r) => { pending = r; paint(); }) : null),
        matches.length ? h('div', { class: 'sh-suggest' }, matches.map(x => h('button', {
          class: 'sh-sugg', type: 'button',
          onclick: () => { staged.push({ name: x.name, role: pending }); query = ''; paint(); },
        },
          avatarEl(x.name),
          h('span', { class: 'sh-sugg-main' },
            h('span', { class: 'sh-name' }, x.name),
            h('span', { class: 'sh-sub' }, mailOf(x.name))),
        ))) : null),

      /* what actually travels. On a meeting the answer is not obvious —
         the brief and the write-up are for other people, and the notes
         you took for yourself are not. Each part is named on its own,
         with the mark doing the saying: a tick for what goes, a struck
         circle and a dashed edge for what stays. */
      a.shareNote ? h('p', { class: 'sh-note' }, shareLine(a.shareNote)) : null,

      h('div', { class: 'sh-sec' }, 'People with access'),
      h('div', { class: 'sh-list' }, P.people.map((x, i) => h('div', { class: 'sh-row' },
        avatarEl(x.name),
        h('span', { class: 'sh-row-main' },
          h('span', { class: 'sh-name' },
            x.name, x.name === USER.name ? h('span', { class: 'sh-you' }, 'you') : null),
          h('span', { class: 'sh-sub' }, mailOf(x.name))),
        x.role === 'owner'
          ? h('span', { class: 'sh-owner' }, 'Owner')
          : roleBtn(x.role, (r) => {
              const joined = r === 'edit' && x.role !== 'edit';
              x.role = r; touch(); paint();
              if (joined && typeof joinChat === 'function') joinChat([x.name]);
            }, {
              onRemove: () => {
                P.people.splice(i, 1);
                touch(); paint();
                toast(`${x.name} removed.`);
              },
            }),
      ))),

      h('div', { class: 'sh-sec' }, 'General access'),
      h('div', { class: 'sh-general' },
        h('button', {
          class: 'sh-gen', type: 'button',
          'aria-haspopup': 'menu', 'aria-expanded': 'false',
          onclick: (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            if (popOwner === btn) return closePop();
            closePop();
            openPop(btn, PUB_GENERAL, P.general, (k) => {
              P.general = k;
              /* a public page is read-only; there is no role left to pick */
              if (k === 'link') P.generalRole = 'view';
              touch(); paint();
            }, { align: 'left' });
          },
        },
          h('span', { class: 'sh-gen-ic', 'data-scope': P.general, 'aria-hidden': 'true',
                      html: pubIcon(PUB_GENERAL[P.general].ic) }),
          h('span', { class: 'sh-gen-main' },
            h('span', { class: 'sh-gen-name' },
              PUB_GENERAL[P.general].label,
              h('span', { class: 'caret', 'aria-hidden': 'true' })),
            h('span', { class: 'sh-sub' }, PUB_GENERAL[P.general].sub))),
        /* nobody outside the list means there is no general role to set, and
           a page anyone can reach is one anyone can only read */
        P.general === 'me' ? null
          : P.general === 'link'
            ? h('span', { class: 'sh-owner' }, 'Viewer')
            : roleBtn(P.generalRole, (r) => { P.generalRole = r; touch(); paint(); })),
    ].filter(Boolean));

    foot.replaceChildren(
      h('button', {
        class: 'btn sh-copy', type: 'button', onclick: copyLink,
        html: LINK_IC,
      }, 'Copy link'),
      h('span', { class: 'sh-foot-end' },
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: () => {
            if (!P.published) {
              P.published = true;
              P.version = a.versions ? a.versions.length - 1 : 0;
              onDone?.();
              toast('Shared. Copy the link to hand it on.');
            }
            close();
          },
        }, 'Done')));
  };

  paint();
  const card = h('div', { class: 'sh-card sh-card-pub', role: 'dialog', 'aria-modal': 'true',
                          'aria-label': 'Share' }, head, body, foot);
  dim.append(card);
  document.body.append(dim);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => card.querySelector('.sh-search')?.focus());
}

/* ── comments ─────────────────────────────────────────────────
   A comment is worth more when it says where it is about. Arm the button,
   click the thing you mean, and the note carries that place with it —
   either as a pin left on the artifact, or as a message to the assistant
   with the location attached, so "make this shorter" has a referent.   */

const COMMENT_ANCHOR = {
  deck:  '.slide',
  doc:   '.doc-h1, .doc-h2, .doc-p, .doc-ul, .doc-quote, .doc-meta',
  sheet: '.sheet-row',
  app:   '.pc-card, .pc-kpi',
};

/* what to call the place that was clicked */
function commentWhere(a, el) {
  if (!el) return null;
  const trim = (s, n = 46) => {
    s = (s || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };

  if (a.kind === 'deck') {
    const n = el.dataset.n != null ? +el.dataset.n + 1 : null;
    const t = trim(el.querySelector('.slide-title')?.textContent);
    return n ? `Slide ${n}${t ? ` · ${t}` : ''}` : t || 'the deck';
  }
  if (a.kind === 'app') {
    return trim(el.querySelector('.pc-card-t, .pc-kpi-l')?.textContent) || 'the page';
  }
  if (a.kind === 'sheet') {
    const cells = [...el.querySelectorAll('.sheet-cell')];
    const row = el.querySelector('.sheet-gutter')?.textContent;
    return cells[0]?.textContent ? `Row ${row} · ${trim(cells[0].textContent, 28)}`
      : `Row ${row || ''}`.trim() || 'the sheet';
  }
  /* a doc block is named by the heading it sits under */
  let n = el, head = null;
  while (n && !head) {
    if (n.classList?.contains('doc-h2') || n.classList?.contains('doc-h1')) head = n.textContent;
    n = n.previousElementSibling;
  }
  return trim(head) || trim(el.textContent) || 'the document';
}

/* Arms the artifact for commenting and returns the button that does it.
   `shell` is what gets clicked; `send` posts to the conversation. */
function commentLayer(a, shell) {
  a.comments = a.comments || [];
  let on = false, pop = null;

  /* a bubble with a plus in it: not "there are comments" but "add one
     here", which is what the button actually does */
  const btn = h('button', {
    class: 'icon-btn icon-btn-canvas xp-comment', type: 'button',
    'aria-pressed': 'false', title: 'Comment on something',
    'aria-label': 'Comment on something',
    onclick: (e) => { e.stopPropagation(); setOn(!on); },
    html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
        + 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
        + 'stroke-linejoin="round">'
        + '<path d="M20.5 11.4a7.9 7.9 0 0 1-8.5 7.9c-.9 0-1.8-.1-2.6-.4l-4.9 1.6 1.6-4.1'
        + 'a7.6 7.6 0 0 1-1.6-4.7 7.9 7.9 0 0 1 8.5-7.9 8 8 0 0 1 7.5 7.6z"/>'
        + '<path d="M12 8.9v4.6M9.7 11.2h4.6"/></svg>',
  });

  const setOn = (v) => {
    on = v;
    btn.setAttribute('aria-pressed', String(on));
    shell.dataset.commenting = String(on);
    if (!on) closePop();
  };

  const closePop = () => { pop?.remove(); pop = null; };

  shell.addEventListener('click', (e) => {
    if (!on) return;
    if (e.target.closest('.cmt-pop, .cmt-pin')) return;
    const sel = COMMENT_ANCHOR[a.kind] || '*';
    const anchor = e.target.closest(sel) || e.target.closest(sel.split(',')[0].trim());
    if (!anchor) return;
    e.preventDefault();
    e.stopPropagation();
    openPop(anchor, e.clientX, e.clientY);
  }, true);

  function openPop(anchor, x, y) {
    closePop();
    const where = commentWhere(a, anchor);
    /* what the popover is attached to, for anything that wants to change
       it rather than annotate it */
    const box = h('textarea', {
      class: 'cmt-box', rows: '3', placeholder: 'Describe the issue or suggestion…',
      'aria-label': 'Comment',
    });

    pop = h('div', { class: 'cmt-pop', role: 'dialog', 'aria-label': 'Comment' },
      h('div', { class: 'cmt-head' },
        h('span', { class: 'cmt-t' }, 'What should change?'),
        h('button', {
          class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close',
          onclick: () => setOn(false),
          html: '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" '
              + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
              + '<path d="M6 6l12 12M18 6L6 18"/></svg>',
        })),
      /* no label for the thing you clicked — it is outlined behind the
         popover, and you clicked it a second ago. The name still travels
         with the message, which is where it is not obvious. */
      box,
      h('div', { class: 'cmt-acts' },
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => {
            const text = box.value.trim();
            if (!text) return box.focus();
            a.comments.push({ where, text, by: USER.name, at: 'Just now' });
            pinIt(anchor, text, where);
            setOn(false);
            toast('Comment added.');
          },
        }, 'Add comment'),
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: () => {
            const text = box.value.trim();
            if (!text) return box.focus();
            setOn(false);
            if (typeof sendComment === 'function') sendComment(a, where, text, anchor.dataset.title);
          },
        }, 'Send to Assistant')));

    document.body.append(pop);
    const w = pop.offsetWidth, hgt = pop.offsetHeight;
    pop.style.left = Math.max(12, Math.min(x - w / 2, innerWidth - w - 12)) + 'px';
    pop.style.top = (y + hgt + 16 > innerHeight ? y - hgt - 10 : y + 10) + 'px';
    box.focus();
  }

  /* a pin is the comment staying where it was made */
  function pinIt(anchor, text, where) {
    if (getComputedStyle(anchor).position === 'static') anchor.style.position = 'relative';
    anchor.append(h('button', {
      class: 'cmt-pin', type: 'button', title: `${where} — ${text}`,
      onclick: (e) => { e.stopPropagation(); toast(text); },
    }, avatarEl(USER.name, 'cmt-pin-face')));
  }

  return btn;
}

function exportControl(a) {
  const cfg = EXPORT[a.kind];
  const pri = DEST[cfg.primary];

  const act = (key, verb) => {
    const d = DEST[key];
    /* the one export that can actually happen in a browser, does */
    if (key === 'clipboard') return copyArtifact(a);
    toast(verb === 'open'
      ? `Opening in ${d.label} comes in the next pass.`
      : verb === 'send'
      ? `Sending to ${d.label} comes in the next pass.`
      : `Downloading ${d.label}${d.ext || ''} comes in the next pass.`);
  };

  /* a row is its name and what clicking it does — nothing else */
  const noun = NOUN[a.kind];
  const row = (key, verb) => {
    const d = DEST[key];
    return h('button', {
      class: 'xp-row', type: 'button',
      onclick: () => { closeMenu(); act(key, verb); },
    },
      h('span', { class: 'xp-ic', html: brandMark(key) }),
      h('span', { class: 'xp-main' },
        h('span', { class: 'xp-name' },
          d.label, d.ext ? h('span', { class: 'xp-ext' }, d.ext) : null),
        h('span', { class: 'xp-best' }, d.does(noun))),
    );
  };

  const section = (title, keys, verb) => keys.length
    ? [h('div', { class: 'xp-sec' }, title), ...keys.map(k => row(k, verb))]
    : [];

  /* every destination reads the same wherever it is offered: its own mark,
     its name and extension, and a line saying what clicking it does */
  const openExportMenu = (anchor, sections) => {
    closeMenu();
    const el = h('div', { class: 'menu xp-menu', role: 'menu' }, ...sections);
    document.body.append(el);
    openMenu = el;
    const r = anchor.getBoundingClientRect();
    el.style.top = Math.min(r.bottom + 6, innerHeight - el.offsetHeight - 12) + 'px';
    el.style.left = Math.max(12, Math.min(r.right - el.offsetWidth, innerWidth - el.offsetWidth - 12)) + 'px';
    el.classList.add('opening');
    el.addEventListener('click', (ev) => ev.stopPropagation());
  };

  const more = h('button', {
    class: 'xp-more', type: 'button',
    'aria-label': 'More export options', 'aria-haspopup': 'menu',
    onclick: (e) => {
      e.stopPropagation();
      openExportMenu(e.currentTarget, [
        ...section('Open in', cfg.open || [], 'open'),
        ...section('Download', cfg.download || [], 'download'),
        ...section('Copy', cfg.copy || [], 'copy'),
      ]);
    },
  }, h('span', { class: 'caret', 'aria-hidden': 'true' }));

  /* Sharing lives on the conversation now, beside the people already in
     it — an artifact belongs to the thread that made it, so "who can see
     this" gets asked once, not once per file. What stays here is getting
     the thing out: open it in its application, or download it. */

  if (a.kind === 'app') {
    /* an interactive page has no application to open into, so downloading
       is its own errand rather than a footnote under a caret */
    const dl = h('button', {
      class: 'xp-icon-btn', type: 'button',
      title: 'Download', 'aria-label': 'Download', 'aria-haspopup': 'menu',
      onclick: (e) => {
        e.stopPropagation();
        openExportMenu(e.currentTarget, section('Download', cfg.download || [], 'download'));
      },
      html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" '
          + 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
          + 'stroke-linejoin="round"><path d="M12 3.5v11"/><path d="M7.5 10.5l4.5 4.5 4.5-4.5"/>'
          + '<path d="M4.5 19.5h15"/></svg>',
    });
    return h('div', { class: 'xp-wrap' }, dl);
  }

  /* the mark carries the destination — spelling it out beside its own logo
     is the label saying twice what the icon already said */
  return h('div', { class: 'xp-wrap' },
    h('div', { class: 'xp' },
      h('button', {
        class: 'xp-main-btn xp-icon', type: 'button',
        title: `Open in ${pri.label}`, 'aria-label': `Open in ${pri.label}`,
        onclick: () => act(cfg.primary, 'open'),
        html: brandMark(cfg.primary),
      }),
      more));
}

/* ── the formatting toolbar, for any editable surface in the panel ── */
function selectionToolbar(root) {
  const pop = h('div', { class: 'doc-pop', hidden: true });
  document.body.append(pop);
  const hide = () => { pop.hidden = true; pop.replaceChildren(); };

  const place = (rect) => {
    pop.hidden = false;
    const w = pop.offsetWidth, hgt = pop.offsetHeight;
    const below = rect.bottom + 8;
    pop.style.top = (below + hgt > innerHeight - 8 ? rect.top - hgt - 8 : below) + 'px';
    pop.style.left = Math.max(8, Math.min(
      rect.left + rect.width / 2 - w / 2, innerWidth - w - 8)) + 'px';
  };

  const sync = () => {
    const host = getSelection()?.anchorNode?.parentElement?.closest('[contenteditable]');
    host?.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const FMT = [
    { cmd: 'bold', label: 'Bold', key: 'B', mod: 'is-b' },
    { cmd: 'italic', label: 'Italic', key: 'I', mod: 'is-i' },
    { cmd: 'underline', label: 'Underline', key: 'U', mod: 'is-u' },
    { cmd: 'strikeThrough', label: 'Strikethrough', key: 'S', mod: 'is-s' },
  ];

  const iconBtn = (label, svg, run) => h('button', {
    class: 'doc-tb-b', type: 'button', title: label, 'aria-label': label,
    onmousedown: (e) => e.preventDefault(),
    onclick: run,
    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
        + 'stroke-linecap="round" stroke-linejoin="round">' + svg + '</svg>',
  });

  /* Edit leads, because changing what a passage says is a bigger act than
     making it bold, and it is the one the assistant can do for you.
     Pressing it turns this toolbar into the field, in the same place, over
     the passage it is about — sending you to a field at the foot of the
     page would leave the selection behind. */
  const owner = () => {
    const o = root.closest?.('.mail');
    return o && typeof o.__askAbout === 'function' ? o : null;
  };

  const askField = (scope, rect) => {
    const input = h('input', {
      class: 'doc-ask-in', type: 'text', spellcheck: 'false',
      placeholder: 'Describe changes', 'aria-label': 'Describe changes',
    });
    const go = h('button', {
      class: 'doc-ask-go', type: 'button', 'aria-label': 'Ask', disabled: true,
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
          + 'stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 12l6-6 6 6"/></svg>',
    });
    const run = () => {
      const t = input.value.trim();
      if (!t) return input.focus();
      hide();
      owner()?.__askAbout(scope, t);
    };
    input.addEventListener('input', () => { go.disabled = !input.value.trim(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); run(); }
      if (e.key === 'Escape') { e.preventDefault(); hide(); }
    });
    go.addEventListener('click', run);

    pop.replaceChildren(h('div', { class: 'doc-ask' }, input, go));
    place(rect);
    requestAnimationFrame(() => input.focus());
  };

  const askBtn = (rect) => {
    if (!owner()) return null;
    return h('button', {
      class: 'doc-tb-b doc-tb-ask', type: 'button', title: 'Ask for a change',
      onmousedown: (e) => e.preventDefault(),
      onclick: () => {
        const sel = getSelection();
        askField(sel ? sel.toString().trim() : '', rect);
      },
    },
      h('span', { class: 'doc-tb-ic', 'aria-hidden': 'true',
                  html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                      + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
                      + '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z"/>'
                      + '<path d="M13.5 5.5l3 3"/></svg>' }),
      'Edit');
  };

  const build = (rect) => h('div', { class: 'doc-tb' },
    ...[askBtn(rect), owner() ? h('span', { class: 'doc-tb-sep' }) : null].filter(Boolean),
    ...FMT.map(f => {
      const b = h('button', {
        class: 'doc-tb-b', type: 'button', title: f.label, 'aria-label': f.label,
        onmousedown: (e) => e.preventDefault(),
        onclick: () => {
          document.execCommand(f.cmd); sync();
          b.setAttribute('aria-pressed', String(document.queryCommandState(f.cmd)));
        },
      }, h('span', { class: 'doc-tb-l ' + f.mod }, f.key));
      try { b.setAttribute('aria-pressed', String(document.queryCommandState(f.cmd))); } catch {}
      return b;
    }),
    h('span', { class: 'doc-tb-sep' }),
    iconBtn('Bulleted list',
      '<path d="M9 6.5h11M9 12h11M9 17.5h11"/>'
      + '<circle cx="4.5" cy="6.5" r="1.3" fill="currentColor" stroke="none"/>'
      + '<circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>'
      + '<circle cx="4.5" cy="17.5" r="1.3" fill="currentColor" stroke="none"/>',
      () => { document.execCommand('insertUnorderedList'); sync(); }),
    iconBtn('Link',
      '<path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.4 6.4"/>'
      + '<path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4"/>',
      () => { const u = prompt('Link to'); if (u) { document.execCommand('createLink', false, u); sync(); } }),
  );

  root.addEventListener('mouseup', () => {
    setTimeout(() => {
      const sel = getSelection();
      if (!sel || sel.isCollapsed) return hide();
      const node = sel.anchorNode;
      if (!node || !root.contains(node)) return hide();
      if (!node.parentElement?.closest('[contenteditable]')) return hide();
      const range = sel.getRangeAt(0);
      if (!range.toString().trim()) return hide();
      const rect = range.getBoundingClientRect();
      pop.replaceChildren(build(rect));
      place(rect);
    }, 0);
  });
  document.addEventListener('mousedown', e => { if (!pop.contains(e.target)) hide(); });

  return { pop, hide, place, destroy: () => pop.remove() };
}

/* ── the shell every artifact opens into ── */

/* ------------------------------------------------------------------
   Mail — a message being written, in the canvas.

   The difference between this and a document is that it has recipients
   and a Send, and both of those change how it is read: a draft with
   nobody in the To field is a note to yourself. So the recipient row is
   the first thing, it completes against the address book the way every
   mail client does, and everything on the page is editable in place.

   Asking for a change is the other half. Edit turns into a line you can
   type into, and the body marks itself while you type so it is obvious
   what the request applies to.
------------------------------------------------------------------ */

/* The address book, as it would come from the connected mailbox: the
   people here, and the people at the accounts we work with. */
const MAIL_BOOK = [
  { n: 'Priya Raman',    e: 'priya.raman@unifyapps.com' },
  { n: 'Sana Kaur',      e: 'sana.kaur@unifyapps.com' },
  { n: 'Dev Anand',      e: 'dev.anand@unifyapps.com' },
  { n: 'Meera Nair',     e: 'meera.nair@unifyapps.com' },
  { n: 'Elena Ruiz',     e: 'elena.ruiz@unifyapps.com' },
  { n: 'Shivam Satrawal', e: 'shivam@unifyapps.com' },
  { n: 'Sumeet Nandal',  e: 'sumeet@unifyapps.com' },
  { n: 'Pavitar Singh',  e: 'pavitar.singh@unifyapps.com' },
  { n: 'Callum Reid',    e: 'callum.reid@docebo.com' },
  { n: 'Rachel Okafor',  e: 'rachel.okafor@greif.com' },
  { n: 'Mark Feltner',   e: 'mark.feltner@proofpoint.com' },
  { n: 'Anita Osborne',  e: 'anita.osborne@cority.com' },
  { n: 'Dan Whitfield',  e: 'dan.whitfield@lowes.com' },
  { n: 'Nina Alvarez',   e: 'nina.alvarez@ironmountain.com' },
  { n: 'Tom Beckett',    e: 'tom.beckett@advanceauto.com' },
];

const MAIL_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
  + 'stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10.5 13.5"/>'
  + '<path d="M21 3 14.5 21l-4-7.5L3 9.5z"/></svg>';
const MAIL_PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
  + 'stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z"/>'
  + '<path d="M13.5 5.5l3 3"/></svg>';
const MAIL_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
  + 'stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="12" height="12" rx="2.4"/>'
  + '<path d="M15.5 5.5H6a2.5 2.5 0 0 0-2.5 2.5v9.5"/></svg>';
const MAIL_OUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
  + 'stroke-linecap="round" stroke-linejoin="round"><path d="M15 3.5h5.5V9"/><path d="M10.5 13.5 20.5 3.5"/>'
  + '<path d="M19 14.5V19a1.6 1.6 0 0 1-1.6 1.6H5A1.6 1.6 0 0 1 3.4 19V6.6A1.6 1.6 0 0 1 5 5h4.6"/></svg>';
const MAIL_UNDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
  + 'stroke-linecap="round" stroke-linejoin="round"><path d="M9 7 4.5 11.5 9 16"/>'
  + '<path d="M4.5 11.5h9a5.5 5.5 0 0 1 0 11H10"/></svg>';
const MAIL_REDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
  + 'stroke-linecap="round" stroke-linejoin="round"><path d="M15 7l4.5 4.5L15 16"/>'
  + '<path d="M19.5 11.5h-9a5.5 5.5 0 0 0 0 11H14"/></svg>';

const MAIL_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
  + 'stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 12l6-6 6 6"/></svg>';

function renderMail(a, opts = {}) {
  const to = bodyOf(a, 'to').slice();
  const cc = bodyOf(a, 'cc').slice();
  const bcc = [];
  /* Cc and Bcc are asked for, not offered. An empty Bcc row on every draft
     is three fields where the draft only has one. */
  let showCc = cc.length > 0, showBcc = false;
  let asking = false;

  /* Undo is the promise that editing in place is safe. It appears only
     once there is something to undo, because a greyed pair of arrows on
     an untouched draft is two controls that have never done anything. */
  let subject = bodyOf(a, 'subject');
  let blocks = bodyOf(a, 'blocks').map(b => ({ ...b, v: Array.isArray(b.v) ? b.v.slice() : b.v }));
  const snap = () => JSON.stringify({ to, cc, bcc, subject, blocks });
  let hist = [snap()], at = 0, hold = null;
  /* Every change is written back to the artifact, not held in the view, so
     the same draft rendered twice — inline in the thread and open on the
     canvas — is the same draft rather than two copies of it. */
  const persist = () => {
    const v = (a.versions && a.versions[a.vi ?? a.versions.length - 1]) || a;
    v.to = to.slice(); v.cc = cc.slice(); v.subject = subject; v.blocks = blocks;
    a.to = v.to; a.cc = v.cc; a.subject = v.subject; a.blocks = v.blocks;
  };
  const commit = () => {
    persist();
    const now = snap();
    if (now === hist[at]) return;
    hist = hist.slice(0, at + 1);
    hist.push(now);
    at = hist.length - 1;
    paintBar();
  };
  /* text keeps typing; one keystroke is not one undo */
  const commitSoon = () => { persist(); clearTimeout(hold); hold = setTimeout(commit, 600); };
  const restore = (i) => {
    at = i;
    const v = JSON.parse(hist[at]);
    to.length = 0; to.push(...v.to);
    cc.length = 0; cc.push(...v.cc);
    bcc.length = 0; bcc.push(...v.bcc);
    subject = v.subject;
    blocks = v.blocks;
    showCc = showCc || cc.length > 0;
    showBcc = showBcc || bcc.length > 0;
    paintHeads(); paintBody(); paintBar();
  };

  const root = h('div', { class: 'mail' });
  const bar = h('div', { class: 'mail-bar' });
  const heads = h('div', { class: 'mail-heads' });
  /* The actions live at the foot, where you arrive after reading it —
     Send at the top of a draft asks you to act before you have read. */
  const page = h('div', { class: 'mail-page' }, heads);
  root.append(h('div', { class: 'mail-scroll' }, page));

  /* ── the recipient rows ── */
  const field = (label, list, extra) => {
    const chips = h('span', { class: 'mail-chips' });
    const input = h('input', {
      class: 'mail-in', type: 'text', spellcheck: 'false',
      'aria-label': label, autocomplete: 'off',
    });
    const wrap = h('div', { class: 'mail-row' },
      h('span', { class: 'mail-k' }, label),
      h('span', { class: 'mail-vals' }, chips, input),
      extra || null);

    let menu = null, hit = 0;
    const closeAc = () => { menu?.remove(); menu = null; };

    /* A recipient is a name, not a token in a box. One of them shows its
       address in full, because with a single recipient there is room and
       it is the thing you would check before sending. The box and the ×
       arrive under the pointer. */
    const paintChips = () => {
      chips.replaceChildren(...list.flatMap((p, i) => {
        /* the name is enough — the address is what you searched to find
           them, and repeating it back reads as a form field */
        const el = h('span', { class: 'mail-name', title: p.e },
          h('span', { class: 'mail-name-n' }, p.n || p.e),
          h('button', { class: 'mail-x', type: 'button',
                        'aria-label': 'Remove ' + (p.n || p.e),
                        onclick: () => { list.splice(i, 1); paintChips(); commit(); input.focus(); } },
            '\u00d7'));
        /* a dot after every one, the last included — the caret then sits
           after a separator rather than butted against a name */
        return [el, h('span', { class: 'mail-dot', 'aria-hidden': 'true' })];
      }));
    };

    /* the address book, matched the way a mail client matches: anywhere in
       the name or the address, with the matched run marked */
    const mark = (text, q) => {
      const i = text.toLowerCase().indexOf(q);
      if (i < 0) return [text];
      return [text.slice(0, i), h('b', {}, text.slice(i, i + q.length)), text.slice(i + q.length)];
    };
    const paintAc = () => {
      const q = input.value.trim().toLowerCase();
      closeAc();
      if (!q) return;
      const taken = new Set([...to, ...cc, ...bcc].map(x => x.e));
      const found = MAIL_BOOK
        .filter(p => !taken.has(p.e)
          && (p.n.toLowerCase().includes(q) || p.e.toLowerCase().includes(q)))
        .slice(0, 5);
      if (!found.length) return;
      hit = 0;
      menu = h('div', { class: 'mail-ac' }, found.map((p, i) => h('button', {
        class: 'mail-ac-row' + (i === hit ? ' is-on' : ''), type: 'button',
        onmouseenter: () => { hit = i; [...menu.children].forEach((c, j) =>
          c.classList.toggle('is-on', j === hit)); },
        onclick: () => { list.push(p); input.value = ''; paintChips(); commit();
                         closeAc(); input.focus(); },
      },
        h('span', { class: 'mail-ac-n' }, ...mark(p.n, q)),
        h('span', { class: 'mail-ac-e' }, ...mark(p.e, q)))));
      wrap.append(menu);
    };

    input.addEventListener('input', paintAc);
    input.addEventListener('blur', () => setTimeout(closeAc, 140));
    input.addEventListener('keydown', (e) => {
      const rows = menu ? [...menu.children] : [];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!rows.length) return;
        e.preventDefault();
        hit = (hit + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
        rows.forEach((c, j) => c.classList.toggle('is-on', j === hit));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (rows.length) rows[hit].click();
      } else if (e.key === 'Backspace' && !input.value && list.length) {
        list.pop(); paintChips(); commit();
      } else if (e.key === 'Escape') { closeAc(); }
    });

    paintChips();
    return wrap;
  };

  const ccBtns = () => h('span', { class: 'mail-cc-wrap' },
    showCc ? null : h('button', { class: 'mail-cc', type: 'button',
      onclick: () => { showCc = true; paintHeads(); } }, 'Cc'),
    showBcc ? null : h('button', { class: 'mail-cc', type: 'button',
      onclick: () => { showBcc = true; paintHeads(); } }, 'Bcc'));

  function paintHeads() {
    heads.replaceChildren(...[
      field('To', to, showCc && showBcc ? null : ccBtns()),
      showCc ? field('Cc', cc) : null,
      showBcc ? field('Bcc', bcc) : null,
      /* The subject does not need to say "Subject" — it is the bold line
         above the message, which is what a subject looks like everywhere
         a person has ever read one. */
      h('div', { class: 'mail-row mail-subj' },
        h('span', { class: 'mail-subj-v', contenteditable: 'true', spellcheck: 'false',
                    'data-empty': 'Subject',
                    oninput: (e) => { subject = e.currentTarget.textContent; commitSoon(); } },
          subject)),
    ].filter(Boolean));
  }

  /* ── the body ── */
  const body = h('div', { class: 'mail-body' });
  const paintBody = () => {
    body.replaceChildren(...blocks.map((b) => {
      if (b.t === 'ul') {
        return h('ul', { class: 'mail-ul' }, b.v.map((x, j) => h('li', {
          contenteditable: 'true', spellcheck: 'false',
          oninput: (e) => { b.v[j] = e.currentTarget.innerHTML; commitSoon(); }, html: x,
        })));
      }
      return h('p', {
        class: 'mail-p' + (b.t === 'strong' ? ' is-strong' : ''),
        contenteditable: 'true', spellcheck: 'false',
        oninput: (e) => { b.v = e.currentTarget.innerHTML; commitSoon(); }, html: b.v,
      });
    }));
  };
  page.append(body, bar);

  /* ── the bar, and asking for a change ── */
  const ask = h('input', { class: 'mail-ask-in', type: 'text',
    placeholder: 'Ask for changes', 'aria-label': 'Ask for changes', spellcheck: 'false' });

  const runAsk = () => {
    const q = ask.value.trim();
    if (!q) return ask.focus();
    ask.value = '';
    askGo.disabled = true;
    asking = false;
    paintBar();
    /* The ask goes into the conversation, because a change to the draft is
       something the assistant did and the thread is where its work is
       recorded. It comes back as a version, not a silent overwrite. */
    if (typeof askArtifact === 'function')
      askArtifact(a, q, !!opts.inline);
    else toast('Asked · ' + q);
  };
  ask.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); runAsk(); }
    if (e.key === 'Escape') { asking = false; paintBar(); }
  });
  /* the arrow only lights when there is something to send it */
  const askGo = h('button', { class: 'mail-ask-go', type: 'button', 'aria-label': 'Ask',
                              disabled: true, html: MAIL_UP, onclick: runAsk });
  ask.addEventListener('input', () => { askGo.disabled = !ask.value.trim(); });

  function paintBar() {
    bar.replaceChildren(
      asking
        ? h('div', { class: 'mail-ask' },
            h('span', { class: 'mail-ask-ic', 'aria-hidden': 'true', html: MAIL_PEN }),
            ask, askGo)
        : h('button', { class: 'mail-edit', type: 'button',
            onclick: () => { asking = true; paintBar();
                             requestAnimationFrame(() => ask.focus()); } },
            h('span', { class: 'mail-edit-ic', 'aria-hidden': 'true', html: MAIL_PEN }),
            'Edit'),
      h('span', { class: 'mail-bar-end' },
        hist.length > 1 ? h('span', { class: 'mail-hist' },
          h('button', { class: 'mail-ico', type: 'button', 'aria-label': 'Undo', title: 'Undo',
                        disabled: at === 0, html: MAIL_UNDO,
                        onclick: () => { clearTimeout(hold); commit(); if (at > 0) restore(at - 1); } }),
          h('button', { class: 'mail-ico', type: 'button', 'aria-label': 'Redo', title: 'Redo',
                        disabled: at >= hist.length - 1, html: MAIL_REDO,
                        onclick: () => { if (at < hist.length - 1) restore(at + 1); } }),
          h('span', { class: 'mail-sep', 'aria-hidden': 'true' })) : null,
        /* A word beside a mark, matching Edit at the other end. Two bare
           icons made the reader guess, and the arrow-out one was guessed
           wrong most often. */
        h('button', { class: 'mail-edit', type: 'button',
                      onclick: () => toast('Copied.') },
          h('span', { class: 'mail-edit-ic', 'aria-hidden': 'true', html: MAIL_COPY }),
          'Copy'),
        exportControl(a),
        h('button', { class: 'mail-send', type: 'button',
                      /* Sending is the one thing here that cannot be
                         taken back, so it is reported in the conversation
                         rather than in a toast that disappears. */
                      onclick: () => {
                        if (!to.length) return toast('Add someone in To first.');
                        persist();
                        if (typeof sentArtifact === 'function') sentArtifact(a, to, cc, !!opts.inline);
                        else toast('Sent · ' + to.map(x => x.n || x.e).join(', '));
                      } },
          h('span', { class: 'mail-send-ic', 'aria-hidden': 'true', html: MAIL_SEND }), 'Send')));
  }

  /* the selection toolbar belongs to the body, so it works inline as well
     as on the canvas */
  root.__askAbout = (scope, text) => {
    if (typeof askArtifact !== 'function') return toast('Asked · ' + text);
    askArtifact(a, scope ? text + ' — about: "' + scope + '"' : text, !!opts.inline);
  };
  root.__tb = selectionToolbar(body);

  paintHeads();
  paintBody();
  paintBar();
  return root;
}

/* The draft a live conversation produces. It is a real artifact — it
   lives in the library, versions, and opens on the canvas — because an
   email the assistant wrote is a thing you review, not a thing it sends. */
const MAIL = defineArtifact({
  id: 'mail-ai-roundup',
  kind: 'mail',
  name: 'What moved in AI this fortnight',
  ext: '',
  sub: 'Draft · to the team',
  to: [
    { n: 'Pavitar Singh',  e: 'pavitar.singh@unifyapps.com' },
    { n: 'Sumeet Nandal',  e: 'sumeet@unifyapps.com' },
  ],
  cc: [{ n: 'Shivam Satrawal', e: 'shivam@unifyapps.com' }],
  subject: 'What moved in AI this fortnight',
  blocks: [
    { t: 'p', v: 'Team,' },
    { t: 'p', v: 'A fortnightly round-up. Four things actually changed; the rest was noise.' },
    { t: 'ul', v: [
      '<b>Long context stopped being a headline.</b> A million tokens is now table stakes across the frontier labs, and the interesting number has moved to how much of that window a model can actually use well. Retrieval did not go away — it got cheaper to be wrong about.',
      '<b>Inference prices fell again.</b> Roughly 40% on the mid-tier models since the spring. Things we ruled out on cost eighteen months ago are worth costing again.',
      '<b>Open-weight models closed most of the gap on the everyday work.</b> Not on the hardest reasoning, but on classification, extraction and routing they are close enough that running them ourselves is a real option for the high-volume paths.',
      '<b>Small models got genuinely good at being routers.</b> Which is the piece that makes a routing layer worth building rather than a way to save money badly.',
    ] },
    { t: 'p', v: 'The pattern underneath all four:' },
    { t: 'strong', v: 'Capability is commoditising. What you feed the model, and how you know it worked, is not.' },
    { t: 'p', v: 'Two things I would take from it. <b>First</b>, the moat keeps moving toward context and evaluation — knowing what to retrieve, and knowing whether the answer was right. <b>Second</b>, cheaper inference is a product decision, not a finance one: at these prices we can afford to do more per request than we currently do, and we should decide deliberately what to spend it on.' },
    { t: 'p', v: 'For us that argues for staying hard on the Context Graph, evals, model routing and cost visibility — which is where we already are, so read this as confirmation rather than a change of plan.' },
    { t: 'p', v: 'Happy to go deeper on any of the four.' },
    { t: 'p', v: 'Rohan' },
  ],
});

/* The first pass listed what happened and stopped. What it was missing was
   the only part a reader cannot do for themselves — what it means for us —
   so the second adds the pattern and the two takeaways, and says which of
   them is arguable. Both are here, and switching changes the draft. */
MAIL.versions = [
  { name: 'What happened', when: 'Today · 09:41', by: 'Assistant',
    to: MAIL.to, cc: [], subject: 'AI round-up — last two weeks',
    blocks: [
      { t: 'p', v: 'Team,' },
      { t: 'p', v: 'A fortnightly round-up. Four things actually changed; the rest was noise.' },
      { t: 'ul', v: MAIL.blocks[2].v.slice() },
      { t: 'p', v: 'Happy to go deeper on any of the four.' },
      { t: 'p', v: 'Rohan' },
    ] },
  { name: 'With what it means for us', when: 'Today · 09:58', by: 'Assistant',
    to: MAIL.to, cc: MAIL.cc, subject: MAIL.subject, blocks: MAIL.blocks },
];

const RENDER = { deck: renderDeck, sheet: renderSheet, doc: renderDoc, app: renderApp, mail: renderMail };

let openKeyHandler = null;
/* Closing empties the panel on a delay so the slide-out has something to
   slide. Open something new inside that window — Edit with Chat does, because
   go('thread') closes first — and the stale timer wipes the panel you just
   filled. Hold the handle so a new open can cancel it. */
let clearPanelTimer = null;
let closeArtifact = () => {};

function openArtifact(a, { full = false } = {}) {
  const host = document.getElementById('artifactPanel');
  const main = document.getElementById('main');
  if (typeof a === 'string') a = ARTIFACTS[a];
  if (!a) return;

  const made = RENDER[a.kind](a);
  const body = made.body ?? made;   // deck returns a bundle, the rest return a node

  /* ── constructs every kind gets, wired once ── */
  const tb = selectionToolbar(body);

  const close = closeArtifact = () => {
    if (openKeyHandler) document.removeEventListener('keydown', openKeyHandler);
    openKeyHandler = null;
    tb.destroy();
    closePicker();
    /* a comment popover lives on the body, so closing the artifact has to
       take it with it — otherwise it outlives the thing it was about */
    document.querySelectorAll('.cmt-pop').forEach(n => n.remove());
    made.onClose?.();
    main.dataset.artifact = 'closed';
    main.dataset.expanded = 'false';
    if (typeof clearArtifactHash === 'function') clearArtifactHash();
    clearTimeout(clearPanelTimer);
    clearPanelTimer = setTimeout(() => { host.replaceChildren(); clearPanelTimer = null; }, 260);
  };

  openKeyHandler = (e) => {
    if (e.target.closest('textarea, input, [contenteditable]')) return;
    if (e.key === 'Escape') {
      if (main.dataset.expanded === 'true') {
        main.dataset.expanded = 'false';
        made.onExpand?.(false);
        paintChatBtn();
      } else return close();
    }
    made.onKey?.(e);
  };

  /* ── the name, renamed where it is written ──
     A title you can only change through a menu is a title you do not
     change. This one takes a caret on click; Enter and clicking away
     keep it, Escape puts it back. */
  const nameEl = h('span', {
    class: 'deck-title-name', contenteditable: 'plaintext-only', spellcheck: 'false',
    role: 'textbox', 'aria-label': 'Name', title: 'Rename',
  });
  nameEl.textContent = a.name;
  let wasName = a.name;
  const settle = (keep) => {
    const next = nameEl.textContent.replace(/\s+/g, ' ').trim();
    if (keep && next && next !== a.name) {
      renameArtifact(a, next);
      toast('Renamed');
    }
    /* whatever happened, the header shows the name the artifact now has */
    nameEl.textContent = a.name;
  };
  nameEl.addEventListener('focus', () => { wasName = a.name; nameEl.dataset.editing = 'true'; });
  nameEl.addEventListener('blur', () => { delete nameEl.dataset.editing; settle(true); });
  nameEl.addEventListener('keydown', (e) => {
    /* the artifact's own Escape closes the panel, which would throw the
       edit away along with it */
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); settle(true); nameEl.blur(); }
    else if (e.key === 'Escape') { nameEl.textContent = wasName; settle(false); nameEl.blur(); }
  });
  /* Full screen, opened from the library, has no conversation beside it —
     so the header stops carrying the controls that belong to one. What is
     left to do to the thing itself moves onto its name, which is where a
     file's own menu lives in every application that has one. */
  const nameBtn = h('button', {
    class: 'deck-title-btn', type: 'button', 'aria-haspopup': 'menu',
    onclick: (e) => { e.stopPropagation(); titleMenu(e.currentTarget); },
  },
    h('span', { class: 'deck-title-name' }, a.name),
    h('span', { class: 'caret', 'aria-hidden': 'true' }));

  /* A template's menu would be Rename over a name you can already type
     into, and Delete over a row that already offers it — so it has no
     menu, and the name is the name. */
  const titleEl = h('div', { class: 'deck-title' }, full && a.kind !== 'template' ? nameBtn : nameEl);

  /* Rename hands the header back to the same editable name the panelled
     view uses, so there is one way to type a name and not two. */
  const startRename = () => {
    titleEl.replaceChildren(nameEl);
    nameEl.textContent = a.name;
    nameEl.focus();
    const r = document.createRange();
    r.selectNodeContents(nameEl); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    nameEl.addEventListener('blur', () => {
      nameBtn.querySelector('.deck-title-name').textContent = a.name;
      titleEl.replaceChildren(nameBtn);
    }, { once: true });
  };

  function titleMenu(anchor) {
    closeMenu();
    const row = (label, opts = {}) => h('button', {
      class: 'menu-item' + (opts.danger ? ' danger' : ''),
      type: 'button', role: 'menuitem',
      html: opts.icon ? MI(GLYPHS[opts.icon]) : '',
      /* a cascade opens under the pointer, the way a submenu does
         everywhere — clicking it works too, for anyone who tries */
      onmouseenter: (e) => {
        if (opts.sub) opts.sub(e.currentTarget);
        else document.querySelectorAll('.menu-sub').forEach(n => n.remove());
      },
      onclick: (e) => {
        if (opts.sub) { e.stopPropagation(); return opts.sub(e.currentTarget); }
        closeMenu(); opts.run?.();
      },
    },
      h('span', { class: 'menu-label' }, label),
      opts.sub ? h('span', { class: 'menu-more', 'aria-hidden': 'true' }) : null);

    /* the versions, cascading off their own row rather than replacing the
       menu they were chosen from */
    const versionsSub = (rowEl) => {
      if (document.querySelector('.menu-sub')) return;   // already up
      const sub = h('div', { class: 'menu menu-sub', role: 'menu' },
        a.versions.map((v, i) => h('button', {
          class: 'ver-row' + (i === currentIndex(a) ? ' is-on' : ''),
          type: 'button', role: 'menuitem',
          onclick: () => { closeMenu(); a.vi = i; reopen(); },
        },
          h('span', { class: 'ver-row-tag' }, versionLabel(a, i)),
          /* when it was made is what tells one version from another; who
             made it is the same answer on nearly every row */
          h('span', { class: 'ver-row-main' },
            h('span', { class: 'ver-row-when' }, v.when)))));
      document.body.append(sub);
      const r = rowEl.getBoundingClientRect();
      const w = sub.offsetWidth, hgt = sub.offsetHeight;
      sub.style.left = (r.right + 4 + w > innerWidth - 12 ? r.left - w - 4 : r.right + 4) + 'px';
      sub.style.top = Math.max(12, Math.min(r.top - 5, innerHeight - hgt - 12)) + 'px';
      sub.addEventListener('click', (e) => e.stopPropagation());
    };

    const el = h('div', { class: 'menu', role: 'menu' },
      row('Rename', { icon: 'rename', run: startRename }),
      a.versions ? row('Versions', { icon: 'files', sub: versionsSub }) : null,
      h('div', { class: 'menu-rule' }),
      row('Delete', { icon: 'trash', danger: true,
                      run: () => a.onDelete ? a.onDelete() : toast('Deleting comes in the next pass.') }));

    document.body.append(el);
    openMenu = el;
    const r = anchor.getBoundingClientRect();
    el.style.top = (r.bottom + 6) + 'px';
    el.style.left = Math.max(12, Math.min(r.left, innerWidth - el.offsetWidth - 12)) + 'px';
    el.classList.add('opening');
    el.addEventListener('click', (e) => e.stopPropagation());
  }

  const ic = (d, label, run) => h('button', {
    class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': label, title: label,
    onclick: run,
    html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>',
  });

  /* ── version history, identical for every kind ── */
  /* a version is a point in time, not a title — the number and the date
     are the whole of what anyone needs to pick one */
  const vBtn = a.versions ? h('button', {
    class: 'ver-btn', type: 'button', 'aria-haspopup': 'dialog',
    'aria-label': 'Version history',
    onclick: (e) => { e.stopPropagation(); openHistory(e.currentTarget); },
  },
    h('span', { class: 'ver-tag' }, versionLabel(a, currentIndex(a))),
    h('span', { class: 'caret', 'aria-hidden': 'true' }),
  ) : null;

  function openHistory(anchor) {
    closeMenu();
    const rows = a.versions.map((v, i) => {
      const latest = i === a.versions.length - 1;
      return h('button', {
        class: 'ver-row' + (i === currentIndex(a) ? ' is-on' : ''),
        type: 'button',
        onclick: () => { closeMenu(); a.vi = i; reopen(); },
      },
        h('span', { class: 'ver-row-tag' }, versionLabel(a, i)),
        h('span', { class: 'ver-row-main' },
          h('span', { class: 'ver-row-when' }, v.when),
          h('span', { class: 'ver-row-by' }, v.by)),
        latest ? h('span', { class: 'ver-row-flag' }, 'Latest') : null,
      );
    }).reverse();

    const el = h('div', { class: 'menu ver-menu', role: 'dialog', 'aria-label': 'Version history' },
      h('div', { class: 'ver-head' }, 'Version history'),
      h('div', { class: 'ver-list' }, rows));
    document.body.append(el);
    openMenu = el;
    const r = anchor.getBoundingClientRect();
    el.style.top = Math.min(r.bottom + 6, innerHeight - el.offsetHeight - 12) + 'px';
    el.style.left = Math.max(12, Math.min(r.left, innerWidth - el.offsetWidth - 12)) + 'px';
    el.classList.add('opening');
    el.addEventListener('click', (e) => e.stopPropagation());
  }

  /* viewing an older version is read-only, and says so */
  const banner = !isCurrentVersion(a) ? h('div', { class: 'ver-banner' },
    h('span', { class: 'ver-banner-t' },
      'Viewing ', h('b', {}, versionLabel(a, currentIndex(a))),
      ` · ${versionOf(a).when} · ${versionOf(a).by}`),
    h('div', { class: 'ver-banner-a' },
      h('button', {
        class: 'btn btn-quiet', type: 'button',
        onclick: () => { a.vi = a.versions.length - 1; reopen(); },
      }, 'Back to latest'),
      h('button', {
        class: 'btn btn--primary', type: 'button',
        onclick: () => {
          const from = versionLabel(a, currentIndex(a));
          restoreVersion(a);
          reopen();
          toast(`Restored ${from} as ${versionLabel(a, currentIndex(a))}.`);
        },
      }, 'Restore this version')),
  ) : null;

  const shell = h('div', {
    class: 'artifact-shell',
    'data-readonly': String(!isCurrentVersion(a)),
  }, body);

  /* a version change re-renders the body, so the panel is simply reopened */
  const reopen = () => {
    const keep = main.dataset.expanded;
    openArtifact(a, { full });
    main.dataset.expanded = keep;
  };

  /* One button, two jobs, so it has to show which one it is about to do:
     arrows out to take the window, arrows in to give it back. Leaving full
     screen is what puts the conversation beside the artifact again, and if
     the artifact came out of a session, goes to that session. */
  const EXPAND_D   = '<path d="M14 4.5h5.5V10"/><path d="M10 19.5H4.5V14"/>'
                   + '<path d="M19.5 4.5l-7 7"/><path d="M4.5 19.5l7-7"/>';
  /* the same arrows, turned around — leaving full screen is the mirror of
     entering it, so the icon is too */
  const CONTRACT_D = '<path d="M19.5 10H14V4.5"/><path d="M4.5 14H10v5.5"/>'
                   + '<path d="M14 10l5.5-5.5"/><path d="M10 14l-5.5 5.5"/>';

  const chatBtn = ic(EXPAND_D, 'Full screen', () => {
    const showing = main.dataset.expanded !== 'true';
    if (showing) {
      main.dataset.expanded = 'true';
      made.onExpand?.(true);
      paintChatBtn();
      return;
    }
    const ses = a.session?.() || ((typeof SESSIONS !== 'undefined')
      && SESSIONS.find(x => x.artifact === a.id));
    if (ses && (!thread || thread.title !== ses.label)) {
      openSession(ses);
      openArtifact(a);
      return;
    }
    main.dataset.expanded = 'false';
    made.onExpand?.(false);
    paintChatBtn();
  });

  function paintChatBtn() {
    const wide = main.dataset.expanded === 'true';
    const label = wide ? 'Exit full screen' : 'Full screen';
    chatBtn.setAttribute('aria-label', label);
    chatBtn.title = label;
    chatBtn.querySelector('svg').innerHTML = wide ? CONTRACT_D : EXPAND_D;
  }
  paintChatBtn();

  /* Opened from the library the artifact has the window and no conversation
     to speak to, which is the only way to change it. This goes to the
     session that produced it and leaves the artifact open beside it. */
  const editBtn = h('button', {
    class: 'xp-btn xp-edit', type: 'button',
    title: 'Open the conversation and change this',
    onclick: () => {
      /* an artifact can name the conversation it is edited in — one made
         outside a chat has none to go back to until it asks for one */
      const ses = a.session?.() || ((typeof SESSIONS !== 'undefined')
        && SESSIONS.find(x => x.artifact === a.id));
      if (ses && (!thread || thread.title !== ses.label)) {
        openSession(ses);
        openArtifact(a);
        return;
      }
      main.dataset.expanded = 'false';
      made.onExpand?.(false);
      paintChatBtn();
    },
  },
    h('span', { class: 'xp-lock', 'aria-hidden': 'true',
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
          + 'stroke-linecap="round" stroke-linejoin="round">'
          /* a bubble with a tail, drawn as one closed path — the lopsided
             teardrop it replaced read as a comma at 15 pixels */
          + '<path d="M6.8 4.8h10.4a3 3 0 0 1 3 3v5.9a3 3 0 0 1-3 3h-5.1L8 20.2v-3.5H6.8'
          + 'a3 3 0 0 1-3-3V7.8a3 3 0 0 1 3-3z"/>'
          + '</svg>' }),
    'Edit with Chat');

  /* Share is the conversation's; this is the artifact's — turning the thing
     into a page with an address. Same shape as Share so they read as one
     family, a play mark because that is what it does: makes it run. */
  const pubMark = h('span', { class: 'xp-lock', 'aria-hidden': 'true' });
  const pubBtn = h('button', {
    class: 'xp-btn xp-publish', type: 'button',
    onclick: (e) => {
      e.stopPropagation();
      a.onPublish ? a.onPublish(pubBtn, paintPub) : siteDialog(a, paintPub);
    },
  }, pubMark, 'Publish');

  function paintPub() {
    if (a.pubInfo) {
      const p = a.pubInfo();
      pubMark.innerHTML = p.state === 'off'
        ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
          + '<path d="M8 5.6a1 1 0 0 1 1.52-.85l8.1 5.4a1 1 0 0 1 0 1.7l-8.1 5.4A1 1 0 0 1 8 16.4z"/></svg>'
        : pubIcon('org');
      pubBtn.dataset.scope = p.state === 'off' ? 'off' : 'org';
      pubBtn.dataset.state = p.state;
      pubBtn.title = p.title;
      pubBtn.lastChild.textContent = p.label || 'Publish';
      return;
    }
    const P = a.publish;
    const live = !!P?.published;
    const latest = a.versions ? a.versions.length - 1 : 0;
    const stale = live && P.version != null && P.version !== latest;

    pubMark.innerHTML = live
      ? pubIcon({ org: 'org', public: 'link', chat: 'people', restricted: 'me' }[P.scope] || 'org')
      : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
        + '<path d="M8 5.6a1 1 0 0 1 1.52-.85l8.1 5.4a1 1 0 0 1 0 1.7l-8.1 5.4A1 1 0 0 1 8 16.4z"/>'
        + '</svg>';
    pubBtn.dataset.scope = live ? P.scope : 'off';
    pubBtn.dataset.state = !live ? 'off' : stale ? 'stale' : 'live';
    pubBtn.title = !live
      ? `Publish this ${NOUN[a.kind]} as a page`
      : stale
        ? `${versionLabel(a, latest)} is not published — `
          + `${versionLabel(a, P.version)} is the one people can view`
        : `Live at ${P.slug}.unifyapps.com`;
  }
  paintPub();

  const view = h('div', {
    class: 'deck-view', 'data-kind': a.kind,
    'data-banner': String(!!banner),
  },
    h('header', { class: 'deck-top' },
      /* controls that act on the panel beside the canvas belong over that
         panel, not in the row of actions that act on the artifact */
      made.lead?.length ? h('div', { class: 'deck-top-lead' }, made.lead) : null,
      /* Edit with Chat belongs to the thing named beside it, not to the
         row of exports and controls at the far end — so in full screen it
         sits with the title and takes no box there. Beside a chat the
         panel is too narrow to spend the width: the title would shrink to
         nothing to make room for it. */
      /* a template's conversation is reached from the list, not from over
         the document — nothing stands on the page that is not the page */
      h('div', { class: 'deck-top-l' }, titleEl, full && a.kind !== 'template' ? editBtn : null),
      h('div', { class: 'deck-top-actions' },
        /* versions live on the name in full screen, and comments and the
           full-screen toggle belong to a panel beside a conversation —
           there is no conversation here */
        full ? null : vBtn,
        ...(made.extras || []),
        full || a.kind === 'agent' || a.kind === 'template' ? null : editBtn,
        full ? null : commentLayer(a, shell),
        /* a draft carries its own destination at the foot, beside Send —
           where it belongs, since sending and exporting are the same
           decision made two different ways */
        a.kind === 'mail' || !EXPORT[a.kind] ? null : exportControl(a),
        a.kind === 'agent' ? null : pubBtn,
        full ? null : chatBtn,
        ic('<path d="M6 6l12 12M18 6L6 18"/>', 'Close', close),
      ),
    ),
    banner,
    shell,
    made.foot ? h('footer', { class: 'deck-foot' }, made.foot) : null,
  );

  clearTimeout(clearPanelTimer);
  clearPanelTimer = null;
  document.querySelectorAll('.cmt-pop').forEach(n => n.remove());
  host.replaceChildren(view);
  main.dataset.artifact = 'open';
  if (full) { main.dataset.expanded = 'true'; made.onExpand?.(true); }
  paintChatBtn();
  document.addEventListener('keydown', openKeyHandler);
  return view;
}

/* A name lives in more than one place — the card in the thread, the card
   in the library — so changing it changes all of them rather than only
   the header it was typed into. A library entry with its own `as` is
   someone else's label for it and stays as it is. */
function renameArtifact(a, name) {
  const next = String(name).replace(/\s+/g, ' ').trim();
  if (!next || next === a.name) return false;
  a.name = next;
  document.querySelectorAll(`.artifact[data-art="${a.id}"] .artifact-name`)
    .forEach(n => { n.textContent = next; });
  document.querySelectorAll(`.lib-card[data-art="${a.id}"]:not([data-as]) .lib-name`)
    .forEach(n => { n.textContent = next; });
  return true;
}

/* ── the card that stands for an artifact in the conversation ── */
/* Each mark is the real product's colour with one structural idea: a stand
   for the deck, a header band and cells for the sheet, a spine and ruled
   lines for the doc, plotted bars for the interactive one. Flat squares with
   a glyph in the middle read as filetype chips, not as artifacts. */
const KIND_ICON = {
  deck:
      '<rect x="2" y="3" width="20" height="14.5" rx="2.4" fill="#D2492B"/>'
    + '<rect x="2" y="3" width="20" height="4" rx="2.4" fill="#B23A20"/>'
    + '<rect x="5.5" y="9" width="8.5" height="5.5" rx="1" fill="#fff"/>'
    + '<circle cx="17.5" cy="11.75" r="2.1" fill="#fff" opacity=".55"/>'
    + '<path d="M12 17.5v3M8.5 20.5h7" stroke="#D2492B" stroke-width="1.7" '
    + 'stroke-linecap="round" fill="none"/>',
  sheet:
      '<rect x="2.5" y="2.5" width="19" height="19" rx="2.6" fill="#12894C"/>'
    + '<rect x="2.5" y="2.5" width="19" height="5.4" rx="2.6" fill="#0C6739"/>'
    + '<rect x="2.5" y="5.4" width="19" height="2.5" fill="#0C6739"/>'
    + '<g fill="#fff">'
    + '<rect x="5.4" y="10" width="5.6" height="3.4" rx=".7"/>'
    + '<rect x="13" y="10" width="5.6" height="3.4" rx=".7"/>'
    + '<rect x="5.4" y="15.1" width="5.6" height="3.4" rx=".7" opacity=".7"/>'
    + '<rect x="13" y="15.1" width="5.6" height="3.4" rx=".7"/></g>',
  doc:
      '<rect x="3" y="2" width="18" height="20" rx="2.5" fill="#2F6FD0"/>'
    + '<path d="M3 4.5A2.5 2.5 0 0 1 5.5 2H8v20H5.5A2.5 2.5 0 0 1 3 19.5z" fill="#1E4E9C"/>'
    + '<g stroke="#fff" stroke-width="1.6" stroke-linecap="round">'
    + '<path d="M11 7.5h6.5"/><path d="M11 12h6.5"/><path d="M11 16.5h4"/></g>',
  /* The three Office kinds carry their products' colours, so this one gets a
     real product colour too rather than the workspace's forest green — dark
     read as heavy next to them, and a live page is the optimistic thing in
     the set. Violet is the one hue none of the three occupies. */
  app:
      '<rect x="2" y="3.5" width="20" height="17" rx="2.6" fill="#6B4FD8"/>'
    + '<rect x="2" y="3.5" width="20" height="3.6" rx="2.6" fill="#5237BC"/>'
    + '<g stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none">'
    + '<path d="M6.5 17v-3.4"/><path d="M11 17v-6.4"/><path d="M15.5 17v-2.2"/></g>'
    + '<path d="M19.5 17v-5" stroke="#5CE0A5" stroke-width="2" stroke-linecap="round" fill="none"/>',
};

const KIND_LABEL = { deck: 'Presentation', sheet: 'Spreadsheet', doc: 'Document', app: 'Interactive HTML', mail: 'Email' };

/* the short form the library uses — a card has no room for a sentence */
const KIND_SHORT = { deck: 'PPT', sheet: 'XLS', doc: 'DOC', app: 'HTML', mail: 'MAIL' };

/* The Office kinds carry the real product artwork. These render through
   <img>, which keeps each file its own document — the gradient ids in the
   2025 marks (linear0, radial0…) are identical across products and would
   collide the moment two were inlined into one DOM. */
const KIND_ART = {
  mail:  'assets/brand/outlook.svg',
  deck:  'assets/brand/powerpoint.svg',
  sheet: 'assets/brand/excel.svg',
  doc:   'assets/brand/word.svg',
};

const kindMark = (kind) => KIND_ART[kind]
  ? `<img src="${KIND_ART[kind]}" alt="" aria-hidden="true">`
  : `<svg viewBox="0 0 24 24" aria-hidden="true">${KIND_ICON[kind]}</svg>`;

function artifactCard(a = DECK) {
  if (typeof a === 'string') a = ARTIFACTS[a];
  return h('button', {
    class: 'artifact', type: 'button', 'data-art': a.id, onclick: () => openArtifact(a),
  },
    h('span', { class: 'artifact-ico', html: kindMark(a.kind) }),
    h('span', { class: 'artifact-text' },
      h('span', { class: 'artifact-name' }, a.name),
      /* the extension is on the icon; what you cannot see from the card is
         which version of it this turn produced */
      h('span', { class: 'artifact-sub' },
        KIND_LABEL[a.kind]
        + (a.versions ? ` · Version ${currentIndex(a) + 1}` : ''))),
    h('span', { class: 'artifact-open' }, 'Open'),
  );
}


/* ── the wall a shared link puts you behind ──────────────────
   What someone sees when they open a link to something they cannot read.
   It has one job and then a second: say plainly that they are locked out,
   and give them the one move that gets them in — asking, with a sentence
   about why, because "requested access" with no context is a decision the
   owner cannot make.

   It is deliberately not the workspace. Somebody arriving here may not
   have an account at all, and a rail full of somebody else's chats behind
   a dialog would be the wrong thing to show them. */
const ACCESS_VIEWER = 'Priya Raman';   /* whoever opened the link */

function accessWall(a) {
  if (typeof a === 'string') a = ARTIFACTS[a];
  a = a || ARTIFACTS['app-pipeline'];
  const owner = 'Roger Bennett';
  const me = ACCESS_VIEWER;

  document.querySelector('.aw')?.remove();
  /* Mounted in the main region, not over the whole window: being shut out
     of one page is not being shut out of the product, and the rail is how
     you get to everything this account can still reach. */
  const host = document.getElementById('main') || document.body;

  const glyph = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';

  const card = h('div', { class: 'aw-card', role: 'dialog', 'aria-label': 'Request access' });
  const wall = h('div', { class: 'aw' }, card);

  const close = () => { wall.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  };

  /* ── asking ── */
  const ask = () => {
    const note = h('textarea', {
      class: 'aw-note', rows: '3',
      placeholder: 'Add a note to request access',
      'aria-label': 'Message to the owner',
    });
    const send = h('button', { class: 'btn btn--primary aw-send', type: 'button' },
      'Request access');
    send.onclick = () => sent();

    card.replaceChildren(
      h('span', { class: 'aw-ic', 'aria-hidden': 'true', html: glyph(PUB_IC.me) }),
      h('h1', { class: 'aw-h' }, 'You need access to this artifact'),
      h('p', { class: 'aw-p' },
        'Ask ', h('b', {}, owner.split(' ')[0]), ' for access to this artifact.'),
      h('div', { class: 'aw-thing' },
        h('span', { class: 'aw-thing-ic', html: kindMark(a.kind) }),
        h('span', { class: 'aw-thing-t' },
          h('span', { class: 'aw-thing-n' }, a.name),
          h('span', { class: 'aw-thing-s' }, `${KIND_LABEL[a.kind]} \u00b7 Owner ${owner}`))),
      note,
      send);
    queueMicrotask(() => note.focus());
  };

  /* ── asked ── */
  const sent = () => {
    card.replaceChildren(
      h('span', { class: 'aw-ic aw-ic-ok', 'aria-hidden': 'true',
                  html: glyph('<path d="M5 12.5l4.5 4.5L19 7"/>') }),
      h('h1', { class: 'aw-h' }, 'Request sent'),
      h('p', { class: 'aw-p' },
        'Your request to share this artifact with you has been sent to ',
        h('b', {}, owner), '.'),
      h('button', {
        class: 'btn btn--primary aw-send', type: 'button',
        onclick: () => { close(); location.hash = '#artifacts'; },
      }, 'Back to artifacts'));
  };

  ask();
  host.append(wall);
  document.addEventListener('keydown', onKey);
  return wall;
}

/* ── the other end of a request ──────────────────────────────
   What lands in the owner's inbox. It exists on its own address because
   an email is not a screen in the product — it is the one place the
   decision gets made, and it gets made by somebody who is not looking at
   the workspace at the time.

   Everything the owner needs to answer is on it: who is asking, from what
   address, what they said, and what they are asking for. Granting is one
   button, and the role sits next to it because "grant access" without
   saying which access is the question the share dialog already answers. */
function emailPage(a) {
  if (typeof a === 'string') a = ARTIFACTS[a];
  a = a || ARTIFACTS['app-pipeline'];
  const owner = 'Roger Bennett';
  const who = ACCESS_VIEWER;
  const note = 'Matt asked me to pick up Orion and Ashford while he is out. '
             + 'I need the at-risk list to work the two that are waiting on us.';

  const card = h('div', { class: 'em-card' });
  const page = h('div', { class: 'em' },
    h('div', { class: 'em-bar' },
      h('span', { class: 'em-brand', 'aria-hidden': 'true',
                  html: '<svg><use href="#i-wordmark"></use></svg>' }),
      h('span', { class: 'em-bar-s' }, 'Notification')),
    card);

  const ask = () => {
    card.replaceChildren(
      h('h1', { class: 'em-subj' }, `${who} is requesting access to ${a.name}`),
      h('div', { class: 'em-from' },
        h('span', { class: 'em-logo', 'aria-hidden': 'true',
                    html: '<svg><use href="#i-logomark"></use></svg>' }),
        h('span', { class: 'em-from-t' },
          h('span', { class: 'em-from-n' },
            'UnifyApps ', h('span', { class: 'em-addr' }, '<notifications@unifyapps.com>')),
          h('span', { class: 'em-from-s' }, `to ${mailOf(owner)}`)),
        h('span', { class: 'em-when' }, '09:14')),

      h('div', { class: 'em-body' },
        h('p', { class: 'em-p' }, `Hi ${owner.split(' ')[0]},`),
        /* Name, address and what they want, in one sentence. It was three
           things — a line, a person row with a face, and the artifact —
           saying what one line says. */
        h('p', { class: 'em-p' },
          h('b', {}, who), ' (', mailOf(who), ') is requesting access to the '
          + 'artifact below.'),

        /* their words, not a summary of them — this is what the decision
           is actually made on */
        h('div', { class: 'em-quote' }, note),

        h('div', { class: 'em-thing' },
          h('span', { class: 'em-thing-ic', html: kindMark(a.kind) }),
          h('span', { class: 'em-thing-t' },
            h('span', { class: 'em-thing-n' }, a.name),
            h('span', { class: 'em-thing-s' }, `${KIND_LABEL[a.kind]} \u00b7 Owner you`))),

        /* Two answers, two buttons. Choosing the role here was a third
           decision in front of the only two that matter, and the share
           dialog is where a role gets changed anyway. */
        h('div', { class: 'em-act' },
          h('button', { class: 'btn btn--primary', type: 'button', onclick: () => done() },
            'Grant access'),
          h('button', { class: 'btn', type: 'button', onclick: () => declined() },
            'Decline this request'))),

      h('div', { class: 'em-foot' },
        `You are getting this because you own ${a.name}. `
        + 'Requests come to the owner only.'));
  };

  const shell = (ic, cls, head, ...rest) => card.replaceChildren(
    h('span', { class: 'em-ic ' + cls, 'aria-hidden': 'true',
                html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                    + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
                    + ic + '</svg>' }),
    h('h1', { class: 'em-h' }, head),
    ...rest);

  const done = () => shell(
    '<path d="M5 12.5l4.5 4.5L19 7"/>', 'em-ic-ok',
    'Access granted',
    h('p', { class: 'em-p' },
      h('b', {}, who), ' can now open ', h('b', {}, a.name),
      `. They have been told, and ${a.name} is in their Artifacts now.`),
    h('div', { class: 'em-ways' },
      h('a', { class: 'em-back', href: `index.html#artifact/${a.id}` },
        `Open ${a.name} \u2192`),
      h('button', { class: 'em-back em-back-q', type: 'button', onclick: ask }, 'Undo')));

  const declined = () => shell(
    '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', '',
    'Request declined',
    h('p', { class: 'em-p' },
      h('b', {}, who), ' has not been told anything beyond that the request was '
      + 'not granted. Nothing about ', h('b', {}, a.name), ' was shared.'),
    h('button', { class: 'em-back', type: 'button', onclick: ask },
      'Undo'));

  ask();
  return page;
}

/* ── a link that leads nowhere ────────────────────────────────
   The other way a shared link fails. Not "you are locked out" — there is
   nothing here to be locked out of, which is a different sentence and a
   different next move: the person who sent it has to send another.

   Same shell as the access wall, and the rail stays for the same reason:
   one dead address is not the product being gone. */
function notFound() {
  document.querySelector('.aw')?.remove();
  const host = document.getElementById('main') || document.body;

  const card = h('div', { class: 'aw-card', role: 'alert' });
  const wall = h('div', { class: 'aw' }, card);

  const close = () => { wall.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };

  card.replaceChildren(
    h('span', { class: 'aw-ic', 'aria-hidden': 'true',
                /* Two halves of a chain pulled apart, with the snap marks
                   that make it read as broken rather than as a link. The
                   first pass drew them still joined, which is the icon for
                   a link that works. */
                html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                    + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
                    + '<path d="M18.8 12.3 20.6 10.5a5 5 0 0 0-7.1-7.1L11.8 5.2"/>'
                    + '<path d="M5.2 11.7 3.4 13.5a5 5 0 0 0 7.1 7.1l1.7-1.7"/>'
                    + '<path d="M8 2v3M2 8h3M16 19v3M19 16h3"/>'
                    + '</svg>' }),
    h('h1', { class: 'aw-h' }, 'This artifact link is broken'),
    /* Two possibilities and nothing else. Telling someone to go and ask
       is advice they did not need — they know who sent it. */
    h('p', { class: 'aw-p' },
      'The artifact may have been deleted, or the link is invalid.'),
    h('button', {
      class: 'btn btn--primary aw-send', type: 'button',
      onclick: () => { close(); location.hash = '#artifacts'; },
    }, 'Back to artifacts'));

  host.append(wall);
  document.addEventListener('keydown', onKey);
  return wall;
}

/* ------------------------------------------------------------------
   The library.

   A card is mostly its own preview: the thing itself, scaled down and
   inert, because a grid of identical file icons tells you nothing.
------------------------------------------------------------------ */

const LIBRARY = [
  { id: 'deck-ai-adoption', owner: 'me', when: 'Today · 11:47', by: 'You', tint: 'sand',
    shared: 4 },
  { id: 'sheet-churn', owner: 'me', when: 'Today · 09:12', by: 'You', tint: 'mint',
    shared: 2 },
  { id: 'doc-renewal-brief', owner: 'me', when: 'Today · 07:30', by: 'You', tint: 'blush',
    shared: 0 },
  { id: 'app-pipeline', owner: 'me', when: 'Yesterday · 16:04', by: 'You', tint: 'sky',
    shared: 6 },
  { id: 'deck-ai-adoption', owner: 'shared', when: '25 Aug · 14:20', by: 'Ananya Rao', tint: 'lilac',
    as: 'Q3 board pack',
    shared: 9 },
  { id: 'sheet-churn', owner: 'shared', when: '24 Aug · 10:55', by: 'Dan Whitfield', tint: 'stone',
    as: 'Renewal watchlist',
    shared: 3 },
  { id: 'app-pipeline', owner: 'shared', when: '22 Aug · 09:41', by: 'Priya Raman', tint: 'sand',
    as: 'Strategic accounts view',
    shared: 5 },
  { id: 'doc-renewal-brief', owner: 'shared', when: '20 Aug · 17:06', by: 'Sana Kaur', tint: 'mint',
    as: 'Emirates NBD brief',
    shared: 2 },
];

/* A preview is the artifact's real content, small — placeholder bars say
   nothing about which document you are looking at. */
function previewEl(a) {
  if (a.kind === 'deck') {
    return h('div', { class: 'lib-prev lib-prev-deck' },
      slideEl(a.slides[0], 0, a.slides.length, { thumb: true }),
      h('span', { class: 'lib-prev-tag' }, `${a.slides.length} slides`));
  }

  if (a.kind === 'sheet') {
    const sh = a.sheets[0];
    return h('div', { class: 'lib-prev lib-prev-sheet' },
      h('div', { class: 'mini-sheet' },
        h('div', { class: 'mini-row mini-head' },
          sh.cols.slice(0, 4).map(c => h('span', {}, c))),
        sh.rows.slice(0, 7).map(r => h('div', { class: 'mini-row' },
          r.slice(0, 4).map((v, i) => h('span', {
            class: i === 3 && v.startsWith('-') ? 'mini-neg' : '',
          }, v))))));
  }

  if (a.kind === 'doc') {
    const blocks = a.versions[a.versions.length - 1].blocks;
    return h('div', { class: 'lib-prev lib-prev-doc' },
      h('div', { class: 'mini-doc' }, blocks.slice(0, 5).map(b => {
        if (b.t === 'h1')   return h('div', { class: 'mini-doc-h' }, b.v);
        if (b.t === 'h2')   return h('div', { class: 'mini-doc-h2' }, b.v);
        if (b.t === 'meta') return h('div', { class: 'mini-doc-meta' }, b.v);
        if (b.t === 'ul')   return h('div', { class: 'mini-doc-p' }, '· ' + b.v[0]);
        return h('div', { class: 'mini-doc-p' }, b.v);
      })));
  }

  /* a letter, at thumbnail size: who it is to, what it is about, and the
     first thing it says. Without this a mail artifact fell through to the
     pipeline preview and asked a draft email for its opportunities. */
  if (a.kind === 'mail') {
    const v = a.versions[a.versions.length - 1];
    const lines = (v.blocks || []).filter(b => b.t === 'p').slice(0, 3);
    return h('div', { class: 'lib-prev lib-prev-doc' },
      h('div', { class: 'mini-doc' },
        h('div', { class: 'mini-doc-meta' }, 'To ' + (v.to || []).join(', ')),
        h('div', { class: 'mini-doc-h' }, v.subject || a.name),
        lines.map(b => h('div', { class: 'mini-doc-p' },
          String(b.v).replace(/<[^>]+>/g, '')))));
  }

  const opps = a.versions[a.versions.length - 1].opps
    .filter(o => PIPE_OPEN.includes(o.stage));
  const top = [...opps].sort((x, y) => y.amount - x.amount).slice(0, 6);
  const max = top[0].amount;
  return h('div', { class: 'lib-prev lib-prev-app' },
    h('div', { class: 'mini-chart' },
      h('div', { class: 'mini-kpi' },
        h('b', {}, usdM(a.q.commit)),
        h('span', {}, `commit · ${usdM(a.q.gap)} short`)),
      top.map(o => h('div', { class: 'mini-bar-row' },
        h('span', { class: 'mini-bar-l' }, PIPE_ACCOUNTS[o.acct].name),
        h('span', { class: 'mini-bar-t' },
          h('span', { class: 'mini-bar', style: `--w:${(o.amount / max) * 100}%`,
                      'data-stage': o.stage }))))));
}

function libraryCard(entry) {
  const a = ARTIFACTS[entry.id];
  return h('button', {
    class: 'lib-card', type: 'button', 'data-tint': entry.tint, 'data-kind': a.kind,
    'data-art': a.id, 'data-as': entry.as ? 'true' : null,
    onclick: () => {
      openArtifact(a, { full: true });
      if (typeof setArtifactHash === 'function') setArtifactHash(a);
    },
  },
    h('span', { class: 'lib-thumb' }, previewEl(a)),
    h('span', { class: 'lib-body' },
      h('span', { class: 'lib-name' }, entry.as || a.name),
      /* who it belongs to, and what it is — nothing between them */
      h('span', { class: 'lib-foot' },
        h('span', { class: 'lib-owner' },
          h('span', { class: 'lib-by' }, entry.by),
          entry.shared ? h('span', { class: 'lib-shared' }, `+${entry.shared}`) : null),
        h('span', { class: 'lib-kind' },
          h('span', { class: 'lib-ico', html: kindMark(a.kind) }),
          KIND_SHORT[a.kind])),
    ),
  );
}

function libraryView() {
  let kind = 'all', owner = 'all', q = '';
  const grid = h('div', { class: 'lib-grid' });
  const empty = h('p', { class: 'lib-empty' }, 'Nothing matches those filters.');

  const paint = () => {
    const rows = LIBRARY.filter(e => {
      const a = ARTIFACTS[e.id];
      if (kind !== 'all' && a.kind !== kind) return false;
      if (owner !== 'all' && e.owner !== owner) return false;
      if (q && !((e.as || a.name) + ' ' + e.by).toLowerCase().includes(q)) return false;
      return true;
    });
    grid.replaceChildren(...(rows.length ? rows.map(libraryCard) : [empty]));
  };

  const chip = (label, val, get, set) => h('button', {
    class: 'chip', type: 'button', 'data-val': val,
    'aria-pressed': String(get() === val),
    onclick: (e) => {
      set(val);
      for (const b of e.currentTarget.parentElement.children) {
        b.setAttribute('aria-pressed', String(b.dataset.val === val));
      }
      paint();
    },
  }, label);

  const kindChips = h('div', { class: 'chips' },
    chip('All', 'all', () => kind, v => kind = v),
    chip('Decks', 'deck', () => kind, v => kind = v),
    chip('Sheets', 'sheet', () => kind, v => kind = v),
    chip('Docs', 'doc', () => kind, v => kind = v),
    chip('Interactive', 'app', () => kind, v => kind = v));

  const ownerChips = h('div', { class: 'chips' },
    chip('Everyone', 'all', () => owner, v => owner = v),
    chip('By me', 'me', () => owner, v => owner = v),
    chip('Shared with me', 'shared', () => owner, v => owner = v));

  const search = h('div', { class: 'lib-search' },
    h('span', { class: 'lib-search-ico', html:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
      + 'stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-5.2-5.2"/></svg>' }),
    h('input', {
      type: 'search', placeholder: 'Search artifacts…', 'aria-label': 'Search artifacts',
      oninput: (e) => { q = e.target.value.trim().toLowerCase(); paint(); },
    }));

  paint();
  return h('div', { class: 'lib' },
    h('header', { class: 'lib-head' },
      h('h1', { class: 'view-title' }, 'Artifacts'),
      h('button', {
        class: 'btn btn--primary', type: 'button',
        onclick: () => { go('home'); },
        html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            + 'stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
      }, 'New artifact')),
    h('div', { class: 'lib-bar' }, search, kindChips, ownerChips),
    grid);
}
