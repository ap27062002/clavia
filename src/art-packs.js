/* ------------------------------------------------------------------
   Packs — a memo, a risk dashboard, and the one ask that makes
   several things at once.

   The brief asked for four new artifact kinds: a memo, a risk
   dashboard, an approval workflow and a signing checklist. Two of
   them are already here and are better than a picture of themselves.
   The approval workflow is live and derived — mxApprovalRules() reads
   which roles must say yes off the deal as it stands, mxApNow() marks
   an approval stale when a later version moved the terms that role
   cares about, and the whole thing is undoable (modules-work.js).
   The signing checklist is the same engine's mxSignWaiting(). Drawing
   either of them again as a static diagram would be a downgrade, so
   this file links to them instead and says in one line what they
   already know.

   The other two are not new kinds. A memo is a `doc` — renderDoc
   already gives it tracked changes, versions, plain-word edits and
   Word/PDF/Google Docs export. A dashboard is the `app` kind's whole
   purpose. The only genuinely new thing is a second dashboard body,
   which needs one kind of its own (riskdash) because RENDER is keyed
   on kind and app-pipeline already owns `app`.

   So: one new kind, one reused kind, two features linked. Plus the
   thing that really was missing — one ask that produces several
   artifacts, done as one chat turn per artifact rather than one turn
   carrying four cards, because a bot message holds exactly one.

   Every number here is read from the fixtures the rest of Clavia
   reads: MX_ISSUES through mxIssues(), MX_ROUNDS through mxRounds(),
   JV_REVIEWS through the request's review, docPending() for a
   redlined document. Where none of those is present this says so
   rather than filling in a figure.
------------------------------------------------------------------ */

/* ── where a point landed against the playbook ─────────────────
   Four gradings, worst first, which is the order the risk is read in.
   Missing sits beside outside rather than with the acceptable ones:
   a clause the playbook expects and the contract does not have is a
   red, which is the judgement the issues list makes too. */
const PK_LAND = ['outside', 'missing', 'fallback', 'within'];
const PK_LAND_LABEL = {
  outside: 'Outside the playbook',
  missing: 'Missing from the contract',
  fallback: 'On our fallback',
  within: 'Within the playbook',
  other: 'Not graded against the playbook',
};
const PK_LAND_SHORT = { outside: 'Outside', missing: 'Missing', fallback: 'Fallback', within: 'Within', other: 'Not graded' };

/* "Fallback · 48 hours" and "Outside · 30 days is our limit" are the
   issues list's own words, and the first of them is the landing.
   Anything else it says — "Starting position" — is not a landing and
   is not pressed into one. */
const pkLand = (text) => {
  const w = String(text || '').trim().split(/\s*·\s*|\s+/)[0].toLowerCase();
  return PK_LAND.includes(w) ? w : null;
};

/* a review grades a clause in its own vocabulary; the two meet here */
const PK_FROM_REVIEW = { unacceptable: 'outside', fallback: 'fallback', preferred: 'within', missing: 'missing' };

/* what the four groups on the request's issues list are called. The
   request page says "With Brightwell" off the counterparty's first
   word, so this takes that word rather than writing "them". */
const PK_STATE = (side) => ({
  reply: 'Needs our reply',
  signoff: 'Needs sign-off',
  them: `With ${side}`,
  agreed: 'Agreed',
});

/* what a decision on a round means, in the words the approval brief
   uses for the same thing */
const PK_DEC = {
  accept: 'Their wording accepted',
  keep: 'Our wording kept',
  counter: 'Countered with our position',
  signoff: 'Waiting on sign-off',
};

const pkEsc = (x) => String(x == null ? '' : x)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* MSA, DPA, NDA — the tag a deal team uses for a document, read the
   way the approval brief reads it */
const pkDocTag = (d) => {
  if (!d) return '';
  const src = d.source || '', t = String(d.title || '');
  return /msa/i.test(src) ? 'MSA' : /^dpa$/i.test(src) ? 'DPA' : /nda/i.test(src) ? 'NDA'
    : /order/i.test(src) ? 'Order Form'
    : (/\b(MSA|DPA|NDA|SOW)\b/i.exec(t) || [])[1] || t.replace(/\.\w+$/, '');
};

const pkPlural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/* ── one reader for everything downstream ─────────────────────
   The memo, the dashboard and both links read this and nothing else,
   which is the only way the memo and the dashboard cannot disagree
   about how many points are open.

   Preference order is the order of how much the source knows: the
   deal's issues list, then the rounds behind it, then the review of
   one document, then the tracked changes on whatever is on the
   canvas. Nothing found and `why` carries the sentence to say. */
