/* ------------------------------------------------------------------
   A memo, or an issues list, set to a named house format.

   Clavia already knows how to be asked "set this the way that one is
   set" — modules.js does it for templates, and its dimensions are the
   typographic ones: layout, paper, typeface. That is the right question
   for a template and the wrong one for a memo. What a firm means by its
   house format for a memo is a privilege banner, the meta block at the
   top, the names of the sections and the order they come in, and
   whether they are numbered. None of that is a typeface.

   So this is the same gesture against a different object. The format
   lives here; the document is an ordinary `doc` artifact, which means
   renderDoc draws it, bumpVersion versions it, and docRedline and the
   plain-words editing in artifacts.js keep working on it afterwards.
   Nothing in artifacts.js has to know this file exists.

   The one rule the whole file obeys: formatting never rewrites the
   prose. Sections are relabelled, reordered and renumbered, a banner
   goes on or comes off, the meta block is re-captioned. The words
   inside a section are the author's. That is what formatting is, and
   it is also what keeps this out of docRedline's way — a reformat is a
   version, not a tracked change, because there is nothing in it for
   anybody to accept or reject.
------------------------------------------------------------------ */

/* ── the house formats ────────────────────────────────────────
   New data, declared here, because nothing seeded carries one. Two of
   the three are the formats Clavia already names as skills and then
   never applies to a document: sk-escalate ("one page: what they want,
   what we offered, what it costs, what you recommend") and the legal
   memo its own output field calls a Memo. Those words are where the
   section names come from, so a skill and a format cannot drift apart.

   `match` is what the chat recognises; `file` is what a handed-over
   document's NAME can be recognised by, which is all a handed-over
   document has here. */
const FMT_HOUSE = {
  memo: {
    id: 'memo',
    name: 'the legal memo format',
    the: 'our legal memo format',
    match: /\b(?:house|legal|standard|memo(?:randum)?)\s*(?:memo(?:randum)?\s*)?format\b|\bmemo(?:randum)?\s+(?:house\s+)?(?:format|layout)\b|\bhouse\s+(?:style|format)\b/i,
    file: /\bmemo\b|house.?(?:style|format)|work.?product/,
    banner: 'PRIVILEGED AND CONFIDENTIAL — ATTORNEY WORK PRODUCT',
    labels: { to: 'To', by: 'From', date: 'Date', re: 'Re' },
    number: true,
    sections: ['Question', 'Background', 'Where we stand', 'Risk', 'Recommendation'],
    says: 'privilege banner, To / From / Date / Re, numbered sections',
  },
  escalation: {
    id: 'escalation',
    name: 'the escalation note format',
    the: 'the escalation note format',
    match: /\bescalation\s*(?:note|memo)?\s*format\b|\bescalation\s+note\b|\bformat\b[^.]*\bescalation\b/i,
    file: /escalat|general.?counsel|\bgc\b/,
    banner: 'PRIVILEGED AND CONFIDENTIAL — PREPARED FOR THE GENERAL COUNSEL',
    labels: { to: 'For the decision of', by: 'Prepared by', date: 'Date', re: 'Matter' },
    number: false,
    sections: ['Decision needed', 'What they have asked for', 'What we have offered',
               'What it costs us', 'Recommendation'],
    says: 'banner, the decision needed first, no numbering, one page',
  },
  plain: {
    id: 'plain',
    name: 'plain',
    the: 'plain',
    match: /\b(?:back to plain|plain(?: format| document)?|no format(?:ting)?|unformatted|strip (?:the )?format(?:ting)?|house format off)\b/i,
    file: null,
    banner: null,
    labels: { to: 'To', by: 'From', date: 'Date', re: 'Re' },
    number: false,
    sections: [],
    says: 'no banner, no numbering, headings as written',
  },
};
const FMT_LIST = [FMT_HOUSE.memo, FMT_HOUSE.escalation, FMT_HOUSE.plain];

/* ── matching a heading to a section name ─────────────────────
   mxStems (modules.js) already does the hard half: cut to stems so
   "Recommendation" finds "Our recommendation". What it does not do is
   drop the words every heading shares, and this format has two
   sections that begin "What" — so without the filter below, "What they
   have asked for" matches "What we have offered" and the two change
   places. The stops are listed as stems, since that is what they are
   compared against. */
