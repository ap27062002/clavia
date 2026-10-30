/* ==================================================================
   Renewal calendar

   Clavia already knows, in words, what every contract's term clause
   says: MX_TERMS has "Renewal notice — 120 days before the term ends"
   against the clause it came from, and the Obligation Tracker agent
   will recite five notice dates if you ask it. Neither of those is a
   date. A words-only answer cannot tell you that a window shut a
   fortnight ago, cannot be sorted by what is nearest, and cannot be
   put into Outlook.

   So this is the arithmetic, and the surface that arithmetic needs: a
   term clause read into a commencement date, a term in months, a
   renewal period and a notice period; those rolled forward past today
   into dated events; those events on a month grid with the clause
   quoted underneath. The honest part is the part a spreadsheet of
   typed dates can never do — when a notice window has already closed,
   it says so, and works out the next one.

   It drafts nothing. The Notice of Non-renewal template already
   exists (modules-data.js) and RQ-1045 already carries the finished
   Brightline letter citing clause 12.2, so the per-contract action
   hands over to those rather than writing a second letter.

   An artifact, not a rail item: the thing is a dated register built
   from a question, and it belongs on the canvas beside the question.
   Loaded after artifacts.js and modules.js, before app.js — everything
   it calls from app.js runs at call time.
================================================================== */

/* ── the contracts ────────────────────────────────────────────────
   The twelve agreements this workspace actually has paper for, named
   from its own counterparties. Every number is one the repo already
   states somewhere: Brightline's clause 12.2, its 90 days and its
   14 January 2027 term end come from intake-docs.js and the
   suppliers-2026 vault; Trellis's 60 days and 1 November 2026 start
   come from the order form in intake-docs.js; Kestrel's 120 days and
   the playbook's 60 come from MX_TERMS; Acme's twelve months renewing
   for twelve on 60 days' notice comes from MX_TERMS; Halden's
   30 June 2027, Ironclad's 24 months, Harbor's March 2028 and the
   Leeds break at year five on six months' notice come from the vault
   fact lines. Values and the counterparties' long names come from
   MX_DEALS and MX_INTAKE_SEED.

   The clause prose is written here, in the register a term clause is
   written in, because the repo holds the facts without the sentences
   for most of these. Where a sentence does exist it is used: Trellis
   and Brightline below are the wording from intake-docs.js. Nothing
   here contradicts a figure already on screen somewhere else.

   `req` is the intake request the paper hangs off, `vault`/`file` the
   copy in the Vault — the two places "open the contract" can go. */
const RN_SEED = [
  { id: 'RN-1', name: 'Brightline Hosting — Master Hosting Agreement', short: 'Brightline',
    party: 'Brightline Hosting Ltd', type: 'Hosting', owner: 'Matt Rivera', value: '£86,000 a year',
    req: 'RQ-1045', vault: 'suppliers-2026', file: 'Brightline Hosting – Master Agreement.pdf',
    num: '12.2', heading: 'Term and Renewal',
    text: 'This Agreement commences on 14 January 2024 and continues for an initial term of thirty-six (36) months. '
        + 'It then renews automatically for successive periods of twelve (12) months unless either party gives the other '
        + 'written notice of non-renewal at least ninety (90) days before the end of the then-current term.' },

  { id: 'RN-2', name: 'Vantage GmbH — Subscription Agreement (DACH)', short: 'Vantage',
    party: 'Vantage GmbH', type: 'Customer subscription', owner: 'Grace Coleman', value: '£275,000 a year',
    req: 'RQ-1041', num: '10', heading: 'Subscription Term',
    text: 'The subscription term begins on 1 December 2023 and continues for twenty-four (24) months. '
        + 'It renews automatically for successive periods of twelve (12) months unless either party gives written notice '
        + 'of non-renewal at least thirty (30) days before the end of the then-current term.' },

  { id: 'RN-3', name: 'Acme Corp — Master Services Agreement', short: 'Acme',
    party: 'Acme Corp', type: 'Customer MSA', owner: 'Grace Coleman', value: '£1,240,000',
    req: 'RQ-1047', vault: 'acme-msa', file: 'Acme redline – MSA v3.docx',
    num: '4', heading: 'Term and Renewal',
    text: 'This Agreement commences on 1 November 2026 and continues for an initial term of twelve (12) months. '
        + 'It renews for successive periods of twelve (12) months unless either party gives notice of non-renewal '
        + 'at least sixty (60) days before the end of the then-current term.' },

  { id: 'RN-4', name: 'Trellis Health — Order Form, 120 seats', short: 'Trellis',
    party: 'Trellis Health', type: 'Customer order form', owner: 'Matt Rivera', value: '£324,000 a year',
    req: 'RQ-1042', num: '2', heading: 'Subscription Term',
    text: 'Start date: 1 November 2026. Initial Subscription Term: 36 months from the start date. '
        + 'Renewal: the Subscription Term renews automatically for successive periods of twelve months unless either party '
        + 'gives notice of non-renewal at least 60 days before the end of the then-current term, in accordance with '
        + 'clause 4.2 of the Agreement.' },

  { id: 'RN-5', name: 'Kestrel Freight — Supplier Agreement', short: 'Kestrel',
    party: 'Kestrel Freight', type: 'Supplier', owner: 'Roger Bennett', value: '£190,000',
    req: 'RQ-1040', vault: 'suppliers-2026', file: 'Kestrel Freight – Supplier Agreement.docx',
    num: '4', heading: 'Term', off: 'our playbook asks for 60 days',
    text: 'This Agreement commences on 1 November 2026 and continues for an initial term of thirty-six (36) months, '
        + 'renewing automatically for successive periods of twelve (12) months unless either party gives written notice '
        + 'of non-renewal at least one hundred and twenty (120) days before the end of the then-current term.' },

  { id: 'RN-6', name: 'Ironclad Logistics — Supplier Agreement', short: 'Ironclad',
    party: 'Ironclad Logistics', type: 'Supplier', owner: 'Matt Rivera', value: '£150,000',
    req: 'RQ-1038', vault: 'suppliers-2026', file: 'Ironclad Logistics – Supplier Agreement (signed).pdf',
    num: '11', heading: 'Term and Renewal',
    text: 'This Agreement commences on 5 October 2026 and continues for an initial term of twenty-four (24) months. '
        + 'It renews automatically for successive periods of twelve (12) months unless either party gives written notice '
        + 'of non-renewal at least sixty (60) days before the end of the then-current term.' },

  { id: 'RN-7', name: 'Halden Packaging — Supply Agreement, as extended', short: 'Halden',
    party: 'Halden Packaging', type: 'Supplier', owner: 'Matt Rivera', value: '—',
    vault: 'suppliers-2026', file: 'Halden Packaging – Amendment 2.pdf',
    num: '3', heading: 'Term',
    text: 'The initial term of this Agreement ran for twenty-four (24) months from 1 July 2024. '
        + 'Amendment 2 extends the term by a further twelve (12) months, so that it expires on 30 June 2027. '
        + 'This Agreement does not renew automatically. The parties shall begin renewal discussions no later than '
        + 'ninety (90) days before it expires.' },

  { id: 'RN-8', name: 'Harbor Retail plc — Customer MSA (Northwind)', short: 'Harbor Retail',
    party: 'Harbor Retail plc', type: 'Customer MSA', owner: 'Elena Petrova', value: '£1.9m a year',
    vault: 'northwind-dataroom', file: 'Northwind – Customer MSA (Harbor Retail).pdf',
    num: '9', heading: 'Term',
    text: 'This Agreement commences on 1 April 2023 and continues for an initial term of sixty (60) months, '
        + 'expiring on 31 March 2028. It does not renew automatically. The parties shall begin renewal discussions '
        + 'no later than one hundred and twenty (120) days before it expires.' },

  { id: 'RN-9', name: 'Northwind — Office lease, Leeds', short: 'Leeds lease',
    party: 'Calder Estates', type: 'Real estate', owner: 'Elena Petrova', value: '£212,000 a year',
    vault: 'northwind-dataroom', file: 'Northwind – Office lease (Leeds).pdf',
    num: '3', heading: 'Term and Break',
    text: 'The term of this Lease is ten (10) years from 1 June 2023. The Tenant may end this Lease at the end of '
        + 'year five (5) by giving the Landlord at least six (6) months’ written notice. This Lease does not renew '
        + 'automatically and expires at the end of the term.' },

  { id: 'RN-10', name: 'Gulf Systems LLC — Reseller Agreement', short: 'Gulf Systems',
    party: 'Gulf Systems LLC', type: 'Reseller', owner: 'Roger Bennett', value: '£420,000',
    req: 'RQ-1044', num: '12', heading: 'Term and Termination',
    text: 'This Agreement commences on 15 December 2026 and continues for twenty-four (24) months from the Effective Date. '
        + 'It does not renew automatically. The parties shall begin renewal discussions no later than ninety (90) days '
        + 'before it expires.' },

  { id: 'RN-11', name: 'Northwind Ltd — Mutual NDA', short: 'Northwind NDA',
    party: 'Northwind Ltd', type: 'NDA', owner: 'Grace Coleman', value: '—',
    req: 'RQ-1048', num: '5', heading: 'Term',
    text: 'The disclosure window begins on 1 November 2026 and continues for twelve (12) months. '
        + 'This Agreement does not renew automatically and expires at the end of that period.' },

  /* A signed DPA has no term of its own — it lives and dies with the
     agreement it hangs off. The reader cannot date it, and saying so is
     the right answer rather than inventing one. */
  { id: 'RN-12', name: 'Sentinel Health — Data Processing Addendum', short: 'Sentinel DPA',
    party: 'Sentinel Health', type: 'Addendum', owner: 'Aisha Rahman', value: '—',
    vault: 'customer-dpas', file: 'Sentinel Health – DPA (signed).pdf',
    num: '8', heading: 'Duration',
    text: 'This Addendum takes effect on the date of the Agreement and remains in force for as long as the Provider '
        + 'processes Customer Personal Data under it. It terminates with the Agreement.' },
];