function packSource(prompt = '') {
  const S = {
    from: null, r: null, rev: null, doc: null,
    title: '', side: '', matter: '', who: '',
    points: [], land: { outside: 0, missing: 0, fallback: 0, within: 0, other: 0 },
    decided: 0, open: 0, pending: 0, graded: false,
    waiting: [], signers: [], approvals: [], hidden: false,
    candidates: [], why: null,
  };

  /* the deal in front of you: named in the ask, else the request you
     last had open */
  const named = /\b(rq-\d+)\b/i.exec(prompt);
  if (typeof mxRequest === 'function') {
    if (named) S.r = mxRequest(named[1].toUpperCase());
    if (!S.r && typeof MX !== 'undefined' && MX.intake && MX.intake.open) S.r = mxRequest(MX.intake.open);
  }
  const open = typeof openArtifactNow !== 'undefined' ? openArtifactNow : null;
  if (open && open.kind === 'doc') S.doc = open;

  if (S.r) {
    const r = S.r;
    S.title = r.title || r.counterparty || r.id;
    S.side = String(r.counterparty || 'them').split(/\s+/)[0];
    S.who = r.submitter || r.requester || 'the requester';
    S.matter = [r.id, r.counterparty].filter(Boolean).join(' · ');
    S.rev = (typeof JV_REVIEWS !== 'undefined' && r.review) ? JV_REVIEWS[r.review] || null : null;
    if (!pkFromIssues(S, r)) { if (!pkFromRounds(S, r)) { if (S.rev) pkFromReview(S, S.rev); } }
    pkFromSign(S, r);
  } else if (S.doc) {
    S.title = S.doc.name;
    S.who = (typeof USER !== 'undefined' && USER.name) || 'the requester';
    S.matter = S.doc.name;
    S.pending = typeof docPending === 'function' ? docPending(S.doc).length : 0;
    S.from = 'doc';
  }

  for (const p of S.points) {
    S.land[p.lands || 'other']++;
    if (p.decided) S.decided++; else S.open++;
  }
  S.graded = S.points.some(p => p.lands);

  if (!S.points.length && !S.pending) {
    /* the requests whose negotiation is actually seeded, offered as
       the way out — guessing at one of them would be worse */
    if (typeof mxIntake === 'function' && typeof mxIssues === 'function') {
      S.candidates = mxIntake().filter(x => { try { return !!mxIssues(x); } catch { return false; } }).slice(0, 4);
    }
    S.why = S.r
      ? `${S.r.id} has no issues list, no round from the other side and no review behind it yet, so there is nothing to count.`
      : 'I need a deal to read. Open a request, or name one, and I will build this off its issues list.';
  }
  return S;
}

/* The deal's own issues list — one list across every document being
   negotiated, which is the only source that knows a point lives in
   both the MSA and the DPA. mxIssues() stays the only reader of
   MX_ISSUES; this flattens what it returns. */
function pkFromIssues(S, r) {
  const list = typeof mxIssues === 'function' ? mxIssues(r) : null;
  if (!list || !list.items || !list.items.length) return false;
  const docs = (typeof mxDocuments === 'function' ? mxDocuments(r) : []) || [];
  const label = PK_STATE(S.side);
  /* the last thing each side actually said: a turn that left the point
     alone carries null, so this walks back rather than taking the end */
  const last = (it, who) => {
    for (let i = it.pos.length - 1; i >= 0; i--) {
      if (it.pos[i] != null && list.turns[i] && list.turns[i].side === who) return it.pos[i];
    }
    return null;
  };
  S.points = list.items.map(it => ({
    name: it.name,
    where: it.where.map(([id, hd]) => `${pkDocTag(docs.find(d => d.id === id))} ${hd}`.trim()).join(', '),
    ours: last(it, 'ours') || '',
    theirs: last(it, 'theirs') || '',
    lands: pkLand(it.playbook),
    landText: it.playbook || '',
    owner: it.owner || '',
    decided: it.status === 'agreed',
    state: label[it.status] || it.status || '',
    note: it.note || it.how || null,
  }));
  S.from = 'issues';
  return true;
}

/* What the other side sent back, document by document. Less than the
   issues list — it knows one round rather than the whole negotiation —
   but it carries the playbook landing already graded and the decision
   legal took, which is enough for both artifacts. */
function pkFromRounds(S, r) {
  if (typeof mxRounds !== 'function') return false;
  const rounds = mxRounds(r);
  if (!rounds || !rounds.docs) return false;
  const docs = (typeof mxDocuments === 'function' ? mxDocuments(r) : []) || [];
  const out = [];
  for (const id of Object.keys(rounds.docs)) {
    const list = rounds.docs[id], rd = list && list[list.length - 1];
    if (!rd) continue;
    const d = docs.find(x => x.id === id);
    for (const p of rd.points) {
      const k = p.decision && p.decision.d;
      out.push({
        name: p.term || String(p.clause).replace(/^\d+\.\s*/, ''),
        where: `${pkDocTag(d)} ${p.clause}`.trim(),
        ours: k === 'counter' ? p.decision.text : '',
        theirs: p.brief || '',
        lands: PK_LAND.includes(p.playbook) ? p.playbook : null,
        landText: p.playbook ? PK_LAND_SHORT[p.playbook] + (p.why ? ` · ${p.why}` : '') : '',
        owner: r.attorney || '',
        decided: !!k && k !== 'signoff',
        state: PK_DEC[k] || 'Not answered yet',
        note: p.flag || null,
      });
    }
  }
  if (!out.length) return false;
  S.points = out;
  S.from = 'rounds';
  return true;
}

/* The review of one document: every clause the playbook had something
   to say about, plus the clauses it expected and did not find. The
   review's own grading is kept — this file never decides what a clause
   is worth. */
function pkFromReview(S, rev) {
  const bare = (x) => String(x || '').replace(/^\d+(\.\d+)*\.\s*/, '');
  const graded = (rev.clauses || []).filter(c => PK_FROM_REVIEW[c.status]);
  const gone = (rev.missing || []).map(c => ({
    name: bare(c.heading || c.topic || 'Clause'),
    where: 'Not in the contract',
    ours: c.why || '', theirs: 'Not in the contract',
    lands: 'missing', landText: PK_LAND_SHORT.missing,
    owner: '', decided: false,
    state: 'Needs adding',
    note: c.summary || null,
  }));
  const kept = graded.map(c => ({
    name: bare(c.heading),
    where: `Clause ${c.n}`,
    ours: '', theirs: c.changed ? 'Changed in their draft' : '',
    lands: PK_FROM_REVIEW[c.status],
    landText: PK_LAND_SHORT[PK_FROM_REVIEW[c.status]],
    owner: '', decided: false,
    state: c.changed ? 'They changed it' : 'As drafted',
    note: c.flag || null,
  }));
  if (!kept.length && !gone.length) return false;
  S.points = [...gone, ...kept];
  S.from = 'review';
  return true;
}