const FMT_STOP = new Set(['what', 'they', 'have', 'their', 'this', 'that', 'with', 'from',
  'will', 'been', 'into', 'when', 'where', 'which', 'these', 'those', 'there', 'your',
  'about', 'under', 'shall', 'would', 'could', 'other', 'thing', 'some', 'here']);
const fmtStems = (x) => (typeof mxStems === 'function'
  ? mxStems(String(x)) : String(x).toLowerCase().replace(/[^a-z]+/g, ' ').split(' ')
    .filter(w => w.length > 3).map(w => w.slice(0, 6))).filter(w => !FMT_STOP.has(w));

/* a heading's own number, which belongs to the format rather than to
   the heading, so it comes off before anything is compared */
const FMT_NUM = /^\s*\d+(?:\.\d+)*[.)]?\s+/;
const fmtBare = (s) => String(s).replace(FMT_NUM, '').trim();
const fmtText = (v) => typeof docPlain === 'function' ? docPlain(v) : String(v);
const fmtEsc = (v) => typeof docEsc === 'function' ? docEsc(v)
  : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtOf = (a) => FMT_HOUSE[(typeof bodyOf === 'function' ? bodyOf(a, 'fmt') : a?.fmt)] || FMT_HOUSE.plain;

/* ── applying one ─────────────────────────────────────────────
   A document is a flat list of blocks, so a section is a heading and
   everything under it until the next heading. Group them, match each
   group to the format's section names, put the matched ones in the
   format's order with the format's wording, leave the rest where they
   were, and number or unnumber the lot.

   A heading still carrying an unresolved tracked change is left
   exactly as it is. Renaming it would quietly throw away a proposal
   somebody has not answered yet, and the report says when that
   happened rather than pretending the format applied cleanly. */
function fmtGroups(blocks) {
  const lead = [], groups = [];
  let cur = null;
  for (const b of blocks) {
    if (b.fmtRole === 'banner' || b.fmtRole === 'meta') continue;
    if (b.t === 'h2') { cur = { h: b, body: [] }; groups.push(cur); continue; }
    (cur ? cur.body : lead).push(b);
  }
  return { lead, groups };
}

const fmtHeld = (b) => typeof b.v === 'string' && b.v.includes('data-rl');

/* the meta block, re-captioned. Only a document this file made carries
   the four facts, so a document from anywhere else keeps whatever meta
   line it already had rather than having one invented for it. */
function fmtMetaBlock(a, fmt) {
  const m = a.fmtMeta;
  if (!m) return null;
  const parts = ['to', 'by', 'date', 're']
    .filter(k => m[k])
    .map(k => `<span class="fmt-lbl">${fmtEsc(fmt.labels[k])}</span>${fmtEsc(m[k])}`);
  if (!parts.length) return null;
  return { t: 'meta', fmtRole: 'meta', v: parts.join('<span class="fmt-sep">·</span>') };
}