/* ── dates ────────────────────────────────────────────────────────
   Midnight today, so "in 0 days" means today rather than depending on
   what time of day the question was asked. */
const RN_DAY = 864e5;
const rnToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const rnAddM = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };
const rnAddD = (d, n) => new Date(d.getTime() + n * RN_DAY);
const rnDay = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const rnLong = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const rnMonth = (d) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const rnDaysTo = (d) => Math.round((d - rnToday()) / RN_DAY);
const rnIn = (n) => n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 0 ? `in ${n} days` : `${-n} days ago`;
const rnIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const rnFirst = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

/* ── reading the term clause ──────────────────────────────────────
   Contracts write their numbers twice — "thirty-six (36) months" —
   which is the only reason the prototype needed a word table. Flatten
   the spelled-out half first and every pattern below reads one plain
   numeral, which also means the same reader handles the wording the
   repo already stores in numerals (the Trellis order form) and the
   wording a lawyer actually types. */
const rnPlain = (t) => String(t)
  .replace(/\b(?:one hundred and |one hundred )?[a-z]+(?:-[a-z]+)? \((\d+)\)/gi, '$1')
  .replace(/’/g, "'");
const rnMonths = (n, unit) => /year/i.test(unit) ? n * 12 : n;

/* What each event is called wherever it is shown: the grid chip's
   tooltip, the table, the .ics summary, the chat. One table, so they
   cannot drift apart. */
const RN_EVK = {
  notice:  'Notice deadline',
  renews:  'Auto-renews',
  expires: 'Expires',
  option:  'Option deadline',
  review:  'Start talks',
  missed:  'Notice missed',
};
/* the same six as a noun phrase, for the sentence a filter is described
   in — "only notice deadlines" rather than "only notice deadline" */
const RN_EVK_MANY = {
  notice:  'notice deadlines',
  renews:  'automatic renewals',
  expires: 'expiries',
  option:  'option deadlines',
  review:  'dates to start talks',
  missed:  'closed notice windows',
};
/* the three that are things somebody has to do by a date, as opposed to
   things that happen on one — these are what gets counted as a deadline
   and what carries a reminder in the calendar file */
const RN_ACT = ['notice', 'option', 'review'];