/* Who still has to say yes, read off the live approvals engine rather
   than restated. mxSign() re-reads the rules every call, so a role
   that joined because the deal grew is here the moment it did. */
function pkFromSign(S, r) {
  if (typeof mxSign !== 'function') return;
  let sg = null;
  try { sg = mxSign(r); } catch { sg = null; }
  if (!sg) return;
  S.waiting = typeof mxSignWaiting === 'function' ? mxSignWaiting(r) : [];
  S.signers = (sg.signers || []).filter(Boolean);
  S.order = sg.order || null;
  S.approvals = (sg.approvals || []).filter(x => !x.gone).map(x => ({
    role: x.role,
    who: x.who || (x.team ? `Any one of ${x.team}` : 'Not assigned'),
    why: x.why || '',
    now: typeof mxApNow === 'function' ? mxApNow(r, x) : { k: x.state },
  }));
  /* the tab that holds all of this is behind a switch, and a link to a
     tab that bounces back to Overview is worse than saying so */
  S.hidden = !(typeof INTAKE_FX !== 'undefined' && INTAKE_FX.approvals);
}

/* ── the bottom line ──────────────────────────────────────────
   Derived from packSource and nothing else, so the memo's opening
   paragraph and the dashboard's tiles are the same counts in two
   shapes. review.js has a summaryLines() that writes this for a
   review, but it is a closure inside the review workspace and is not
   reachable from here — see the note in the report. */
function pkBottom(S) {
  if (S.from === 'doc') {
    return [
      S.pending
        ? `${S.title} carries ${pkPlural(S.pending, 'proposed change')} still waiting on an answer.`
        : `${S.title} has no changes outstanding.`,
      'Nothing on this document is graded against a playbook, so this memo counts changes rather than risk. '
        + 'Open the request it belongs to and I will write the risk in.',
    ];
  }
  const n = S.points.length, L = S.land;
  const src = S.from === 'issues' ? 'the issues list for this deal'
    : S.from === 'rounds' ? 'the last round from ' + (S.side || 'the other side')
    : 'the review of ' + (S.rev ? S.rev.name : 'the document');
  const lines = [`${pkPlural(n, 'point')} on ${src}: ${S.decided} settled, ${S.open} still open.`];

  if (S.graded) {
    const red = L.outside + L.missing;
    const bits = [
      L.outside && `${L.outside} ${L.outside === 1 ? 'sits' : 'sit'} outside the playbook`,
      L.missing && `${pkPlural(L.missing, 'clause')} the playbook expects ${L.missing === 1 ? 'is' : 'are'} not in the contract`,
      L.fallback && `${L.fallback} ${L.fallback === 1 ? 'is' : 'are'} on a fallback we can live with`,
    ].filter(Boolean);
    lines.push(bits.length
      ? `${bits.join(', ')}. ${red ? `${red === 1 ? 'That one is' : 'Those are'} the ${red === 1 ? 'risk' : 'risks'} worth a decision.` : 'Nothing is outside our positions.'}`
      : 'Everything graded sits within the playbook.');
  } else {
    lines.push('None of these carries a playbook landing in the data behind this deal, so the memo says where each point stands and leaves the grading out.');
  }

  /* the ungraded ones are named the way the source names them rather
     than explained — on this deal they are our own opening positions,
     but that is the issues list's word for them and not an inference
     this file is entitled to make about another one */
  if (L.other) {
    const said = [...new Set(S.points.filter(p => !p.lands).map(p => p.landText).filter(Boolean))];
    lines.push(`${pkPlural(L.other, 'point')} ${L.other === 1 ? 'carries' : 'carry'} no playbook landing`
      + (said.length ? ` — ${said.map(x => `“${x}”`).join(', ')}.` : '.'));
  }

  if (S.waiting.length) {
    lines.push(`Before this goes for signature, ${pkPlural(S.waiting.length, 'approval')} ${S.waiting.length === 1 ? 'is' : 'are'} still out: `
      + S.waiting.map(x => `${x.who} (${x.what})`).join(', ') + '.');
  } else if (S.approvals.length) {
    lines.push('Every approval the deal needs is in.');
  }
  return lines;
}

/* ── the memo ─────────────────────────────────────────────────
   A `doc`, minted the way modules.js mints a draft from a template.
   Nothing is registered for it: the doc kind already has the render,
   the tracked changes, the versions and the export.

   The issues go in as a `ul` because `doc` has no table block —
   DOC_RL_TEXT and blockEl know six block types and a table cell is
   not something redlineOf can diff. Adding one is a change to
   artifacts.js, which is not this file's to make. */