/* Returns what it did, so the chat can say it rather than claim it. */
function fmtApply(a, fmt) {
  const blocks = (bodyOf(a, 'blocks') || []).map(b => ({ ...b }));
  const { lead, groups } = fmtGroups(blocks);
  const was = fmtOf(a);

  const taken = [], renamed = [];
  let held = 0;
  for (const name of fmt.sections) {
    const want = fmtStems(name);
    if (!want.length) continue;
    const at = groups.findIndex((g, i) => !taken.includes(i) && !fmtHeld(g.h)
      && fmtStems(fmtBare(fmtText(g.h.v))).some(w => want.includes(w)));
    if (at < 0) continue;
    taken.push(at);
    const from = fmtBare(fmtText(groups[at].h.v));
    if (from.toLowerCase() !== name.toLowerCase()) renamed.push([from, name]);
    groups[at].h.v = name;
  }
  /* Only the sections the format recognises change places, and they
     only ever change places with each other: the slots they already
     occupy are handed back out in the format's order. A section the
     format has never heard of does not move at all — the alternative
     is one matched heading being lifted over four unmatched ones to
     sit at the top, which is not an order anybody asked for. */
  const slots = taken.slice().sort((x, y) => x - y);
  const order = groups.map((g, i) => i);
  slots.forEach((slot, k) => { order[slot] = taken[k]; });
  const moved = order.some((v, i) => v !== i);
  const sections = order.map(i => groups[i]);

  let n = 0, numbered = 0, stripped = 0;
  for (const g of sections) {
    if (fmtHeld(g.h)) { held++; continue; }
    const bare = fmtBare(fmtText(g.h.v));
    const next = fmt.number ? `${++n}. ${bare}` : bare;
    if (next !== fmtText(g.h.v)) { if (fmt.number) numbered++; else stripped++; }
    g.h.v = next;
  }

  const h1 = lead.find(b => b.t === 'h1') || null;
  const rest = lead.filter(b => b !== h1);
  const out = [];
  if (h1) out.push(h1);
  if (fmt.banner) out.push({ t: 'meta', fmtRole: 'banner', v: `<span class="fmt-banner">${fmtEsc(fmt.banner)}</span>` });
  const meta = fmtMetaBlock(a, fmt);
  if (meta) out.push(meta);
  out.push(...rest);
  for (const g of sections) out.push(g.h, ...g.body);

  /* A version that carries the body forward unchanged is a version
     number and nothing else — you switch to it and the page is
     identical, which reads as a bug. Setting a document to the format
     it is already in is exactly that, so it does not make one. */
  const same = JSON.stringify(out) === JSON.stringify(bodyOf(a, 'blocks'));
  const v = same ? null : bumpVersion(a, { name: `Set in ${fmt.name}` }, { blocks: out, fmt: fmt.id });
  return { v, same, fmt, was, renamed, moved, numbered, stripped, held,
           sections: sections.length, matched: taken.length,
           banner: !!fmt.banner, lostBanner: !!was.banner && !fmt.banner };
}

/* what a reformat reads like in a sentence, built from what actually
   changed rather than from what was asked for */
function fmtSays(r) {
  const did = [];
  if (r.banner) did.push('the banner is on');
  if (r.lostBanner) did.push('the banner is off');
  if (r.renamed.length) did.push(r.renamed.length === 1
    ? `“${r.renamed[0][0]}” is now “${r.renamed[0][1]}”`
    : `${r.renamed.length} headings took the format’s own wording`);
  if (r.moved) did.push('the sections are in the format’s order');
  if (r.numbered) did.push(`${r.numbered === 1 ? 'one heading is' : r.numbered + ' headings are'} numbered`);
  if (r.stripped) did.push('the numbering is off');
  let out = did.length && !r.same
    ? `Set in ${r.fmt.name} — ${did.join(', ')}. The wording inside each section is untouched.`
    : `It is already in ${r.fmt.name}, so nothing moved and there is no new version.`;
  if (r.same) return out;
  if (!r.matched && r.fmt.sections.length && r.sections) {
    out += `\n\nI did not rename anything: none of your headings answer to ${r.fmt.sections
      .slice(0, 2).map(s => `“${s}”`).join(' or ')}, and inventing a section you have not written `
      + 'would be worse than leaving yours alone.';
  }
  if (r.held) out += `\n\n${r.held === 1 ? 'One heading' : r.held + ' headings'} still `
    + `${r.held === 1 ? 'has' : 'have'} a tracked change waiting on an answer, so I left `
    + `${r.held === 1 ? 'it' : 'them'} alone — answer the change and ask me again.`;
  if (r.v) out += `\n\nThat is **v${r.v}**; v${r.v - 1} is still in the history.`;
  return out;
}

/* ── the two documents ────────────────────────────────────────
   Both are built from the Acme MSA review, because that is the one
   fixture in the app that carries a position, a reason and an ask for
   every clause. Nothing below invents a fact: every sentence is
   assembled out of JV_REVIEWS['acme-msa'] (reviews-data.js) and
   RP_REVIEW['acme-msa'] (review-plus-data.js). */
const FMT_SRC = () => ({
  R: typeof JV_REVIEWS === 'object' ? JV_REVIEWS['acme-msa'] : null,
  RP: typeof RP_REVIEW === 'object' ? RP_REVIEW['acme-msa'] : null,
});
const FMT_STAND = { unacceptable: 'Outside the playbook', fallback: 'Inside our fallback',
  preferred: 'Where we want it', missing: 'Not in the contract', none: 'Not in the playbook' };