function rnReadTerm(seed) {
  const c = {
    ...seed, clause: { num: seed.num, heading: seed.heading, text: seed.text },
    events: [], ok: false,
  };
  const t = rnPlain(seed.text);

  const sm = /(?:commences on|commenced on|begins on|begin on|starts on|takes effect on|start date:?|years from|months from|from) *(\d{1,2} [A-Za-z]+ \d{4})/i.exec(t);
  const im = /(?:initial term of|initial subscription term:|continues for|term of this lease is|runs for|ran for|period of|term of|for) *(\d+) (month|year)/i.exec(t);
  if (!sm || !im) {
    c.note = 'No datable term: the clause fixes no start date and no term in months. Check it by hand.';
    return c;
  }
  c.start = new Date(sm[1] + ' 12:00:00');
  c.termM = rnMonths(+im[1], im[2]);
  if (isNaN(c.start)) { c.note = 'Could not read the commencement date. Check it by hand.'; return c; }

  /* an amendment that extends the term is part of the term, not a
     second contract */
  const xm = /extends the term by a further (\d+) (month|year)/i.exec(t);
  c.extM = xm ? rnMonths(+xm[1], xm[2]) : 0;

  /* "does not renew automatically" contains "renew automatically", so the
     negation has to be read before the thing it negates — the whole point
     of this calendar is which contracts renew on their own, and a clause
     that says it does not is the easiest sentence in the set to get wrong */
  const noAuto = /(?:does not|doesn't|shall not|will not) renew|no automatic renewal|renews? only (?:by|on) (?:written )?agreement/i.test(t);
  c.auto = !noAuto && /renews? automatically|automatically renews?|renewing automatically|renews for successive/i.test(t);
  const rm = /successive periods of (\d+) (month|year)/i.exec(t);
  c.renewM = rm ? rnMonths(+rm[1], rm[2]) : 12;
  const nm = /at least (\d+) (days?|months?)/i.exec(t);
  c.noticeN = nm ? +nm[1] : null;
  c.noticeU = nm ? (/month/i.test(nm[2]) ? 'months' : 'days') : null;
  const bm = /may end this \w+ at the end of year (\d+)/i.exec(t);
  c.breakYear = bm ? +bm[1] : null;
  const om = /may extend it (?:once )?for a further (\d+) (month|year)/i.exec(t);
  c.optionM = om ? rnMonths(+om[1], om[2]) : null;
  const dm = /renewal discussions no later than (\d+) days/i.exec(t);
  c.reviewD = dm ? +dm[1] : null;

  const T = rnToday();
  const back = (d) => c.noticeU === 'months' ? rnAddM(d, -c.noticeN) : rnAddD(d, -c.noticeN);
  /* an explicit expiry date in the clause beats the arithmetic — it is
     what the parties wrote down, and amendments are usually drafted as a
     date rather than as a sum */
  const em = /(?:expires?|expiring|ends) on (\d{1,2} [A-Za-z]+ \d{4})/i.exec(t);
  let end = em ? new Date(em[1] + ' 12:00:00') : rnAddM(c.start, c.termM + c.extM);

  if (c.auto) {
    /* the term the contract is on now, not the one it started on */
    while (end < T) end = rnAddM(end, c.renewM);
    c.end = end;
    c.events.push({ d: end, k: 'renews', label: `Renews for ${c.renewM} months` });
    if (c.noticeN) {
      const nb = back(end);
      c.noticeBy = nb;
      if (nb >= T) {
        c.events.push({ d: nb, k: 'notice', label: `Last day to give notice of non-renewal (${c.noticeN} ${c.noticeU})` });
      } else {
        /* the one thing a typed list of dates never tells you */
        c.missed = true;
        c.nextNotice = back(rnAddM(end, c.renewM));
        c.events.push({ d: nb, k: 'missed', label: `Notice window closed (${c.noticeN} ${c.noticeU} before renewal)` });
        c.events.push({ d: c.nextNotice, k: 'notice', label: 'Next notice deadline, for the renewal after this one' });
      }
    }
  } else {
    c.end = end;
    c.events.push({ d: end, k: 'expires', label: end < T ? 'Expired' : 'Expires' });
    if (c.breakYear && c.noticeN) {
      const brk = rnAddM(c.start, c.breakYear * 12);
      c.breakOn = brk;
      c.breakBy = back(brk);
      c.events.push({ d: c.breakBy, k: 'option',
        label: `Last day to break at the end of year ${c.breakYear}, on ${c.noticeN} ${c.noticeU}’ notice (breaks on ${rnDay(brk)})` });
    }
    if (c.optionM && c.noticeN) {
      c.optionBy = back(end);
      c.events.push({ d: c.optionBy, k: 'option', label: `Last day to exercise the ${c.optionM}-month extension option` });
    }
    if (c.reviewD) {
      c.events.push({ d: rnAddD(end, -c.reviewD), k: 'review', label: `Start renewal discussions (${c.reviewD} days before expiry)` });
    }
  }
  c.events.sort((a, b) => a.d - b.d);
  c.next = c.events.find(e => e.d >= T && e.k !== 'missed') || null;
  c.ok = true;
  return c;
}

/* ── the view over the events ─────────────────────────────────────
   One place decides what is on screen, so the grid, the table, the
   counts and every export agree. Nothing downstream recomputes. */
function rnEvents(cal) {
  const T = rnToday();
  let list = cal.items.filter(c => c.ok).flatMap(c => c.events.map(e => ({ ...e, c })));
  const f = cal.filter;
  if (f) {
    if (f.days) list = list.filter(e => e.d >= T && rnDaysTo(e.d) <= f.days);
    if (f.auto) list = list.filter(e => e.c.auto);
    if (f.kind) list = list.filter(e => f.kind.includes(e.k));
    if (f.owner) list = list.filter(e => e.c.owner === f.owner);
  }
  return list.sort((a, b) => a.d - b.d);
}
const rnAll = (cal) => cal.items.filter(c => c.ok).flatMap(c => c.events.map(e => ({ ...e, c })));
const rnUpcoming = (cal) => rnAll(cal)
  .filter(e => e.d >= rnToday() && RN_ACT.includes(e.k))
  .sort((a, b) => a.d - b.d);

function rnStats(cal) {
  const T = rnToday();
  const ev = rnAll(cal).filter(e => e.d >= T && e.k !== 'missed');
  const deadlines = ev.filter(e => RN_ACT.includes(e.k));
  return {
    d30: deadlines.filter(e => rnDaysTo(e.d) <= 30).length,
    d90: ev.filter(e => rnDaysTo(e.d) <= 90).length,
    auto: cal.items.filter(c => c.auto).length,
    missed: cal.items.filter(c => c.missed).length,
    check: cal.items.filter(c => !c.ok).length,
  };
}

function rnFilterLabel(f) {
  if (!f) return '';
  const p = [];
  if (f.days) p.push(`the next ${f.days} days`);
  if (f.auto) p.push('contracts that auto-renew');
  if (f.kind) p.push(f.kind.map(k => RN_EVK_MANY[k]).join(' and '));
  if (f.owner) p.push(`owned by ${f.owner}`);
  return p.join(' · ');
}

/* ── the calendar object ──────────────────────────────────────────
   Held on the artifact rather than in the saved state: every date here
   is computed from the clauses at render time, so there is nothing to
   persist and a saved copy could only go stale. */
function rnCal() {
  const items = RN_SEED.map(rnReadTerm);
  const first = items.filter(c => c.ok)
    .flatMap(c => c.events)
    .filter(e => e.d >= rnToday() && RN_ACT.includes(e.k))
    .sort((a, b) => a.d - b.d)[0];
  return {
    items,
    month: rnFirst(first ? first.d : rnToday()),
    sel: null,
    filter: null,
  };
}

/* ── the artifact ─────────────────────────────────────────────────── */
const RN_ID = 'renewals-calendar';
let rnLastCal = null;

function rnArtifact() {
  const prev = typeof ARTIFACTS !== 'undefined' ? ARTIFACTS[RN_ID] : null;
  if (prev) { prev.cal = rnCal(); rnLastCal = prev.cal; return prev; }
  const cal = rnCal();
  rnLastCal = cal;
  const dates = cal.items.filter(c => c.ok).reduce((n, c) => n + c.events.length, 0);
  return defineArtifact({
    id: RN_ID, kind: 'renewals', name: 'Renewal calendar', ext: 'ics',
    sub: `${dates} dates across ${cal.items.length} contracts · .ics, Excel, CSV`,
    cal,
  });
}

RENDER.renewals = (a) => {
  rnStyle();
  rnGlyphs();
  a.cal ||= rnCal();
  rnLastCal = a.cal;
  const root = h('div', { class: 'rn' });
  const paint = () => {
    const top = root.scrollTop;
    root.replaceChildren(...rnBody(a, paint));
    root.scrollTop = top;
  };
  paint();
  a.repaint = paint;
  return { body: root, extras: [rnDownBtn(a)] };
};

function rnBody(a, paint) {
  const cal = a.cal, S = rnStats(cal), T = rnToday();
  const focus = (id) => { cal.sel = cal.sel === id ? null : id; paint(); };

  const kpi = (n, label, tone) => h('div', { class: 'rn-kpi' + (tone ? ' is-' + tone : '') },
    h('b', {}, String(n)), h('span', {}, label));

  const head = h('div', { class: 'rn-top' },
    h('h2', { class: 'rn-title' }, 'Renewal calendar'),
    h('p', { class: 'rn-sub' },
      `${cal.items.length} contracts · read from their term clauses · as of ${rnLong(T)}`,
      cal.filter ? h('span', { class: 'rn-sub-f' }, ' · showing ', h('b', {}, rnFilterLabel(cal.filter)), ' ',
        h('button', { class: 'rn-link', type: 'button', onclick: () => { cal.filter = null; paint(); } }, 'Show all')) : null));

  const kpis = h('div', { class: 'rn-kpis' },
    kpi(S.d30, 'Deadlines in the next 30 days', S.d30 ? 'warn' : null),
    kpi(S.d90, 'Dates in the next 90 days'),
    kpi(S.auto, 'Contracts that auto-renew'),
    kpi(S.missed, 'Notice windows missed', S.missed ? 'bad' : null));

  const navBtn = (d, label, glyph) => h('button', {
    class: 'rn-ico', type: 'button', 'aria-label': label, html: MI(glyph),
    onclick: () => { cal.month = rnAddM(cal.month, d); paint(); },
  });

  const bar = h('div', { class: 'rn-bar' },
    navBtn(-1, 'Previous month', GLYPHS.rnPrev),
    h('b', { class: 'rn-bar-m' }, rnMonth(cal.month)),
    navBtn(1, 'Next month', GLYPHS.rnNext),
    h('button', { class: 'rn-btn', type: 'button', onclick: () => { cal.month = rnFirst(T); paint(); } }, 'Today'),
    h('span', { class: 'rn-legend' },
      ...['notice', 'option', 'renews', 'expires', 'review', 'missed']
        .map(k => h('i', { class: 'rn-k is-' + k }, RN_EVK[k]))));

  return [head, kpis, bar, rnGrid(cal, focus), ...rnDetail(a, paint),
    h('h3', { class: 'rn-h' }, cal.filter ? 'Showing' : 'Upcoming dates'),
    rnTable(cal, focus),
    ...rnCheck(cal)];
}

/* ── the month grid ──────────────────────────────────────────────
   Weeks start on Monday, which is how a contract diary is read in the
   UK and how every other date in this workspace is written. */
function rnGrid(cal, focus) {
  const m = cal.month, T = rnToday();
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const off = (first.getDay() + 6) % 7;
  const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const ev = rnEvents(cal);
  const cells = [];
  for (const d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) cells.push(h('div', { class: 'rn-dow' }, d));
  for (let i = 0; i < off; i++) cells.push(h('div', { class: 'rn-cell is-off' }));
  for (let d = 1; d <= days; d++) {
    const date = new Date(m.getFullYear(), m.getMonth(), d);
    const on = ev.filter(e => e.d.getFullYear() === date.getFullYear() && e.d.getMonth() === date.getMonth() && e.d.getDate() === d);
    const cls = 'rn-cell'
      + (date.getTime() === T.getTime() ? ' is-today' : '')
      + (date < T ? ' is-past' : '');
    cells.push(h('div', { class: cls },
      h('span', { class: 'rn-n' }, String(d)),
      ...on.slice(0, 2).map(e => h('button', {
        class: 'rn-ev is-' + e.k + (cal.sel === e.c.id ? ' is-on' : ''), type: 'button',
        'data-tip': `${e.c.name}: ${e.label}`,
        onclick: () => focus(e.c.id),
      }, e.c.short)),
      on.length > 2 ? h('button', {
        class: 'rn-more', type: 'button', onclick: () => focus(on[2].c.id),
      }, `+${on.length - 2} more`) : null));
  }
  const tail = (7 - (off + days) % 7) % 7;
  for (let i = 0; i < tail; i++) cells.push(h('div', { class: 'rn-cell is-off' }));
  return h('div', { class: 'rn-grid' }, ...cells);
}

/* ── one contract, with the clause behind it ─────────────────────
   The buttons hand over rather than doing the work again: the contract
   opens where it already lives, and the notice is the Notice of
   Non-renewal template that already exists. */
function rnDetail(a, paint) {
  const cal = a.cal;
  const c = cal.items.find(x => x.id === cal.sel);
  if (!c) return [];
  const T = rnToday();
  const ref = c.clause.num ? `Clause ${c.clause.num} · ${c.clause.heading}` : c.clause.heading;

  const open = h('button', { class: 'rn-btn', type: 'button', html: MI(GLYPHS.rnFile),
    onclick: () => {
      if (c.req && typeof mxOpen === 'function') return mxOpen('intake', c.req);
      if (c.vault && typeof mxOpen === 'function') return mxOpen('vault', c.vault);
      toast('No filed copy of this one yet.');
    } }, h('span', {}, c.req ? `Open ${c.req}` : 'Open the contract'));

  const notice = c.auto ? h('button', { class: 'rn-btn', type: 'button', html: MI(GLYPHS.rnMail),
    onclick: () => rnHandOver(c) }, h('span', {}, 'Draft the non-renewal notice')) : null;

  const ics = h('button', { class: 'rn-btn', type: 'button', html: MI(GLYPHS.calendar),
    onclick: () => rnSave(`${c.short} – key dates.ics`,
      rnICS(c.events.map(e => ({ ...e, c }))), 'text/calendar',
      `${c.short}: ${mxPlural(c.events.filter(e => e.k !== 'missed').length, 'date')} saved`) },
    h('span', {}, 'Add to calendar (.ics)'));

  return [h('section', { class: 'rn-detail' },
    h('div', { class: 'rn-d-h' },
      h('div', { class: 'rn-d-t' }, h('b', {}, c.name),
        h('span', {}, [c.type, c.party, 'owner ' + c.owner, c.value].filter(x => x && x !== '—').join(' · '))),
      h('button', { class: 'rn-ico', type: 'button', 'aria-label': 'Close',
        html: MI('<path d="M6 6l12 12M18 6L6 18"/>'),
        onclick: () => { cal.sel = null; paint(); } })),
    c.ok
      ? h('ul', { class: 'rn-d-ev' }, ...c.events.map(e => h('li', { class: 'is-' + e.k },
          h('i', { 'aria-hidden': 'true' }),
          h('b', {}, rnDay(e.d)),
          h('span', {}, e.label),
          h('em', {}, e.d >= T ? rnIn(rnDaysTo(e.d)) : 'passed'))))
      : h('p', { class: 'rn-d-note' }, c.note),
    h('blockquote', { class: 'rn-q' }, h('span', {}, ref), c.clause.text,
      c.off ? h('span', { class: 'rn-off' }, c.off) : null),
    h('div', { class: 'rn-d-a' }, open, notice, ics))];
}

/* ── the upcoming table ─────────────────────────────────────────
   Horizon already draws dates-by-month this way (hz-dates): the day
   number, what it is, who holds it and how far off. Same idiom, so the
   two read as one workspace rather than two date lists. */
function rnTable(cal, focus) {
  const T = rnToday();
  const ev = rnEvents(cal).filter(e => e.d >= T || e.k === 'missed');
  if (!ev.length) return h('p', { class: 'rn-empty' }, 'Nothing in this view. Say “show all” to see every date.');
  let month = null;
  const rows = ev.flatMap(e => {
    const m = rnMonth(e.d);
    const headRow = m !== month ? (month = m, [h('div', { class: 'rn-row-m' }, m)]) : [];
    const dd = rnDaysTo(e.d);
    const when = e.k === 'missed' || e.d < T ? 'passed' : rnIn(dd);
    return [...headRow, h('button', {
      class: 'rn-row' + (cal.sel === e.c.id ? ' is-on' : ''), type: 'button',
      onclick: () => focus(e.c.id),
    },
      h('span', { class: 'rn-row-d' }, String(e.d.getDate())),
      /* the kind sits under the label rather than in a column of its own:
         docked beside a conversation there is not width for five columns,
         and the label is the thing being read */
      h('span', { class: 'rn-row-t' },
        h('b', {}, e.label),
        h('span', { class: 'rn-row-sub' },
          h('span', { class: 'rn-k is-' + e.k }, RN_EVK[e.k]),
          h('span', { class: 'rn-row-c' }, e.c.name))),
      typeof mxFace === 'function'
        ? h('span', { class: 'rn-row-w' }, mxFace(e.c.owner, 'rn-face'), h('span', {}, e.c.owner))
        : h('span', { class: 'rn-row-w' }, e.c.owner),
      h('span', { class: 'rn-row-s' + (e.k === 'missed' ? ' is-late' : dd >= 0 && dd <= 30 ? ' is-soon' : '') }, when))];
  });
  return h('div', { class: 'rn-rows' }, ...rows,
    h('p', { class: 'rn-rows-foot' }, 'The calendar file carries a reminder 14 days before every deadline.'));
}

/* anything the reader could not date is listed rather than dropped —
   a contract missing from a renewal calendar is the failure mode */
function rnCheck(cal) {
  const bad = cal.items.filter(c => !c.ok);
  if (!bad.length) return [];
  return [h('p', { class: 'rn-check' },
    h('span', { class: 'rn-check-ic', 'aria-hidden': 'true', html: MI(GLYPHS.rnInfo) }),
    h('span', {}, mxPlural(bad.length, 'contract'), ' to check by hand: ',
      ...bad.flatMap((c, i) => [i ? '; ' : '', h('b', {}, c.short), ' — ' + c.note])))];
}

/* ── the one export that can really happen ──────────────────────
   A VCALENDAR of all-day events with a display alarm 14 days before
   every deadline, which Outlook and Google both read. It sits on the
   artifact's own Download button rather than in the export menu
   because a row that works should not sit beside rows that toast.

   It takes events rather than contracts so that it is fed from the same
   filtered view everything else reads. Exporting every date while the
   screen shows a filtered dozen is the bug that makes people stop
   trusting the file. */
function rnICS(evs) {
  const st = (d) => rnIso(d).replace(/-/g, '');
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const esc = (s) => String(s).replace(/[\\;,]/g, (m) => '\\' + m).replace(/\r?\n/g, '\\n');
  /* A clause quoted in full is a long line, and RFC 5545 wants content
     lines folded at 75 octets with a leading space on the continuation.
     Outlook is forgiving about it; enough other calendars are not. */
  const fold = (line) => {
    if (line.length <= 73) return line;
    const out = [line.slice(0, 73)];
    let rest = line.slice(73);
    while (rest.length > 72) { out.push(' ' + rest.slice(0, 72)); rest = rest.slice(72); }
    if (rest) out.push(' ' + rest);
    return out.join('\r\n');
  };
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Clavia//Renewal calendar//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Contract renewals'];
  for (const e of evs.filter(x => x.k !== 'missed')) {
    const c = e.c;
    L.push('BEGIN:VEVENT',
      `UID:${c.id}-${e.k}-${st(e.d)}@clavia.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${st(e.d)}`,
      `DTEND;VALUE=DATE:${st(rnAddD(e.d, 1))}`,
      'TRANSP:TRANSPARENT',
      `SUMMARY:${esc(`${RN_EVK[e.k]}: ${c.name}`)}`,
      `DESCRIPTION:${esc(`${e.label}. Owner: ${c.owner}. `
        + `${c.clause.num ? 'Clause ' + c.clause.num + ': ' : ''}${c.clause.text}`)}`);
    /* a date you have to act by is worth a nudge; a date something simply
       happens on is not */
    if (RN_ACT.includes(e.k)) {
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY',
        `DESCRIPTION:${esc(RN_EVK[e.k] + ': ' + c.short)}`, 'TRIGGER:-P14D', 'END:VALARM');
    }
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

const RN_COLS = ['Date', 'Event', 'Contract', 'Type', 'Counterparty', 'Owner', 'Value', 'Detail', 'Clause'];
const rnRows = (cal) => rnEvents(cal).map(e => [rnIso(e.d), RN_EVK[e.k], e.c.name, e.c.type,
  e.c.party, e.c.owner, e.c.value, e.label, e.c.clause.num ? 'Clause ' + e.c.clause.num : '']);

const rnCsvCell = (v) => /[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
const rnCsv = (cal) => [RN_COLS, ...rnRows(cal)].map(r => r.map(rnCsvCell).join(',')).join('\r\n') + '\r\n';

/* An HTML table saved as .xls is a file Excel genuinely opens, which is
   more than a promise of .xlsx would be. Same trick the template export
   in modules.js uses for Word. */
function rnXls(cal) {
  const esc = (v) => mxEsc(v ?? '');
  const rows = rnRows(cal).map(r => '<tr>' + r.map(v => `<td>${esc(v)}</td>`).join('') + '</tr>').join('');
  return '<html><head><meta charset="utf-8"><title>Renewal calendar</title>'
    + '<style>td,th{border:1px solid #D8D3CC;padding:4px 6px;font-family:Calibri,Arial;font-size:10.5pt;'
    + 'vertical-align:top;text-align:left}th{background:#F4F2EF}</style></head><body>'
    + '<table><thead><tr>' + RN_COLS.map(c => `<th>${esc(c)}</th>`).join('') + '</tr></thead>'
    + '<tbody>' + rows + '</tbody></table></body></html>';
}

function rnSave(name, body, mime, said) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const el = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(el); el.click(); el.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(said);
}

function rnExport(cal, f) {
  const ev = rnEvents(cal), n = ev.length;
  if (f === 'ics') return rnSave('Renewal calendar.ics', rnICS(ev), 'text/calendar',
    `${mxPlural(ev.filter(e => e.k !== 'missed').length, 'date')} saved. `
    + 'Open the file to add them to Outlook or Google Calendar.');
  if (f === 'csv') return rnSave('Renewal calendar.csv', rnCsv(cal), 'text/csv', `${mxPlural(n, 'row')} saved as CSV.`);
  return rnSave('Renewal calendar.xls', rnXls(cal), 'application/vnd.ms-excel', `${mxPlural(n, 'row')} saved for Excel.`);
}

function rnDownBtn(a) {
  const btn = h('button', { class: 'rn-ico rn-down', type: 'button',
    'aria-label': 'Download this calendar', 'data-tip': 'Download',
    html: MI(GLYPHS.rnDown) });
  btn.onclick = (e) => {
    e.stopPropagation();
    menu(btn, [
      { label: 'Calendar (.ics)', run: () => rnExport(a.cal, 'ics') },
      { label: 'Excel table (.xls)', run: () => rnExport(a.cal, 'xls') },
      { label: 'CSV', run: () => rnExport(a.cal, 'csv') },
    ]);
  };
  return btn;
}

/* ── registration ────────────────────────────────────────────────── */

/* A month of ruled cells with three dates marked on it, in the drawn-paper
   family the other new kinds use rather than a product colour — nothing
   owns a calendar the way Word owns a document. */
KIND_ICON.renewals =
    '<rect x="2.6" y="4.4" width="18.8" height="16.2" rx="2.4" fill="#FCFCFB" stroke="#D8D3CC" stroke-width="1"/>'
  + '<path d="M2.6 9.1h18.8" stroke="#D8D3CC" stroke-width="1"/>'
  + '<path d="M7.6 2.9v3M16.4 2.9v3" stroke="#9A968E" stroke-width="1.5" stroke-linecap="round"/>'
  + '<g fill="#E8E4DF"><rect x="5.2" y="11" width="3.2" height="2.6" rx=".6"/>'
  + '<rect x="14.2" y="11" width="3.2" height="2.6" rx=".6"/>'
  + '<rect x="9.7" y="15.1" width="3.2" height="2.6" rx=".6"/></g>'
  + '<rect x="9.7" y="11" width="3.2" height="2.6" rx=".6" fill="#A63D32"/>'
  + '<rect x="5.2" y="15.1" width="3.2" height="2.6" rx=".6" fill="#2E7D4F"/>'
  + '<rect x="14.2" y="15.1" width="3.2" height="2.6" rx=".6" fill="#3D5FA8"/>';
KIND_LABEL.renewals = 'Renewal calendar';
KIND_SHORT.renewals = 'DATES';
NOUN.renewals = 'calendar';

/* Excel and PDF behave here the way they behave on every other kind — a
   row that says what it would do. The three that really write a file are
   on the calendar's own Download button, where a working row cannot be
   mistaken for a promised one. Copy is not offered: copyArtifact knows
   sheets and documents, and a month grid is neither. */
EXPORT.renewals = {
  primary: 'xlsx',
  open: ['gsheets', 'sharepoint'],
  download: ['xlsx', 'pdf'],
};

/* what the trace says it did when a step came from here */
SOURCES.renewal = { label: 'the term clauses', verb: 'Read',
  icon: '<rect x="3.8" y="5" width="16.4" height="14.5" rx="2.2"/>'
      + '<path d="M3.8 9.6h16.4M8.5 3.4v3.2M15.5 3.4v3.2"/><path d="M8 13h3M8 16.4h7"/>' };

/* The sprite has no month, bell or file-out mark, so these are added to
   GLYPHS at call time the way mxGlyphs does it — no edit to app.js or
   sprite.html, and `calendar` is already there so it is left alone. */
function rnGlyphs() {
  if (typeof mxGlyphs === 'function') mxGlyphs();
  GLYPHS.rnPrev ||= '<path d="M14.5 6l-6 6 6 6"/>';
  GLYPHS.rnNext ||= '<path d="M9.5 6l6 6-6 6"/>';
  GLYPHS.rnDown ||= '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 17v1.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V17"/>';
  GLYPHS.rnFile ||= '<path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5z"/><path d="M14 3.5v4h4M9 12.5h6M9 16h4"/>';
  GLYPHS.rnMail ||= '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3 7l9 6.5L21 7"/>';
  GLYPHS.rnInfo ||= '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5M12 8.1h.01"/>';
}

/* ── the chat seam ────────────────────────────────────────────────
   Same contract as skillAnswer: true when it handled the ask, false to
   fall through. Everything below is a regex over the words typed — no
   model reads the clauses. What it does with the match is real: the
   dates come out of the arithmetic above, not out of a fixture. */

const RN_BUILD = /\b(renewal|renewals|contract|notice|key)\s+(calendar|deadlines?|dates)\b|\bcalendar of (?:renewals|notice|key)\b|\bwhat(?:'s| is)? (?:renewing|up for renewal)\b|\bwhich contracts? (?:auto-?renew|renew|expire)\b|\brenewals? (?:in|over|for) the next\b|\bwhen do(?:es)? (?:our|the) contracts? renew\b/i;

const rnOnCanvas = () => typeof openArtifactNow !== 'undefined' && openArtifactNow?.kind === 'renewals';

/* offered as a follow-up and recognised as one, so the two cannot drift */
const RN_TPL_ASK = 'Open the Notice of Non-renewal template';

function renewalAnswer(prompt) {
  const s = String(prompt || '').trim();
  if (!s) return false;
  /* Follow-ups are tried first, and only once there is a calendar in this
     conversation or open beside it — otherwise the word "renewal" in any
     other thread would be claimed. The order matters: "which contracts
     auto-renew?" is both a way to ask for a calendar and, once you have
     one, a way to filter it. With a calendar on screen it is the filter,
     or the suggested follow-ups would each rebuild what you are looking
     at. rnFollowUp changes nothing on the paths where it returns false. */
  if (rnLastCal && (thread?.rnOn || rnOnCanvas()) && rnFollowUp(s)) return true;
  if (RN_BUILD.test(s)) { rnTurn(s); return true; }
  return false;
}

/* the build: read the clauses, then hand back the calendar */
function rnTurn(ask) {
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  thread.rnOn = true;
  paintThread();

  const a = rnArtifact();
  const cal = a.cal, items = cal.items, ok = items.filter(c => c.ok);
  const dates = ok.reduce((n, c) => n + c.events.length, 0);
  const S = rnStats(cal);

  const steps = [
    { source: 'internal', query: 'signed contracts, order forms and leases', count: mxPlural(items.length, 'contract') },
    { source: 'renewal', query: 'term, renewal and notice clauses', count: `${ok.length} of ${items.length}` },
    { source: 'think', query: 'renewal, expiry and notice dates', count: `${dates} dates · ${S.auto} auto-renew` },
  ];
  steps.forEach((st, i) => {
    setTimeout(() => { m.steps.push({ ...st, rows: [], running: true }); renderBot(m); }, 300 + i * 750);
    setTimeout(() => { Object.assign(m.steps[i], st, { running: false }); renderBot(m); }, 300 + i * 750 + 600);
  });

  const urgent = rnUpcoming(cal).slice(0, 3);
  if (urgent[0]) { cal.sel = urgent[0].c.id; cal.month = rnFirst(urgent[0].d); }
  const missed = items.filter(c => c.missed);
  const bad = items.filter(c => !c.ok);

  setTimeout(() => {
    m.thinking = false;
    if (m.traceOpen == null) m.traceOpen = false;
    m.text = `${S.auto} of the ${items.length} contracts renew automatically; the rest run to a fixed end date. `
      + (S.d30 ? `**${mxPlural(S.d30, 'deadline')}** ${S.d30 === 1 ? 'falls' : 'fall'} in the next 30 days.`
               : 'Nothing has to be acted on in the next 30 days.')
      + (urgent.length ? '\n\nComing up first:\n\n' + urgent.map(rnEvLine).join('\n') : '')
      + (missed.length ? `\n\n${missed.map(c => c.short).join(' and ')} ${missed.length > 1 ? 'have' : 'has'} already passed `
          + `${missed.length > 1 ? 'their' : 'its'} notice window, so ${missed.length > 1 ? 'they renew' : 'it renews'} on `
          + `${missed.map(c => rnDay(c.end)).join(' and ')}. The next chance to give notice is `
          + `${missed.map(c => rnDay(c.nextNotice)).join(' and ')}.` : '')
      + (bad.length ? `\n\nI could not date ${bad.map(c => c.short).join(' and ')} — ${bad.length > 1 ? 'they are' : 'it is'} `
          + 'listed at the foot of the calendar to check by hand.' : '')
      + '\n\nThe calendar is open beside this. Click any date for the clause behind it.';
    m.artifact = a.id;
    m.suggest = [
      'Which contracts auto-renew?',
      'What is due in the next 90 days?',
      missed[0] ? 'Which notice windows have we missed?' : `Draft the non-renewal notice for ${ok[0].short}`,
      'Email the upcoming deadlines to the owners',
      'Add these dates to my calendar (.ics)',
    ];
    renderBot(m);
    openArtifact(a);
  }, 300 + steps.length * 750 + 700);
}

const rnEvLine = (e) => `- **${rnDay(e.d)}** — ${e.c.short}, `
  + e.label.charAt(0).toLowerCase() + e.label.slice(1)
  + ` (${e.d >= rnToday() ? rnIn(rnDaysTo(e.d)) : 'passed'})`;

/* a bot message that is already written: no searching to show.
   The calendar can also be opened from the library, with no conversation
   to answer into — then there is nothing to say and the caller falls back
   to doing the thing directly. */
function rnSay(text, opts = {}) {
  if (typeof thread === 'undefined' || !thread) return null;
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();
  setTimeout(() => {
    m.thinking = false;
    m.text = text;
    if (opts.artifact) m.artifact = opts.artifact;
    if (opts.suggest) m.suggest = opts.suggest;
    renderBot(m);
    opts.then?.();
  }, opts.ms || 620);
  return m;
}

function rnShow() {
  const a = ARTIFACTS[RN_ID];
  if (!a) return;
  if (rnOnCanvas() && a.repaint) a.repaint();
  else openArtifact(a);
}

/* which contract an ask names. The short names are one or two words and
   several share a first word with something else in the workspace, so the
   whole short name is tried before its first word. */
function rnFind(s) {
  const L = rnLastCal.items;
  const hit = (c, needle) => new RegExp('\\b' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(s);
  return L.find(c => hit(c, c.short))
    || L.find(c => hit(c, c.party))
    || L.find(c => hit(c, c.short.split(' ')[0]))
    || null;
}

function rnWindowDays(s) {
  const m = /next (\d+|three|six|twelve|thirty|sixty|ninety)\s*(days?|weeks?|months?)/i.exec(s);
  if (m) {
    const n = /^\d+$/.test(m[1]) ? +m[1]
      : ({ three: 3, six: 6, twelve: 12, thirty: 30, sixty: 60, ninety: 90 })[m[1].toLowerCase()];
    return /month/i.test(m[2]) ? n * 30 : /week/i.test(m[2]) ? n * 7 : n;
  }
  if (/this month/i.test(s)) return 31;
  if (/this quarter|next quarter/i.test(s)) return 92;
  if (/this year|next year/i.test(s)) return 365;
  if (/soon|coming up|upcoming|imminent/i.test(s)) return 90;
  return null;
}

function rnFollowUp(s) {
  const cal = rnLastCal;

  /* the jumps the answers above offer, taken */
  const open = /^open (rq-\d+)\b/i.exec(s);
  if (open && typeof mxOpen === 'function') { mxOpen('intake', open[1].toUpperCase()); return true; }
  if (s.toLowerCase() === RN_TPL_ASK.toLowerCase() && typeof mxOpen === 'function') {
    mxOpen('templates', 'non-renewal');
    return true;
  }

  const c = rnFind(s);

  /* hand over before anything else: a notice is the template's job */
  if (/\b(?:non-?renewal|termination|extension) (?:notice|letter)\b|\bdraft (?:a |the )?(?:non-?renewal|extension|termination) notice\b|\bnotice of non-?renewal\b/i.test(s)) {
    if (!c) {
      rnSay('Which contract? Name it and I will point at the notice you need — the Notice of Non-renewal template '
        + 'is already set up for supplier paper that renews unless we say otherwise.',
        { suggest: cal.items.filter(x => x.auto).slice(0, 3).map(x => `Draft the non-renewal notice for ${x.short}`) });
      return true;
    }
    rnHandOver(c);
    return true;
  }

  if (/\b(e-?mail|remind(?:er)?s?|send)\b/i.test(s) && !/\b(?:\.ics|calendar file)\b/i.test(s)) { rnMail(s, c); return true; }

  if (/\b(?:\.?ics|outlook|google calendar|my calendar|calendar file|calendar app)\b/i.test(s)) {
    rnExport(cal, 'ics');
    const n = rnEvents(cal).filter(e => e.k !== 'missed').length;
    rnSay(`Saving **Renewal calendar.ics** with ${mxPlural(n, 'date')}`
      + (cal.filter ? `, filtered to ${rnFilterLabel(cal.filter)}` : '')
      + '. Notice, option and review deadlines each carry a reminder 14 days ahead. '
      + 'Open the file to add them to Outlook or Google Calendar.');
    return true;
  }

  if (/\b(excel|xlsx?|spreadsheet|csv)\b/i.test(s)) {
    const f = /csv/i.test(s) ? 'csv' : 'xls';
    rnExport(cal, f);
    rnSay(`Saving the calendar as ${f === 'csv' ? 'a CSV' : 'an Excel table'}, one row per date`
      + (cal.filter ? `, filtered to ${rnFilterLabel(cal.filter)}` : '') + '. Nine columns, including the clause each date came from.');
    return true;
  }

  if (/\b(show all|clear (?:the )?filters?|everything|reset|all of (?:it|them))\b/i.test(s)) {
    cal.filter = null; cal.sel = null;
    rnSay('Showing every date again.', { then: rnShow });
    return true;
  }

  if (/\bmissed|passed|closed|too late|slipped\b/i.test(s)) {
    const ms = cal.items.filter(x => x.missed);
    if (!ms.length) { rnSay('No notice windows have been missed. Every auto-renewing contract still has time on it.'); return true; }
    cal.filter = null; cal.sel = ms[0].id; cal.month = rnFirst(ms[0].end);
    rnSay(`${mxPlural(ms.length, 'contract')} will renew because the notice window has already closed:\n\n`
      + ms.map(x => `- **${x.short}** renews on ${rnDay(x.end)} for ${x.renewM} months. The window closed on `
        + `${rnDay(x.noticeBy)}, ${rnIn(rnDaysTo(x.noticeBy))}. Next notice deadline: **${rnDay(x.nextNotice)}**.`).join('\n')
      + '\n\nIf it has to end sooner than that, the contract will not help — it would have to be negotiated with them.',
      { then: rnShow, suggest: ms[0].req ? [`Open ${ms[0].req}`] : null });
    return true;
  }

  /* one contract, asked about by name */
  if (c && /\b(when|renew|expir|end|notice|deadline|term|date|how long|break|option)\w*/i.test(s)) {
    cal.sel = c.id;
    if (c.next) cal.month = rnFirst(c.next.d);
    if (!c.ok) {
      rnSay(`I could not work out dates for **${c.name}**. ${c.note}`, { then: rnShow });
      return true;
    }
    const head = c.auto
      ? (c.missed
        ? `**${c.short}** renews automatically on **${rnDay(c.end)}**. The notice window closed on ${rnDay(c.noticeBy)}, `
          + `so it will renew for another ${c.renewM} months. The next chance to give notice is **${rnDay(c.nextNotice)}**.`
        : `**${c.short}** renews automatically on **${rnDay(c.end)}** unless we give notice by **${rnDay(c.noticeBy)}**, `
          + `${rnIn(rnDaysTo(c.noticeBy))}.`)
      : `**${c.short}** ${c.end < rnToday() ? 'expired' : 'expires'} on **${rnDay(c.end)}**`
        + (c.end >= rnToday() ? `, ${rnIn(rnDaysTo(c.end))}` : '') + '. It does not renew automatically.'
        + (c.breakBy ? ` We can break it at the end of year ${c.breakYear} by giving notice by **${rnDay(c.breakBy)}**.` : '')
        + (c.optionBy ? ` The ${c.optionM}-month extension option has to be exercised by **${rnDay(c.optionBy)}**.` : '')
        + (c.reviewD ? ` Renewal talks should start by **${rnDay(rnAddD(c.end, -c.reviewD))}**.` : '');
    rnSay(head + `\n\n> ${c.clause.text}\n\n`
      + `From ${c.file || c.name}${c.clause.num ? `, clause ${c.clause.num}` : ''}`
      + (c.off ? ` — ${c.off}, so this one sits outside it` : '')
      + '. It is selected on the calendar.',
      { then: rnShow, suggest: [c.auto ? `Draft the non-renewal notice for ${c.short}` : null, c.req ? `Open ${c.req}` : null].filter(Boolean) });
    return true;
  }

  /* filters */
  const f = {};
  let did = false;
  const days = rnWindowDays(s);
  if (days) { f.days = days; did = true; }
  if (/\bauto-?renew\w*/i.test(s)) { f.auto = true; did = true; }
  if (/\bexpir\w*/i.test(s) && !/\bauto/i.test(s)) { f.kind = ['expires']; did = true; }
  if (!f.kind && /\b(notice|deadlines?|act on|action|to do)\b/i.test(s)) { f.kind = RN_ACT.slice(); did = true; }
  const own = [...new Set(cal.items.map(x => x.owner))]
    .find(n => new RegExp('\\b' + n.split(' ')[0] + '\\b', 'i').test(s));
  if (own && /\b(own|owner|owns|holds|'s|’s|for|with)\b/i.test(s)) { f.owner = own; did = true; }

  if (did) {
    cal.filter = f; cal.sel = null;
    const ev = rnEvents(cal).filter(e => e.d >= rnToday());
    if (ev[0]) cal.month = rnFirst(ev[0].d);
    if (!ev.length) {
      rnSay(`Nothing falls in that window (${rnFilterLabel(f)}). The calendar is filtered to match; `
        + 'say “show all” to bring every date back.', { then: rnShow });
      return true;
    }
    rnSay(`${mxPlural(ev.length, 'date')} — ${rnFilterLabel(f)}. The calendar is filtered to match:\n\n`
      + ev.slice(0, 8).map(rnEvLine).join('\n')
      + (ev.length > 8 ? `\n\nAnd ${ev.length - 8} more on the calendar.` : ''),
      { then: rnShow, suggest: ['Show all', 'Email the upcoming deadlines to the owners'] });
    return true;
  }

  if (/\b(how many|which|what|list|summar|overview|status|where do we stand)\b/i.test(s)) { rnOverview(cal); return true; }
  return false;
}

function rnOverview(cal) {
  const S = rnStats(cal), ok = cal.items.filter(c => c.ok);
  const urgent = rnUpcoming(cal).slice(0, 3);
  rnSay(`Across ${mxPlural(cal.items.length, 'contract')}, ${S.auto} renew automatically and ${ok.length - S.auto} `
    + `run to a fixed end date. ${S.d30 ? `**${mxPlural(S.d30, 'deadline')}** ${S.d30 === 1 ? 'falls' : 'fall'} in the next 30 days.`
      : 'No deadline falls in the next 30 days.'}`
    + (S.missed ? ` ${mxPlural(S.missed, 'notice window')} ${S.missed === 1 ? 'has' : 'have'} already closed.` : '')
    + (S.check ? ` ${mxPlural(S.check, 'contract')} could not be dated and ${S.check === 1 ? 'is' : 'are'} listed to check by hand.` : '')
    + (urgent.length ? '\n\nThe next deadlines:\n\n' + urgent.map(rnEvLine).join('\n') : ''),
    { then: rnShow });
}

/* ── handing the notice over ─────────────────────────────────────
   The letter exists. RQ-1045 carries the finished Brightline notice,
   citing clause 12.2 with the 90 days and the 14 January 2027 term end
   already in it, and the Notice of Non-renewal template is set up for
   every other one. Drafting a second version here would be two letters
   that can disagree. */
function rnHandOver(c) {
  if (!c.ok) {
    rnSay(`I could not read a term for **${c.name}**, so I cannot date a notice. ${c.note}`);
    return;
  }
  if (!c.auto) {
    rnSay(`**${c.short}** does not renew automatically, so no non-renewal notice is needed. It `
      + `${c.end < rnToday() ? 'expired' : 'expires'} on **${rnDay(c.end)}**`
      + (c.breakBy ? `, and the only notice it takes is the break notice, due by **${rnDay(c.breakBy)}**` : '') + '.');
    return;
  }
  const by = c.missed ? c.nextNotice : c.noticeBy;
  const ends = c.missed ? rnAddM(c.end, c.renewM) : c.end;
  const letter = c.req === 'RQ-1045';
  const go = () => {
    if (typeof mxOpen !== 'function') return;
    if (letter) mxOpen('intake', c.req);
    else mxOpen('templates', 'non-renewal');
  };
  /* Said from the calendar with no conversation open, there is nowhere to
     put the answer, so go straight there. */
  const said = rnSay(`${letter ? `The notice is already drafted — **${c.req}** carries it`
      : '**Notice of Non-renewal** is the template for this'}`
    + `, citing clause ${c.clause.num} and the ${c.noticeN} ${c.noticeU}. `
    + (c.missed
      ? `The current window closed on ${rnDay(c.noticeBy)}, so a notice sent now takes effect at the renewal after this one: `
        + `it has to reach ${c.party} by **${rnDay(by)}**, and the Agreement would then end on ${rnDay(ends)}.`
      : `It has to reach ${c.party} by **${rnDay(by)}**, ${rnIn(rnDaysTo(by))}, and the Agreement would then end on ${rnDay(ends)}.`)
    + '\n\nCheck the notices clause for the address before it goes.',
    /* The jump is offered rather than taken: navigating away from the
       conversation puts the answer behind the page it just opened. Same
       shape as the skill that hands a question to its request. */
    { suggest: [letter ? `Open ${c.req}` : RN_TPL_ASK] });
  if (!said) go();
}

/* ── the reminder email ──────────────────────────────────────────
   A real mail artifact, so it renders through renderMail and is edited
   and sent where every other draft is. */
function rnMail(s, only) {
  const cal = rnLastCal, T = rnToday();
  let ev = rnEvents(cal).filter(e => e.d >= T && rnDaysTo(e.d) <= 120);
  if (only) ev = ev.filter(e => e.c.id === only.id);
  const owners = [...new Set(ev.map(e => e.c.owner))];
  if (!ev.length) {
    rnSay(`Nothing falls in the next 120 days${only ? ` on ${only.short}` : ''}, so there is nothing to remind anyone about yet.`);
    return;
  }
  const addr = (n) => ({ n, e: typeof mxEmail === 'function' ? mxEmail(n) : n.toLowerCase().replace(/\s+/g, '.') + '@clavia.app' });
  const subject = only ? `Key dates: ${only.name}` : 'Contract deadlines in the next 120 days';
  const a = defineArtifact({
    id: 'mail-renewal-reminders', kind: 'mail', name: subject, ext: '',
    sub: `Draft · to ${mxPlural(owners.length, 'owner')}`,
    to: owners.map(addr),
    cc: [{ n: USER.name, e: USER.email }],
    subject,
    blocks: [
      { t: 'p', v: 'All,' },
      { t: 'p', v: only
        ? `The dates coming up on the ${mxEsc(only.name)}, read off ${only.clause.num ? 'clause ' + mxEsc(only.clause.num) : 'the term clause'}.`
        : `The contract dates coming up in the next 120 days, read off each contract&rsquo;s own term clause. Each one is listed with the person who holds it.` },
      { t: 'ul', v: ev.map(e => `<b>${mxEsc(rnDay(e.d))}</b> — ${mxEsc(e.c.name)}: `
          + `${mxEsc(e.label.charAt(0).toLowerCase() + e.label.slice(1))} (${mxEsc(e.c.owner)}, ${mxEsc(rnIn(rnDaysTo(e.d)))})`) },
      ...(cal.items.some(x => x.missed) && !only ? [{ t: 'strong',
        v: 'Already past notice: ' + mxEsc(cal.items.filter(x => x.missed)
          .map(x => `${x.short} renews on ${rnDay(x.end)}`).join('; ')) + '.' }] : []),
      { t: 'p', v: 'The calendar file on the renewal calendar adds every one of these to Outlook or Google, with a reminder '
        + '14 days before each deadline. Tell me which of them you want to stop or renegotiate and I will start the notice.' },
      { t: 'p', v: USER.greeting },
    ],
  });
  rnSay(`A draft to ${only ? `the ${only.short} owner` : mxPlural(owners.length, 'owner')} — ${owners.join(', ')} — `
    + `with ${mxPlural(ev.length, 'date')} in the next 120 days, each against the person who holds it`
    + (cal.items.some(x => x.missed) && !only ? ', and the one window that has already closed called out on its own line' : '')
    + '. It is open beside this; nothing has been sent.',
    { artifact: a.id, then: () => openArtifact(a) });
}

/* ── its own css, injected once ───────────────────────────────────
   No token is added or changed. The event colours are this feature's
   own, each with an inline fallback, because nothing in the design
   system means "a deadline you will miss". */
function rnStyle() {
  if (document.getElementById('rn-css')) return;
  document.head.append(h('style', { id: 'rn-css' }, `
.rn { --rn-notice: #A63D32; --rn-renews: #2E7D4F; --rn-expires: #7A6635;
  --rn-option: #3D5FA8; --rn-review: #6B5B8A; --rn-missed: #6E2F27;
  min-height: 0; overflow-y: auto; padding: 26px 26px 64px;
  font-size: 13.5px; color: var(--text); }

.rn-top { padding-bottom: 16px; border-bottom: 1px solid var(--line); }
.rn-title { margin: 0; font-family: var(--serif); font-size: 25px; font-weight: 500; letter-spacing: -.01em; }
.rn-sub { margin: 6px 0 0; font-size: 12.5px; color: var(--text-soft); }
.rn-sub-f b { color: var(--text); font-weight: 500; }
.rn-link { appearance: none; border: 0; padding: 0; background: none; font: inherit; font-size: 12.5px;
  color: var(--gold, #847347); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }

/* two by two beside a conversation, four across in full screen — four
   tiles squeezed into a docked panel put the labels on three lines each */
.rn-kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin: 18px 0; }
.rn-kpi { padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--radius-lg, 12px);
  background: var(--surface); }
.rn-kpi b { display: block; font-family: var(--serif); font-size: 27px; font-weight: 500; line-height: 1.1; }
.rn-kpi span { display: block; margin-top: 4px; font-size: 11.5px; line-height: 1.35; color: var(--text-soft); }
.rn-kpi.is-warn b { color: var(--rn-notice, #A63D32); }
.rn-kpi.is-bad { border-color: color-mix(in srgb, var(--rn-missed, #6E2F27) 32%, var(--line)); }
.rn-kpi.is-bad b { color: var(--rn-missed, #6E2F27); }

.rn-bar { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
.rn-bar-m { min-width: 136px; font-family: var(--serif); font-size: 16px; font-weight: 500; text-align: center; }
.rn-ico { appearance: none; display: inline-grid; place-items: center; width: 30px; height: 30px;
  border: 0; border-radius: 7px; background: none; color: var(--text-soft); cursor: pointer; }
.rn-ico:hover { background: var(--tint); color: var(--text); }
.rn-btn { appearance: none; display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px;
  border: 1px solid var(--line); border-radius: 8px; background: var(--surface);
  font: inherit; font-size: 12.5px; color: var(--text); cursor: pointer; }
.rn-btn:hover { background: var(--tint); border-color: var(--line-strong); }
.rn-btn .ic { flex: none; color: var(--text-faint); }
.rn-legend { display: flex; flex-wrap: wrap; gap: 5px; margin-left: auto; }

.rn-k { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 999px;
  font-size: 10.5px; font-style: normal; letter-spacing: .01em; white-space: nowrap;
  background: var(--tint); color: var(--text-soft); }
.rn-k::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.rn-k.is-notice  { color: var(--rn-notice, #A63D32);  background: color-mix(in srgb, var(--rn-notice, #A63D32) 10%, transparent); }
.rn-k.is-renews  { color: var(--rn-renews, #2E7D4F);  background: color-mix(in srgb, var(--rn-renews, #2E7D4F) 10%, transparent); }
.rn-k.is-expires { color: var(--rn-expires, #7A6635); background: color-mix(in srgb, var(--rn-expires, #7A6635) 10%, transparent); }
.rn-k.is-option  { color: var(--rn-option, #3D5FA8);  background: color-mix(in srgb, var(--rn-option, #3D5FA8) 10%, transparent); }
.rn-k.is-review  { color: var(--rn-review, #6B5B8A);  background: color-mix(in srgb, var(--rn-review, #6B5B8A) 10%, transparent); }
.rn-k.is-missed  { color: var(--rn-missed, #6E2F27);  background: color-mix(in srgb, var(--rn-missed, #6E2F27) 12%, transparent); }

/* the grid: seven columns, one border shared between cells */
.rn-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
  border: 1px solid var(--line); border-radius: var(--radius-lg, 12px); overflow: hidden;
  background: var(--line-soft); gap: 1px; }
.rn-dow { padding: 7px 8px; background: var(--tint); font-size: 10.5px; letter-spacing: .04em;
  text-transform: uppercase; color: var(--text-faint); }
.rn-cell { min-height: 74px; padding: 5px 5px 7px; background: var(--surface); }
.rn-cell.is-off { background: var(--bg-sunk); }
.rn-cell.is-past { background: color-mix(in srgb, var(--bg-sunk) 55%, var(--surface)); }
.rn-cell.is-today { box-shadow: inset 0 0 0 2px var(--gold, #847347); }
.rn-n { display: block; margin-bottom: 4px; font-size: 11px; color: var(--text-faint); font-variant-numeric: tabular-nums; }
.rn-cell.is-today .rn-n { color: var(--gold, #847347); font-weight: 600; }
.rn-ev { appearance: none; display: block; width: 100%; margin-bottom: 3px; padding: 2px 5px;
  border: 0; border-left: 2.5px solid currentColor; border-radius: 3px;
  font: inherit; font-size: 10.5px; line-height: 1.45; text-align: left;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.rn-ev.is-notice  { color: var(--rn-notice, #A63D32);  background: color-mix(in srgb, var(--rn-notice, #A63D32) 11%, transparent); }
.rn-ev.is-renews  { color: var(--rn-renews, #2E7D4F);  background: color-mix(in srgb, var(--rn-renews, #2E7D4F) 11%, transparent); }
.rn-ev.is-expires { color: var(--rn-expires, #7A6635); background: color-mix(in srgb, var(--rn-expires, #7A6635) 11%, transparent); }
.rn-ev.is-option  { color: var(--rn-option, #3D5FA8);  background: color-mix(in srgb, var(--rn-option, #3D5FA8) 11%, transparent); }
.rn-ev.is-review  { color: var(--rn-review, #6B5B8A);  background: color-mix(in srgb, var(--rn-review, #6B5B8A) 11%, transparent); }
.rn-ev.is-missed  { color: var(--rn-missed, #6E2F27);  background: color-mix(in srgb, var(--rn-missed, #6E2F27) 13%, transparent);
  text-decoration: line-through; }
.rn-ev:hover { filter: brightness(.94); }
.rn-ev.is-on { box-shadow: 0 0 0 1.5px currentColor; }
.rn-more { appearance: none; border: 0; padding: 1px 5px; background: none; font: inherit;
  font-size: 10px; color: var(--text-faint); cursor: pointer; }
.rn-more:hover { color: var(--text); text-decoration: underline; }

/* the selected contract */
.rn-detail { margin-top: 14px; padding: 14px 16px; border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg, 12px); background: var(--surface); }
.rn-d-h { display: flex; align-items: flex-start; gap: 10px; }
.rn-d-t { min-width: 0; flex: 1; }
.rn-d-t b { display: block; font-size: 14.5px; font-weight: 500; }
.rn-d-t span { display: block; margin-top: 2px; font-size: 11.5px; color: var(--text-soft); }
.rn-d-ev { list-style: none; margin: 12px 0 0; padding: 0; }
.rn-d-ev li { display: grid; grid-template-columns: 10px 104px 1fr auto; align-items: baseline; gap: 9px;
  padding: 5px 0; border-top: 1px solid var(--line-soft); font-size: 12.5px; }
.rn-d-ev li i { width: 7px; height: 7px; border-radius: 50%; background: var(--text-faint); transform: translateY(-1px); }
.rn-d-ev li.is-notice i  { background: var(--rn-notice, #A63D32); }
.rn-d-ev li.is-renews i  { background: var(--rn-renews, #2E7D4F); }
.rn-d-ev li.is-expires i { background: var(--rn-expires, #7A6635); }
.rn-d-ev li.is-option i  { background: var(--rn-option, #3D5FA8); }
.rn-d-ev li.is-review i  { background: var(--rn-review, #6B5B8A); }
.rn-d-ev li.is-missed    { color: var(--text-soft); }
.rn-d-ev li.is-missed i  { background: var(--rn-missed, #6E2F27); }
.rn-d-ev li b { font-weight: 500; font-variant-numeric: tabular-nums; }
.rn-d-ev li em { font-style: normal; font-size: 11.5px; color: var(--text-faint); }
.rn-d-note { margin: 12px 0 0; font-size: 12.5px; color: var(--rn-expires, #7A6635); }
.rn-q { margin: 12px 0 0; padding: 10px 13px; border-left: 2px solid var(--line-strong);
  background: var(--bg-sunk); border-radius: 0 8px 8px 0;
  font-family: var(--serif); font-size: 13px; line-height: 1.55; color: var(--text); }
.rn-q > span { display: block; margin-bottom: 5px; font-family: var(--font);
  font-size: 10.5px; letter-spacing: .04em; text-transform: uppercase; color: var(--text-faint); }
.rn-off { display: block; margin-top: 7px; font-family: var(--font); font-size: 11.5px;
  color: var(--rn-notice, #A63D32); }
.rn-d-a { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 13px; }

/* upcoming, in Horizon's dates idiom */
.rn-h { margin: 26px 0 8px; font-family: var(--serif); font-size: 17px; font-weight: 500; }
.rn-rows { border-top: 1px solid var(--line); }
.rn-row-m { padding: 11px 2px 5px; font-size: 10.5px; letter-spacing: .05em;
  text-transform: uppercase; color: var(--text-faint); }
.rn-row { appearance: none; display: grid; width: 100%;
  grid-template-columns: 26px minmax(0, 1fr) minmax(0, 126px) 78px;
  align-items: center; gap: 11px; padding: 9px 6px;
  border: 0; border-top: 1px solid var(--line-soft); border-radius: 7px;
  background: none; font: inherit; text-align: left; cursor: pointer; }
.rn-row:hover { background: var(--tint); }
.rn-row.is-on { background: var(--tint); box-shadow: inset 2px 0 0 var(--gold, #847347); }
.rn-row-d { font-family: var(--serif); font-size: 19px; color: var(--text-soft);
  text-align: right; font-variant-numeric: tabular-nums; }
.rn-row-t { min-width: 0; }
.rn-row-t b { display: block; font-size: 12.5px; font-weight: 500; line-height: 1.35; }
.rn-row-sub { display: flex; align-items: center; gap: 7px; min-width: 0; margin-top: 3px; }
.rn-row-sub .rn-k { flex: none; }
.rn-row-c { min-width: 0; font-size: 11.5px; color: var(--text-soft);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rn-row-w { display: flex; align-items: center; gap: 6px; min-width: 0;
  font-size: 11.5px; color: var(--text-soft); }
.rn-row-w > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rn-face { width: 20px; height: 20px; flex: none; font-size: 9px; }
.rn-row-s { font-size: 11.5px; color: var(--text-faint); text-align: right; }
.rn-row-s.is-soon { color: var(--rn-notice, #A63D32); }
.rn-row-s.is-late { color: var(--rn-missed, #6E2F27); }
.rn-rows-foot { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid var(--line-soft);
  font-size: 11.5px; color: var(--text-faint); }
.rn-empty { margin: 0; padding: 18px 0; font-size: 12.5px; color: var(--text-soft); }

.rn-check { display: flex; align-items: flex-start; gap: 8px; margin: 20px 0 0;
  padding: 11px 13px; border: 1px solid var(--line); border-radius: 10px;
  background: var(--bg-sunk); font-size: 12px; line-height: 1.5; color: var(--text-soft); }
.rn-check-ic { flex: none; color: var(--rn-expires, #7A6635); }
.rn-check b { color: var(--text); font-weight: 500; }

/* Docked, the panel is about half the window whatever the window is, so
   what decides this is full screen rather than viewport width — and the
   shell already records that. A container query would be the truer test,
   but inline-size containment collapses .artifact-shell's grid track. */
#main[data-expanded="true"] .rn-kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
#main[data-expanded="true"] .rn { padding: 30px 34px 72px; }
#main[data-expanded="true"] .rn-cell { min-height: 92px; }

@media (max-width: 720px) {
  .rn { padding: 20px 16px 56px; }
  .rn-cell { min-height: 60px; }
  .rn-legend { margin-left: 0; }
  .rn-row { grid-template-columns: 24px minmax(0, 1fr) 72px; }
  .rn-row-w { display: none; }
}
`));
}