function packMemo(S) {
  if (!S.points.length && !S.pending) { pkSay(S.why); return null; }
  const bare = (x) => pkEsc(x).replace(/\s+/g, ' ').trim();
  const dated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const worst = S.points.filter(p => p.lands === 'outside' || p.lands === 'missing');
  const soft = S.points.filter(p => p.lands === 'fallback');
  const ours = S.points.filter(p => p.ours);
  const decide = S.points.filter(p => !p.decided);

  const line = (p) => `<b>${bare(p.name)}</b>${p.where ? ` — ${bare(p.where)}` : ''}`
    + (p.landText ? `. ${bare(p.landText)}` : '')
    + (p.state ? `. ${bare(p.state)}` : '')
    + (p.owner ? ` · ${bare(p.owner)}` : '');

  const blocks = [
    { t: 'h1', v: bare(`${S.title} — review memo`) },
    { t: 'meta', v: `For ${bare(S.who)}` },
    { t: 'meta', v: 'Prepared by Clavia' },
    { t: 'meta', v: dated },
    { t: 'meta', v: bare(S.matter || S.title) },
    { t: 'h2', v: 'Bottom line' },
    ...pkBottom(S).map(t => ({ t: 'p', v: bare(t) })),
  ];

  if (worst.length || soft.length) {
    blocks.push({ t: 'h2', v: 'Key risks' },
      { t: 'ul', v: [...worst, ...soft].map(line) });
  }
  if (ours.length) {
    blocks.push({ t: 'h2', v: 'What we proposed' },
      { t: 'ul', v: ours.map(p => `<b>${bare(p.name)}</b> — ${bare(p.ours)}${p.theirs ? `. They want ${bare(p.theirs)}` : ''}`) });
  }
  if (decide.length) {
    blocks.push({ t: 'h2', v: 'Decisions needed' },
      { t: 'ul', v: decide.map(p => `<b>${bare(p.name)}</b> — ${bare(p.state || 'open')}${p.note ? `. ${bare(p.note)}` : ''}`) });
  }
  if (S.pending) {
    blocks.push({ t: 'h2', v: 'Changes on the document' },
      { t: 'p', v: `${pkPlural(S.pending, 'change')} on ${bare(S.title)} ${S.pending === 1 ? 'is' : 'are'} still waiting on an accept or a reject.` });
  }

  const next = [];
  if (S.waiting.length) next.push(`Collect ${pkPlural(S.waiting.length, 'approval')}: ${S.waiting.map(x => bare(x.who)).join(', ')}.`);
  for (const p of S.points.filter(p => /reply/i.test(p.state)).slice(0, 3)) next.push(`Reply on <b>${bare(p.name)}</b>.`);
  for (const p of S.points.filter(p => /sign-off/i.test(p.state)).slice(0, 3)) next.push(`Get sign-off on <b>${bare(p.name)}</b>${p.owner ? ` from ${bare(p.owner)}` : ''}.`);
  if (S.signers.length && !S.waiting.length) next.push(`Send for signature: ${S.signers.map(x => bare(x.who || 'not named')).join(', ')}.`);
  if (!next.length) next.push('Nothing is waiting on us. The next move is theirs.');
  blocks.push({ t: 'h2', v: 'Next steps' }, { t: 'ul', v: next });

  return pkDoc(`memo-${S.r ? S.r.id : (S.doc ? S.doc.id : 'deal')}`,
    `${S.title} — review memo`, S.matter || 'Review memo', blocks);
}

/* Asked for a second time the memo is rebuilt from the same fixtures;
   if the deal has moved since, the difference becomes a version rather
   than a silent overwrite. The same bargain aqiArtifact strikes. */
function pkDoc(id, name, sub, blocks) {
  const prev = ARTIFACTS[id];
  if (prev && prev.kind === 'doc') {
    const cur = bodyOf(prev, 'blocks');
    const moved = JSON.stringify(cur) !== JSON.stringify(blocks);
    if (moved) bumpVersion(prev, { name: 'Rewritten from the deal' }, { blocks });
    if (prev.name === prev.autoName) prev.name = name;
    prev.autoName = name; prev.sub = sub;
    openArtifact(prev);
    if (moved) pkSay('The deal has moved on — this is a new version of the memo');
    return prev;
  }
  const a = defineArtifact({
    id, kind: 'doc', name, ext: 'docx', sub, autoName: name,
    versions: [{ name: 'First memo', when: 'Just now', by: 'Assistant', blocks }],
  });
  /* made in this conversation, so its history starts here */
  startVersions(a);
  openArtifact(a);
  return a;
}

/* ── the risk dashboard ───────────────────────────────────────
   One hand-drawn SVG, built with the same sv() the pipeline dashboard
   uses. Four tiles, the bar group by playbook landing, the settled /
   open donut, and the points themselves down the bottom.

   Everything is computed from packSource, so no tile can disagree
   with the bar beside it — the rule app-pipeline sets and this keeps.
   Clicking a bar filters the point list, which is the one thing a
   picture of a dashboard cannot do. */
const PK_W = 900;

function pkTile(x, y, n, label, hue) {
  return sv('g', { class: 'pk-tile' },
    sv('rect', { x, y, width: 206, height: 92, rx: 9, class: 'pk-plate' }),
    hue ? sv('rect', { x, y, width: 4, height: 92, rx: 2, fill: hue }) : null,
    sv('text', { x: x + 18, y: y + 46, class: 'pk-n' }, txt(n)),
    sv('text', { x: x + 18, y: y + 69, class: 'pk-lab' }, txt(label)));
}