/* whichever side we are on, said the way a memo says it */
const fmtShort = (R) => String(R.playbook?.name || 'the playbook').replace(/\s+agreement$/i, '');
/* who the flagged clauses escalate to — taken from the clauses rather
   than assumed, since the fixture is the only thing that knows */
function fmtEscalateTo(R) {
  const who = {};
  for (const c of R.clauses) if (c.escalate) who[c.escalate] = (who[c.escalate] || 0) + 1;
  return Object.keys(who).sort((a, b) => who[b] - who[a])[0] || 'the General Counsel';
}
/* our position on a clause: the playbook's starting position if the
   review has one drafted, its fallback if not, and the walk-away line
   as a last resort */
function fmtOurs(R, c) {
  const opts = R.deep?.[String(c.n)]?.options || [];
  const pick = opts.find(o => o.key === 'starting') || opts.find(o => o.key === 'fallback') || opts[0];
  return pick?.text || c.why || 'Not drafted yet.';
}
const fmtToday = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function fmtMemoBlocks() {
  const { R, RP } = FMT_SRC();
  if (!R || !RP) return null;
  const bad = R.clauses.filter(c => c.status === 'unacceptable');
  const fb = R.clauses.filter(c => c.status === 'fallback');
  const cp = RP.counterparty || {}, ex = RP.exposure || {}, asks = RP.asks || {};
  const line = (c) => `${fmtBare(c.heading)} — ${asks[c.n] || c.why}`;

  return [
    { t: 'h1', v: `${R.name} — Where It Stands` },
    { t: 'p', v: `Whether we can sign ${fmtEsc(cp.name || 'the counterparty')}’s ${fmtEsc(RP.version || 'their version')} `
      + `of our ${fmtEsc(fmtShort(R))} as it stands, and what has to be pushed back on first.` },
    { t: 'h2', v: 'Question' },
    { t: 'p', v: `We are the ${fmtEsc(String(R.playbook?.party || 'party').toLowerCase())} on our own paper, on an account `
      + `worth ${fmtEsc(RP.setup?.value || 'the deal value')} in ${fmtEsc(RP.setup?.region || 'the region')}. `
      + `The question is which of ${fmtEsc(cp.name || 'their')}’s changes we can live with and which need a counter before signature.` },
    { t: 'h2', v: 'Background' },
    { t: 'p', v: `${R.clauses.length} clauses were read against the ${fmtEsc(R.playbook?.name || 'playbook')} playbook. `
      + `${R.counts.unacceptable || 0} sit outside what we accept, ${R.counts.fallback || 0} land inside a fallback `
      + `we can live with, ${R.counts.preferred || 0} is already where we want it, and ${R.counts.none || 0} `
      + `are not covered either way. ${fmtEsc(cp.line || '')}`.trim() },
    { t: 'h2', v: 'Where we stand' },
    { t: 'p', v: 'The ones outside the playbook, and what they are asking for:' },
    { t: 'ul', v: bad.map(c => fmtEsc(line(c))) },
    { t: 'p', v: `Inside the fallback, and settleable without anyone else: ${fb.map(c => fmtEsc(fmtBare(c.heading))).join(', ')}.` },
    { t: 'h2', v: 'Risk' },
    { t: 'p', v: `${fmtEsc(ex.line || '')} ${fmtEsc(ex.detail || '')}`.trim()
      || 'The review flags no combined exposure across the changed clauses.' },
    { t: 'quote', v: fmtEsc(R.deep?.['9']?.summary || R.clauses.find(c => c.status === 'unacceptable')?.summary || '') },
    { t: 'h2', v: 'Recommendation' },
    { t: 'p', v: fmtEsc(cp.close || 'Counter the clauses outside the playbook with our fallbacks.') },
    { t: 'p', v: `${bad.length === 1 ? 'One point needs' : bad.length + ' points need'} `
      + `${fmtEsc(fmtEscalateTo(R))} before we respond. Everything else is ours to settle.` },
  ];
}