function pkBars(S, pick, on) {
  const base = 300, top = 176, left = 34, right = 502;
  /* the three gradings every deal has are always drawn, zero or not —
     a bar group that loses a column when the risk goes away reads as a
     different chart. Missing and ungraded appear only when they exist. */
  const keys = ['outside', 'fallback', 'within'];
  if (S.land.missing) keys.splice(1, 0, 'missing');
  if (S.land.other) keys.push('other');
  /* the lane is divided by however many bars there are, so five fit the
     same panel four do rather than running off the end of it */
  const step = (right - left) / keys.length, bw = Math.min(62, step - 22);
  const max = Math.max(1, ...keys.map(k => S.land[k]));
  const g = sv('g', { 'data-filter': String(!!on) });
  g.append(
    sv('rect', { x: 16, y: 128, width: 504, height: 200, rx: 9, class: 'pk-plate' }),
    sv('text', { x: left, y: 154, class: 'pk-cap' }, txt('Where the points landed')),
    sv('line', { x1: left, x2: right, y1: base, y2: base, class: 'pk-rule' }));
  keys.forEach((k, i) => {
    const v = S.land[k], hh = Math.max(v ? 3 : 0, Math.round((v / max) * (base - top)));
    const x = left + i * step + (step - bw) / 2;
    const bar = sv('g', { class: 'pk-bar', 'data-on': String(on === k), role: 'button', tabindex: '0',
      'aria-label': `${PK_LAND_LABEL[k]}: ${v}` },
      sv('rect', { x, y: base - hh, width: bw, height: hh, rx: 4, fill: pkHue(k) }),
      sv('text', { x: x + bw / 2, y: base - hh - 9, 'text-anchor': 'middle', class: 'pk-bar-n' }, txt(v)),
      sv('text', { x: x + bw / 2, y: base + 18, 'text-anchor': 'middle', class: 'pk-bar-l' }, txt(PK_LAND_SHORT[k])),
      sv('title', {}, txt(`${PK_LAND_LABEL[k]} — ${pkPlural(v, 'point')}`)));
    bar.addEventListener('click', () => pick(on === k ? null : k));
    bar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(on === k ? null : k); }
    });
    g.append(bar);
  });
  return g;
}

function pkDonut(S) {
  const cx = 710, cy = 236, r = 58, w = 20, c = 2 * Math.PI * r;
  const n = Math.max(1, S.decided + S.open);
  const done = (S.decided / n) * c;
  return sv('g', {},
    sv('rect', { x: 536, y: 128, width: 348, height: 200, rx: 9, class: 'pk-plate' }),
    sv('text', { x: 554, y: 154, class: 'pk-cap' }, txt('Settled against open')),
    sv('circle', { cx, cy, r, fill: 'none', 'stroke-width': w, class: 'pk-ring' }),
    sv('circle', { cx, cy, r, fill: 'none', 'stroke-width': w, stroke: pkHue('within'),
                   'stroke-dasharray': `${done} ${c}`, transform: `rotate(-90 ${cx} ${cy})`,
                   'stroke-linecap': done && done < c ? 'butt' : 'round' }),
    sv('text', { x: cx, y: cy + 2, 'text-anchor': 'middle', class: 'pk-n' }, txt(S.decided)),
    sv('text', { x: cx, y: cy + 22, 'text-anchor': 'middle', class: 'pk-lab' }, txt('settled')),
    sv('text', { x: 800, y: 212, class: 'pk-lab' }, txt(`${S.open} open`)),
    sv('text', { x: 800, y: 232, class: 'pk-lab' }, txt(`${S.decided + S.open} in all`)),
    sv('title', {}, txt(`${S.decided} settled, ${S.open} open`)));
}

function pkRows(S, on) {
  const list = on ? S.points.filter(p => (p.lands || 'other') === on) : S.points;
  const g = sv('g', {});
  g.append(
    sv('text', { x: 34, y: 362, class: 'pk-cap' },
      txt(on ? `${PK_LAND_LABEL[on]} — ${pkPlural(list.length, 'point')}` : `Every point — ${list.length}`)),
    on ? sv('text', { x: PK_W - 34, y: 362, 'text-anchor': 'end', class: 'pk-lab' }, txt('click the bar again to clear')) : null);
  list.forEach((p, i) => {
    const y = 394 + i * 28;
    const k = p.lands || 'other';
    g.append(sv('g', { class: 'pk-row' },
      sv('line', { x1: 16, x2: PK_W - 16, y1: y + 9, y2: y + 9, class: 'pk-rule' }),
      sv('rect', { x: 16, y: y - 15, width: 4, height: 18, rx: 2, fill: pkHue(k) }),
      sv('text', { x: 34, y, class: 'pk-row-t' }, txt(p.name)),
      sv('text', { x: 330, y, class: 'pk-row-s' }, txt(p.where || '')),
      sv('text', { x: 600, y, class: 'pk-row-s' }, txt(PK_LAND_SHORT[k])),
      sv('text', { x: PK_W - 34, y, 'text-anchor': 'end', class: 'pk-row-s' }, txt(p.state || '')),
      sv('title', {}, txt([p.name, p.landText, p.state, p.owner].filter(Boolean).join(' · ')))));
  });
  if (!list.length) g.append(sv('text', { x: 34, y: 400, class: 'pk-lab' }, txt('Nothing in this group.')));
  return g;
}

const pkHue = (k) => k === 'outside' ? 'var(--pack-out, #C8483A)'
  : k === 'missing' ? 'var(--pack-miss, #A5584C)'
  : k === 'fallback' ? 'var(--pack-fb, #C98A1B)'
  : k === 'within' ? 'var(--pack-in, #2E7D4F)'
  : 'var(--pack-none, #9A968E)';

/* the dashboard draws itself from the source it was built on, so a
   version is the source as it stood rather than a copy of the picture */