function fmtIssuesBlocks(shape) {
  const { R, RP } = FMT_SRC();
  if (!R || !RP) return null;
  const asks = RP.asks || {};
  /* the same filter the review's own issues list uses: what is
     settled or uncovered is not an issue */
  const open = R.clauses.filter(c => c.status === 'unacceptable' || c.status === 'fallback');
  const rows = open.map(c => ({
    point: fmtBare(c.heading),
    theirs: asks[c.n] || c.text,
    ours: fmtOurs(R, c),
    stands: c.status === 'unacceptable'
      ? `${FMT_STAND[c.status]}. ${c.escalate ? c.escalate + ' decides.' : 'Open.'}`
      : `${FMT_STAND[c.status]}. Open — ours to settle.`,
  }));

  const out = [
    { t: 'h1', v: `${R.name} — Issues List` },
    { t: 'p', v: `${rows.length} open points against the ${fmtEsc(R.playbook?.name || 'playbook')} playbook, `
      + 'worst first. Nothing here has been accepted or countered yet.' },
  ];
  const lbl = (k, v) => `<span class="fmt-lbl">${k}</span>${fmtEsc(v)}`;
  for (const r of rows) {
    out.push({ t: 'h2', v: fmtEsc(r.point) });
    if (shape === 'bullets') {
      out.push({ t: 'ul', v: [lbl('Their position', r.theirs), lbl('Our position', r.ours), lbl('Where it stands', r.stands)] });
    } else {
      out.push({ t: 'p', v: lbl('Their position', r.theirs) });
      out.push({ t: 'p', v: lbl('Our position', r.ours) });
      out.push({ t: 'p', v: lbl('Where it stands', r.stands) });
    }
  }
  return out;
}

/* ── making one ───────────────────────────────────────────────
   Asked for a second time the body is rebuilt from the fixtures and
   the format re-applied, as a new version rather than a second
   artifact beside the first. */
const FMT_ART = { memo: 'doc-fmt-memo', issues: 'doc-fmt-issues' };

function fmtArtifact(kind, fmt) {
  const { R, RP } = FMT_SRC();
  if (!R || !RP) return null;
  const shape = kind === 'issues' ? 'sections' : null;
  const blocks = kind === 'memo' ? fmtMemoBlocks() : fmtIssuesBlocks(shape);
  if (!blocks) return null;

  const id = FMT_ART[kind];
  /* the header and the heading say the same thing, the way the seeded
     documents do */
  const name = kind === 'memo' ? `${R.name} — Where It Stands` : `${R.name} — Issues List`;
  const meta = { to: fmtEscalateTo(R), by: USER.name, date: fmtToday(),
                 re: `${R.name} · ${RP.version || ''}`.trim().replace(/ ·\s*$/, '') };

  let a = ARTIFACTS[id];
  if (a) {
    a.fmtMeta = meta;
    a.fmtShape = shape;
    bumpVersion(a, { name: 'Rebuilt from the review' }, { blocks });
  } else {
    a = defineArtifact({
      id, kind: 'doc', ext: 'docx', name,
      sub: `${RP.counterparty?.name || 'Counterparty'} · ${kind === 'memo' ? 'Memo' : 'Issues list'}`,
      fmtKind: kind, fmtMeta: meta, fmtShape: shape,
      versions: [{ name: 'Drafted', when: 'Just now', by: 'Assistant', blocks, fmt: 'plain' }],
    });
    /* made in this conversation, so the history starts here rather than
       claiming a seeded one. startVersions keeps the body and drops the
       metadata, so the first version is named again afterwards — an
       unnamed one shows up in the version list as nothing at all. */
    startVersions(a);
    Object.assign(a.versions[0], { name: 'Drafted, before the format', fmt: 'plain' });
  }
  const r = fmtApply(a, fmt);
  return { a, r, kind };
}

/* ── reading the ask ──────────────────────────────────────────
   Every branch below is a regex over the words you typed. There is no
   model here: if the sentence does not say which format, which way the
   numbering goes or which file to copy, nothing is guessed — the
   function returns null and the conversation asks. */
const FMT_MAKE = /\b(write|draft|draw up|put together|prepare|produce|make|build|give me|i need|need a)\b/i;
const FMT_WANT_MEMO = /\b(memo|memorandum|escalation note|note for (?:the )?(?:gc|general counsel))\b/i;
const FMT_WANT_ISSUES = /\bissues?\s*list\b/i;
const FMT_LIKE = /\b(like|as|to match|match(?:ing)?|same as|after|copy)\b/i;
const FMT_SET = /\b(re-?format|format|set|style|lay(?: it)? out|use|put|switch|apply)\b/i;
const FMT_OFF = /\b(no|not|without|drop|remove|take|lose|strip|off|un-?numbered|stop)\b/i;

/* ── a subject it was asked for and cannot write from ─────────
   Both documents above are assembled out of one review, the Acme MSA,
   because it is the only fixture carrying a position, a reason and an
   ask for every clause. An ask that names a different contract still
   gets the Acme memo, so it has to be told it did: the name is read
   back out of the other reviews rather than guessed, so this says
   nothing unless the ask really named one of them. */
function fmtOtherSubject(q) {
  const { R } = FMT_SRC();
  if (typeof JV_REVIEWS !== 'object' || !R) return null;
  for (const rv of Object.values(JV_REVIEWS)) {
    if (!rv || rv === R || !rv.name) continue;
    const word = (String(rv.name).match(/[A-Z][\w'’-]{3,}/) || [])[0];
    if (word && new RegExp('\\b' + word + '\\b', 'i').test(q)) return rv.name;
  }
  return null;
}

/* "write me a memo" / "draft the issues list in our house format" */
function fmtBuildAsk(q) {
  if (!FMT_MAKE.test(q)) return null;
  const kind = FMT_WANT_ISSUES.test(q) ? 'issues' : FMT_WANT_MEMO.test(q) ? 'memo' : null;
  if (!kind) return null;
  /* asked for without a format named, it still has to be set somehow,
     and the legal memo format is the firm's default */
  return { kind, fmt: FMT_LIST.find(f => f.match.test(q)) || FMT_HOUSE.memo };
}

/* a format document handed over in the box. Only its name arrives here
   — a chat attachment is {name} and nothing else — so the name is what
   is read, and the answer says so rather than inventing headings it
   cannot have seen. */
function fmtFromFile(name) {
  const n = String(name).toLowerCase();
  return FMT_LIST.find(f => f.file && f.file.test(n)) || null;
}

function fmtAsk(a, q, files) {
  const file = files && files[0] ? files[0].name : null;
  const fmt = fmtOf(a);

  /* "format it like this one" — the handed-over document decides */
  if (file && FMT_SET.test(q) && (FMT_LIKE.test(q) || /\bthis\b/i.test(q))) {
    const found = fmtFromFile(file);
    if (found) return { name: `Set the way ${file} is set`,
      run: () => fmtApply(a, found),
      say: (r) => `I can only read ${file} by its name — a document handed over in the box arrives here as `
        + `a name and nothing else. The name says ${found.name}, so that is what I used.\n\n${fmtSays(r)}` };
    return { name: null,
      say: () => `I have ${file}, but only its name — a document handed over in the box arrives here as a name `
        + 'and nothing else, so I cannot read the headings out of it.\n\nTell me which it is and I will set '
        + `this to it: ${FMT_LIST.filter(f => f.id !== 'plain').map(f => f.name).join(', or ')}.` };
  }

  /* a format named outright */
  const named = FMT_LIST.find(f => f.match.test(q));
  /* asked for the format it is already in, it still runs: fmtApply
     makes no version when nothing moves, and saying "it is already
     plain" is a better answer than not recognising the sentence */
  if (named) return { name: `Set in ${named.name}`, run: () => fmtApply(a, named), say: (r) => fmtSays(r) };

  /* numbering on its own, without changing anything else */
  if (/\b(number|numbered|numbering|renumber)\b/i.test(q)) {
    const on = !FMT_OFF.test(q);
    if (on === !!fmt.number) return { name: null,
      say: () => `The headings are already ${fmt.number ? 'numbered' : 'unnumbered'} — ${fmt.name} `
        + `${fmt.number ? 'numbers' : 'does not number'} them.` };
    const next = { ...fmt, id: fmt.id, number: on, name: `${fmt.name}, ${on ? 'numbered' : 'unnumbered'}` };
    return { name: on ? 'Numbered the headings' : 'Took the numbering off',
      run: () => fmtApply(a, next), say: (r) => fmtSays(r) };
  }

  /* the banner, likewise */
  if (/\bbanner\b/i.test(q)) {
    const on = !FMT_OFF.test(q);
    const src = on && !fmt.banner ? FMT_HOUSE.memo : fmt;
    const next = { ...fmt, banner: on ? src.banner : null,
      name: `${fmt.name}, ${on ? 'with the banner' : 'with no banner'}` };
    return { name: on ? 'Put the banner on' : 'Took the banner off',
      run: () => fmtApply(a, next), say: (r) => fmtSays(r) };
  }

  /* an issues list reads either as sections or as bullets under each
     point. That is a shape, not a format, and it rebuilds the body —
     so it says so, because an edit made on the page would be lost. */
  if (a.fmtKind === 'issues' && /\b(bullet|bullets|bulleted|section|sections|headings?)\b/i.test(q)) {
    const want = /\bbullet/i.test(q) ? 'bullets' : 'sections';
    if (want === (a.fmtShape || 'sections')) return { name: null,
      say: () => `The points are already set as ${want}.` };
    return { name: `Set the points as ${want}`,
      run: () => {
        const before = a.versions.length;
        a.fmtShape = want;
        bumpVersion(a, { name: `Points as ${want}` }, { blocks: fmtIssuesBlocks(want) });
        return { ...fmtApply(a, fmtOf(a)), before };
      },
      say: (r) => `Each point now reads as ${want === 'bullets' ? 'three bullets under its heading'
        : 'three short paragraphs under its heading'}.\n\nThe body was rebuilt from the review to do it, `
        + `so anything typed into the page by hand is back in v${r.before} rather than here.\n\n${fmtSays(r)}` };
  }

  return null;
}

function fmtSuggest(a) {
  const fmt = fmtOf(a);
  const out = [];
  const other = FMT_LIST.find(f => f.id !== fmt.id && f.id !== 'plain');
  if (other) out.push(`Set it in ${other.name}`);
  out.push(fmt.number ? 'Take the numbering off the headings' : 'Number the headings');
  if (a.fmtKind === 'issues') out.push((a.fmtShape || 'sections') === 'bullets'
    ? 'Show each point as sections' : 'Show each point as bullets');
  else if (fmt.id !== 'plain') out.push('Back to plain');
  return out;
}

/* ── the chat side ────────────────────────────────────────────
   Built the way templateTurn is built (modules.js): push one bot
   message, run the steps on it, then write the answer and open the
   canvas on what changed. Returns true only when it took the turn, so
   anything it does not recognise falls back through to botTurn. */
function formatTurn(a, prompt, files = []) {
  const q = String(prompt || '');
  const build = fmtBuildAsk(q);
  /* what is open beside the conversation first, and only then what was
     last named in it — the order botTurn already uses, so a reformat
     lands on the document you are looking at */
  const open = typeof openArtifactNow !== 'undefined' ? openArtifactNow : null;
  const on = (open && open.kind === 'doc') ? open : a;
  const doc = on && on.kind === 'doc' ? on : null;
  const spec = !build && doc ? fmtAsk(doc, q, files) : null;
  /* a conversation already holding one of these documents is answered
     here even when the ask is not understood — somewhere else would
     answer it about something other than the thing on screen */
  const mine = !!(doc && doc.fmtKind);
  if (!build && !spec && !mine) return false;
  if (!build && !spec && !/\bformat|banner|heading|number|section|bullet|plain|memo|issues?\s*list\b/i.test(q)) return false;

  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();

  const first = files.length
    ? { source: 'internal', query: `Read ${files.map(f => f.name).join(', ')}`,
        rows: files.map(f => ({ title: f.name, meta: 'handed over — name only' })) }
    : build
    ? { source: 'playbook', query: 'Read the review against the playbook' }
    : { source: 'format', query: 'Read the request against the document' };

  setTimeout(() => { m.steps.push({ ...first, rows: first.rows || [], running: true }); renderBot(m); }, 320);
  setTimeout(() => { Object.assign(m.steps[0], first, { running: false }); renderBot(m); }, 1200);
  setTimeout(() => {
    m.thinking = false;
    m.cites = null;
    if (m.traceOpen == null) m.traceOpen = false;

    if (build) {
      const made = fmtArtifact(build.kind, build.fmt);
      if (!made) {
        m.text = 'I could not build it — the Acme review these are written from is not loaded.';
        renderBot(m);
        return;
      }
      const { R } = FMT_SRC();
      const other = fmtOtherSubject(q);
      m.steps.push({ source: 'format', query: `Set in ${build.fmt.name}`,
        count: 'v' + (made.r.v || made.a.versions.length) });
      m.text = (other
        ? `You asked about ${other}, and this is on ${R.name} instead — it is the only review I hold `
          + `a position, a reason and an ask on for every clause, so it is the only one I can write `
          + `either of these documents from. The format is the one you asked for; the subject is not.\n\n`
        : '')
        + (build.kind === 'memo'
        ? `A one-page memo on where ${R.name} stands: the question, the background, the points outside `
          + `the playbook, the exposure they add up to, and a recommendation.`
        : `${R.name} as an issues list — every open point with their position, ours, `
          + 'and where it stands.')
        + `\n\nIt is written from the review itself, so every position in it is the playbook's rather than mine. `
        + `Set in ${build.fmt.name}: ${build.fmt.says}.\n\nNothing in the prose is formatting — ask me to `
        + 'renumber, rename the sections or take the banner off and only the setting moves.';
      m.artifact = made.a.id;
      m.suggest = fmtSuggest(made.a);
      renderBot(m);
      openArtifact(made.a);
      return;
    }

    if (spec && spec.run) {
      const r = spec.run();
      m.steps.push({ source: 'format', query: spec.name, count: r?.v ? 'v' + r.v : 'no change' });
      m.text = spec.say(r);
      m.artifact = doc.id;
      m.suggest = fmtSuggest(doc);
      renderBot(m);
      if (document.getElementById('main')?.dataset.artifact === 'open') openArtifact(doc);
      return;
    }

    if (spec) {
      m.text = spec.say();
      m.artifact = doc.id;
      m.suggest = fmtSuggest(doc);
      renderBot(m);
      return;
    }

    const fmt = fmtOf(doc);
    m.text = `This is in ${fmt.name} — ${fmt.says}.\n\nI could not tell what to change about the setting. `
      + `Name a format — ${FMT_LIST.filter(f => f.id !== fmt.id).map(f => f.name).join(', or ')} — or say `
      + 'whether the headings should be numbered and whether the banner stays. '
      + 'Changing the wording is a different ask and goes through the document itself.';
    m.artifact = doc.id;
    m.suggest = fmtSuggest(doc);
    renderBot(m);
  }, 1700);
  return true;
}

/* what the trace says it read when a step came from here */
SOURCES.format = { label: 'the format', verb: 'Read',
  icon: '<rect x="4" y="3" width="16" height="18" rx="2.2"/><path d="M7.5 7h9"/>'
      + '<path d="M7.5 11.5h9M7.5 15h5.5"/>' };

/* ── its own stylesheet ──────────────────────────────────────────
   Appended once at load: the shared sheets are not this feature's to
   edit. Three rules, because three things are new on the page — the
   banner, the captions in the meta line, and the dot between them.
   Everything else is the document's own typography, which is the point
   of putting a memo on a doc artifact rather than inventing a kind. */
(function fmtStyle() {
  const id = 'fmt-css';
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = `
/* the privilege line: said once, in caps, and ruled off from the
   document so it reads as a stamp rather than as a first sentence */
.doc-page .fmt-banner {
  display: block; margin: 0 0 2px;
  font-size: 10.6px; font-weight: 620; letter-spacing: .085em; text-transform: uppercase;
  color: var(--fmt-banner, #8A6A2F);
  border-bottom: 1px solid var(--fmt-banner-line, #E6DCC6);
  padding-bottom: 6px;
}
/* To / From / Date / Re, and the labels inside an issues point. Quiet
   enough to read past, present enough to find. */
.doc-page .fmt-lbl {
  font-size: 10.6px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
  color: var(--text-faint, #9A968E);
  margin-right: 7px;
}
.doc-page .fmt-sep { margin: 0 9px; color: var(--line, #E8E4DF); }
.doc-page .doc-ul .fmt-lbl { display: inline-block; min-width: 108px; margin-right: 4px; }`;
  document.head.append(el);
})();