function pkDashBody(a) {
  const store = (state.artPacks ||= {});
  const seat = (store[a.id] ||= { on: null });
  const host = h('div', { class: 'pk-dash' });
  const S = a.src;
  const paint = () => {
    const h0 = 394 + Math.max(1, S.points.length) * 28 + 24;
    const svg = sv('svg', { viewBox: `0 0 ${PK_W} ${h0}`, class: 'pk-svg', role: 'img',
      'aria-label': `${S.title}: ${S.points.length} points, ${S.open} open` });
    const tiles = pkTiles(S);
    tiles.forEach((t, i) => svg.append(pkTile(16 + i * 220, 16, t[0], t[1], t[2])));
    svg.append(pkBars(S, (k) => { seat.on = k; save(); paint(); }, seat.on),
      pkDonut(S), pkRows(S, seat.on));
    host.replaceChildren(svg);
  };
  paint();
  return host;
}

/* four tiles, and only four: the ones a deal lead asks for in this
   order — how much is open, how much is red, how much is on a
   fallback, and who is holding it up */
function pkTiles(S) {
  const L = S.land;
  return [
    [S.open, `open of ${S.points.length} ${S.points.length === 1 ? 'point' : 'points'}`, null],
    [L.outside + L.missing, 'outside the playbook', pkHue('outside')],
    [L.fallback, 'on our fallback', pkHue('fallback')],
    S.waiting.length
      ? [S.waiting.length, S.waiting.length === 1 ? 'approval still out' : 'approvals still out', pkHue('fallback')]
      : [S.decided, 'already settled', pkHue('within')],
  ];
}

/* ── the kind ─────────────────────────────────────────────────
   RENDER is keyed on kind and app-pipeline already owns `app`, so the
   second dashboard body needs a key of its own. It draws itself off
   the artifact, the way an agent does. */
RENDER.riskdash = (a) => a.make();

/* a plate with three bars graded the way the dashboard grades them,
   so the mark says risk rather than "chart" */
KIND_ICON.riskdash =
    '<rect x="2" y="3.5" width="20" height="17" rx="2.6" fill="#2A3340"/>'
  + '<rect x="2" y="3.5" width="20" height="3.6" rx="2.6" fill="#1C232C"/>'
  + '<g stroke-linecap="round" stroke-width="2.2" fill="none">'
  + '<path d="M7 17.2v-6.4" stroke="#C8483A"/>'
  + '<path d="M12 17.2v-4.2" stroke="#C98A1B"/>'
  + '<path d="M17 17.2v-2.2" stroke="#2E7D4F"/></g>';
KIND_LABEL.riskdash = 'Risk dashboard';
KIND_SHORT.riskdash = 'RISK';
NOUN.riskdash = 'risk dashboard';

/* the same two rows the interactive page offers, because it is the
   same kind of thing: a page, which a browser can save and print */
EXPORT.riskdash = { primary: 'html', download: ['html', 'pdf'] };

/* what the trace says it read when a step came from here */
SOURCES.pack = { label: 'the review', verb: 'Read',
  icon: '<rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M7 15.5v-4M12 15.5v-6.5M17 15.5v-2.5"/>' };

function packDash(S) {
  if (!S.points.length) { pkSay(S.why || 'There is nothing graded to chart yet.'); return null; }
  const id = `riskdash-${S.r ? S.r.id : (S.doc ? S.doc.id : 'deal')}`;
  const name = `${S.title} — risk`;
  const sub = `${pkPlural(S.points.length, 'point')} · ${S.open} open`;
  const prev = ARTIFACTS[id];
  if (prev && prev.kind === 'riskdash') {
    const moved = JSON.stringify(prev.src.land) !== JSON.stringify(S.land)
      || prev.src.open !== S.open || prev.src.points.length !== S.points.length;
    prev.src = S;
    if (moved) bumpVersion(prev, { name: 'Recounted from the deal' }, { counts: S.land });
    if (prev.name === prev.autoName) prev.name = name;
    prev.autoName = name; prev.sub = sub;
    openArtifact(prev);
    if (moved) pkSay('The counts have moved — this is a new version');
    return prev;
  }
  const a = defineArtifact({
    id, kind: 'riskdash', name, ext: 'html', sub, src: S, autoName: name,
    versions: [{ name: 'First count', when: 'Just now', by: 'Assistant', counts: S.land }],
    make() { return pkDashBody(this); },
  });
  startVersions(a);
  openArtifact(a);
  return a;
}

/* ── the two that already exist ───────────────────────────────
   Not drawn again. What comes back is the one line the live engine
   already knows, and the way into it. */
function packApprovals(S) {
  if (!S.r) return null;
  if (!S.approvals.length) {
    const pipe = typeof mxPipe === 'function' ? mxPipe(S.r) : null;
    return { text: `${S.r.id} needs no approvals — it is ${pipe === 'advice' ? 'a question rather than a contract' : 'past them'}.` };
  }
  const stale = S.approvals.filter(x => x.now.k === 'stale');
  const lines = [`**Approvals.** ${S.approvals.length === 1 ? 'One role has' : `${S.approvals.length} roles have`} to say yes on ${S.r.id}, read off the deal as it stands:`];
  /* the rule each role is here under is the engine's own sentence, so it
     is quoted rather than paraphrased — and only punctuated */
  const stop = (t) => /[.!?]$/.test(String(t).trim()) ? t : t + '.';
  for (const x of S.approvals) {
    const k = x.now.k;
    const where = k === 'approved' ? 'Approved'
      : k === 'stale' ? `Approved, but a later version changed ${x.now.changed.join(', ')} — asked again`
      : k === 'pending' ? 'Asked, waiting' : 'Not asked yet';
    lines.push(`- **${x.role}** — ${x.who}. ${where}. ${x.why ? stop(x.why) : ''}`.trim());
  }
  if (stale.length) lines.push(`${stale.length === 1 ? 'One approval went' : `${stale.length} approvals went`} stale on its own, because the terms that role looks at moved after it was given.`);
  lines.push(S.hidden
    ? 'The workflow itself is live on the request, but its tab is switched off in this build — see INTAKE_FX.approvals.'
    : `It is all on ${S.r.id}, where each row can be approved, chased or undone.`);
  return { text: lines.join('\n'), suggest: S.hidden ? null : [`Open the approvals on ${S.r.id}`] };
}

function packSigning(S) {
  if (!S.r || !S.signers.length) return null;
  const lines = [`**Signing.** ${S.signers.map(x => `${x.who || 'Not named'} (${x.what})`).join(', ')}`
    + `${S.order ? `, ${S.order}` : ''}.`];
  lines.push(S.waiting.length
    ? `It cannot go out yet: ${S.waiting.map(x => `${x.who} — ${x.what}`).join('; ')}. The move into Signing asks about ${S.waiting.length === 1 ? 'it' : 'them'} first.`
    : 'Nothing is blocking it; the move into Signing will go straight through.');
  return { text: lines.join('\n') };
}

/* ── the chat seam ────────────────────────────────────────────
   Same contract as skills.js skillAnswer: claim the prompt and return
   true, or return false and leave answer() exactly as it was. The
   match is deliberately narrow — BUILDS.doc already answers "write me
   a memo" and BUILDS.app already answers "build me a dashboard", and
   stealing those would be a regression. */
const PK_MEMO = /\b(review|deal|risk|negotiation|issues|redline)\s+memo\b|\bmemo (on|for|about) (the |this )?(review|deal|negotiation|redline|issues)\b|\bsummary memo\b/i;
const PK_DASH = /\brisk dashboard\b|\bdashboard of (the )?(risk|risks|issues|deal)\b|\brisk (view|board)\b/i;
const PK_PACK = /\b(deal |contract )?review pack\b|\bdeal pack\b/i;
const PK_GOTO = /^open (the )?(approvals|signatures|signing)\b/i;

/* No files parameter: a pack is built from the deal Clavia already holds,
   so an attachment on the ask is not something this reads. */
function packAnswer(prompt) {
  const p = String(prompt || '').trim();
  if (!p || typeof thread === 'undefined' || !thread) return false;

  /* the chip the approvals line offers, answered here so no routing
     has to be added anywhere else */
  if (PK_GOTO.test(p)) {
    const S = packSource(p);
    if (!S.r) { pkSay('I do not know which request you mean.'); return true; }
    if (typeof MX !== 'undefined' && MX.intake) MX.intake.tab = 'sign';
    if (S.hidden) pkSay('The approvals tab is switched off in this build');
    mxOpen('intake', S.r.id);
    return true;
  }

  const pack = PK_PACK.test(p), memo = PK_MEMO.test(p), dash = PK_DASH.test(p);
  if (!pack && !memo && !dash) return false;

  const S = packSource(p);
  if (S.why) { pkTurn([pkStep(S)], (m) => { m.text = S.why; m.suggest = pkPicks(S); }); return true; }

  if (pack) pkPack(S);
  else if (memo) pkOne(S, 'memo');
  else pkOne(S, 'dash');
  return true;
}

/* the one step every run shares: what it read, and how much of it */
function pkStep(S) {
  const what = S.from === 'issues' ? `the issues list on ${S.r.id}`
    : S.from === 'rounds' ? `the last round on ${S.r.id}`
    : S.from === 'review' ? `the review of ${S.rev ? S.rev.name : 'the document'}`
    : S.from === 'doc' ? S.title
    : 'the deal';
  const count = S.points.length ? pkPlural(S.points.length, 'point')
    : S.pending ? pkPlural(S.pending, 'change') : 'nothing to read';
  return { source: 'pack', query: what, count };
}

/* One turn: the trace, then whatever the run decided to say. Paced the
   way botTurn paces its own, so a pack does not arrive faster than a
   single answer does. */
function pkTurn(steps, run, after = 0) {
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  let t = after;
  setTimeout(() => { thread.messages.push(m); paintThread(); }, t);
  t += 320;
  steps.forEach((st, i) => {
    setTimeout(() => { m.steps.push({ ...st, rows: [], running: true }); renderBot(m); }, t);
    t += 700;
    setTimeout(() => { Object.assign(m.steps[i], st, { running: false }); renderBot(m); }, t);
    t += 180;
  });
  t += 300;
  setTimeout(() => {
    m.thinking = false;
    if (m.traceOpen == null) m.traceOpen = false;
    run(m);
    renderBot(m);
  }, t);
  return t + 420;
}

function pkOne(S, which) {
  const steps = [pkStep(S), { source: 'think', query: which === 'memo' ? 'What a reader needs first' : 'How the risk divides' }];
  pkTurn(steps, (m) => {
    const a = which === 'memo' ? packMemo(S) : packDash(S);
    if (!a) { m.text = S.why || 'There was nothing to build this from.'; m.suggest = pkPicks(S); return; }
    const said = pkBottom(S);
    m.text = which === 'memo'
      ? said.join('\n\n') + '\n\nThe memo is beside you: bottom line, key risks, what we proposed, decisions needed, next steps. Tell me what to change and it becomes a new version.'
      : 'Four tiles, the points by where they landed against the playbook, settled against open, and every point underneath. Click a bar to see only that group.\n\n'
        + (said[1] || said[0]);
    m.artifact = a.id;
    m.suggest = pkMore(S, which);
  });
}

/* ── the pack ─────────────────────────────────────────────────
   One ask, several artifacts. A bot message carries exactly one
   artifact (app.js renderBot), so this is one turn per artifact in
   the order a deal lead reads them — the memo, then the risk, then
   what is holding the signature up — rather than one turn with four
   cards, which the chat has no shape for. */
function pkPack(S) {
  let t = pkTurn([pkStep(S), { source: 'think', query: 'What a reader needs first' }], (m) => {
    const a = packMemo(S);
    m.text = `A deal review pack for ${S.title}. First the memo.\n\n` + pkBottom(S).join('\n\n');
    if (a) m.artifact = a.id;
  });

  t = pkTurn([{ source: 'pack', query: 'the same counts, as a picture', count: `${S.points.length} graded` }], (m) => {
    const a = packDash(S);
    m.text = 'Then the risk, off the same counts — so the dashboard and the memo cannot say different numbers.';
    if (a) m.artifact = a.id;
  }, t);

  const ap = packApprovals(S), sg = packSigning(S);
  if (ap || sg) {
    t = pkTurn([{ source: 'pack', query: 'who still has to say yes', count: S.waiting.length ? `${S.waiting.length} still out` : 'all in' }], (m) => {
      m.text = [ap && ap.text, sg && sg.text].filter(Boolean).join('\n\n')
        + '\n\nI have not redrawn either of those. They are live on the request, with state, and a picture of them would go stale the next time the deal moved.';
      m.suggest = (ap && ap.suggest) || null;
    }, t);
  }
  return t;
}

/* what to offer next: the follow-ups that are actually built */
function pkMore(S, which) {
  const out = [];
  if (which === 'memo') out.push('Build the risk dashboard');
  else out.push('Write the review memo');
  if (S.r && S.approvals.length && !S.hidden) out.push(`Open the approvals on ${S.r.id}`);
  if (S.r) out.push(`Build the deal review pack for ${S.r.id}`);
  return out.slice(0, 3);
}

/* the deals whose negotiation is seeded, when the ask arrived with no
   deal in front of it */
function pkPicks(S) {
  if (!S.candidates.length) return null;
  return S.candidates.map(r => `Build the deal review pack for ${r.id}`);
}

const pkSay = (msg) => {
  if (!msg) return;
  if (typeof pbToast === 'function') pbToast(msg);
  else if (typeof toast === 'function') toast(msg);
};

/* ── its own stylesheet ──────────────────────────────────────
   Appended once at load, because the shared sheets are not this
   feature's to edit. The three grades sit behind their own variables
   with the redline's colours as fallbacks, so a theme that defines
   them moves the dashboard with everything else. */
(function pkStyle() {
  if (document.getElementById('pk-css')) return;
  document.head.insertAdjacentHTML('beforeend', '<style id="pk-css">'
    + `
.pk-dash, .artifact-shell > .pk-dash {
  --pack-out: #C8483A; --pack-miss: #A5584C; --pack-fb: #C98A1B;
  --pack-in: #2E7D4F; --pack-none: #9A968E;
  display: block; min-height: 0; overflow: auto;
  padding: 18px; background: var(--surface, #fff);
}
.pk-svg { display: block; width: 100%; height: auto; min-width: 560px; }

/* the plate a panel sits on: the page's own surface, lifted by a line
   rather than a shadow, which is how the rest of Clavia separates things */
.pk-plate { fill: var(--surface-soft, #FAF9F7); stroke: var(--line, #E8E4DF); stroke-width: 1; }
.pk-rule { stroke: var(--line-soft, #F0EDE7); stroke-width: 1; }
.pk-ring { stroke: var(--line-soft, #F0EDE7); }

.pk-n { font: 600 27px/1 Geist, system-ui, sans-serif; fill: var(--text, #1A1A18); }
.pk-lab { font: 400 11.8px/1 Geist, system-ui, sans-serif; fill: var(--text-soft, #6B6862); }
.pk-cap {
  font: 560 11.4px/1 Geist, system-ui, sans-serif; letter-spacing: .06em;
  text-transform: uppercase; fill: var(--text-soft, #6B6862);
}
.pk-bar-n { font: 560 13px/1 Geist, system-ui, sans-serif; fill: var(--text, #1A1A18); }
.pk-bar-l { font: 400 11.6px/1 Geist, system-ui, sans-serif; fill: var(--text-soft, #6B6862); }
.pk-row-t { font: 500 12.6px/1 Geist, system-ui, sans-serif; fill: var(--text, #1A1A18); }
.pk-row-s { font: 400 11.8px/1 Geist, system-ui, sans-serif; fill: var(--text-soft, #6B6862); }

/* a bar is a filter, so it answers the pointer — and once one of them is
   holding the list, the others step back rather than all four looking
   equally selected */
.pk-bar { cursor: pointer; }
.pk-bar rect { transition: opacity .12s ease; }
.pk-bar:hover rect { opacity: .82; }
[data-filter="true"] .pk-bar[data-on="false"] rect { opacity: .34; }
.pk-bar:focus-visible { outline: none; }
.pk-bar:focus-visible rect { stroke: var(--text, #1A1A18); stroke-width: 1.5; }
.pk-row text { pointer-events: none; }
`
    + '</style>');
})();
