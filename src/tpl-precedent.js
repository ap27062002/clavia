/* ==================================================================
   A template from a real precedent.

   The fastest way to get house paper is not to describe it — it is to
   take the last agreement you actually signed and take the deal out of
   it. Templates already offers that ("Upload one of your own agreements,
   and its terms become the blanks") and until now handed back a copy of
   the nearest seeded template. This is the thing itself.

   Two and only two reasons a word moves, and the document says which:

     BLANK   — a deal-specific value becomes a named blank. The value it
               was stays as the field's example, so the lawyer can see
               what it was filled with the one time it was real.
     WORDING — the clause was signed at fallback, or outside the
               playbook altogether. A concession made to one
               counterparty must not become the paper you open with, so
               the template takes the playbook's own preferred wording
               instead of what was signed.

   And a third list that is not a change to anything: ADDED, the clauses
   the playbook expects and this precedent never had.

   Nothing here is drafted. Every word on the page is already in the
   fixtures — the signed clause from JV_REVIEWS, the preferred wording
   from the same review's playbook rules, the missing sections from its
   own missing[]. What this file writes is the mapping between them, and
   the one judgement in it is which clause a rule is about (see tplPrecTo).

   Accepting hands over to Templates: an ordinary template, publishable
   and fillable, whose first version is named after the agreement it came
   out of. Rejecting a change keeps the signed wording, and a rejected
   blank stays a literal — which is what you want for a house term.

   Loaded after review.js (redlineOf) and before app.js; runs at call time.
================================================================== */

/* ── which agreements are offerable ───────────────────────────
   The four JV_REVIEWS documents with full clause text and a playbook
   behind them. Where it came from is not restated here: `party` is the
   key MX_CONTRACT_OF uses, and the request, the vault file and its read
   facts are looked up through that. */
const TPL_PREC = [
  { id: 'birch-nda', party: 'Birch Labs' },
  { id: 'kestrel', party: 'Kestrel Freight' },
  { id: 'harbor-dpa', party: 'Harbor Retail plc' },
  { id: 'acme-msa', party: 'Acme Corp' },
];

/* the blanks, per precedent: the literal string as it stands in the
   wording the template ends up with, what replaces it, and the field it
   becomes. The hint is the value it was — a field's example should be
   the one thing we know was really filled in there.

   A literal and not a pattern. "twelve (12) months" means a term in one
   clause and a look-back window in another, and a regex that cannot tell
   them apart would blank the wrong one; so the string is long enough to
   be unambiguous and is replaced wherever it occurs. */
const pcFld = (key, label, hint) => ({ key, label, hint });
const TPL_PREC_BLANKS = {
  'birch-nda': [
    { find: 'a potential business relationship between the parties',
      put: '{{purpose}}', f: pcFld('purpose', 'Purpose', 'a potential business relationship between the parties') },
    { find: 'last for three (3) years after each disclosure',
      put: 'last for {{term_years}} after each disclosure', f: pcFld('term_years', 'Confidentiality period', 'three (3) years') },
    { find: 'the laws of the State of Delaware',
      put: 'the laws of {{governing_law}}', f: pcFld('governing_law', 'Governing law', 'the State of Delaware') },
  ],
  kestrel: [
    { find: 'at Buyer’s San Francisco office',
      put: 'at {{site}}', f: pcFld('site', 'Site', 'Buyer’s San Francisco office') },
    { find: 'within sixty (60) days of receiving it',
      put: 'within {{payment_days}} of receiving it', f: pcFld('payment_days', 'Payment days', 'sixty (60) days') },
    { find: 'the lower of three percent (3%) or',
      put: 'the lower of {{uplift_cap}} or', f: pcFld('uplift_cap', 'Cap on renewal increase', 'three percent (3%)') },
    { find: 'a term of twelve (12) months',
      put: 'a term of {{term}}', f: pcFld('term', 'Term', 'twelve (12) months') },
    { find: 'not exceed two times (2x) the fees',
      put: 'not exceed {{cap_multiple}} the fees', f: pcFld('cap_multiple', 'Liability cap', 'two times (2x)') },
    { find: 'liability insurance of at least $2,000,000 per occurrence',
      put: 'liability insurance of at least {{gl_cover}} per occurrence', f: pcFld('gl_cover', 'General liability cover', '$2,000,000') },
    { find: 'cyber liability insurance of at least $5,000,000',
      put: 'cyber liability insurance of at least {{cyber_cover}}', f: pcFld('cyber_cover', 'Cyber liability cover', '$5,000,000') },
    { find: 'the laws of the State of Delaware',
      put: 'the laws of {{governing_law}}', f: pcFld('governing_law', 'Governing law', 'the State of Delaware') },
  ],
  'harbor-dpa': [
    { find: 'subprocessors listed at lumen.cloud/subprocessors',
      put: 'subprocessors listed at {{subprocessor_list}}', f: pcFld('subprocessor_list', 'Subprocessor list', 'lumen.cloud/subprocessors') },
    { find: 'most recent SOC 2 Type II report',
      put: 'most recent {{audit_report}}', f: pcFld('audit_report', 'Audit report', 'SOC 2 Type II report') },
    { find: 'transferred outside the EEA or the UK',
      put: 'transferred outside {{transfer_region}}', f: pcFld('transfer_region', 'Transfers out of', 'the EEA or the UK') },
    { find: 'Within thirty (30) days after the Services end',
      put: 'Within {{deletion_days}} after the Services end', f: pcFld('deletion_days', 'Deletion window', 'thirty (30) days') },
  ],
  'acme-msa': [
    { find: 'means Provider’s hosted analytics platform described in the Order Form',
      put: 'means {{services}}', f: pcFld('services', 'The Services', 'Provider’s hosted analytics platform described in the Order Form') },
    { find: 'payable within thirty (30) days of the invoice date',
      put: 'payable within {{payment_days}} of the invoice date', f: pcFld('payment_days', 'Payment days', 'thirty (30) days') },
    { find: 'initial Subscription Term is twelve (12) months',
      put: 'initial Subscription Term is {{initial_term}}', f: pcFld('initial_term', 'Initial term', 'twelve (12) months') },
    { find: 'at least thirty (30) days before the end',
      put: 'at least {{nonrenewal_notice}} before the end', f: pcFld('nonrenewal_notice', 'Notice of non-renewal', 'thirty (30) days') },
    { find: 'cure the breach within thirty (30) days of written notice',
      put: 'cure the breach within {{cure_days}} of written notice', f: pcFld('cure_days', 'Cure period', 'thirty (30) days') },
    { find: 'most recent SOC 2 Type II report',
      put: 'most recent {{audit_report}}', f: pcFld('audit_report', 'Audit report', 'SOC 2 Type II report') },
    { find: 'available 99.5% of the time each month',
      put: 'available {{uptime}} of the time each month', f: pcFld('uptime', 'Uptime commitment', '99.5%') },
    { find: 'up to ten percent (10%) of the monthly fees',
      put: 'up to {{credit_cap}} of the monthly fees', f: pcFld('credit_cap', 'Service credit cap', 'ten percent (10%)') },
    { find: 'the twelve (12) months preceding the claim',
      put: 'the {{cap_months}} preceding the claim', f: pcFld('cap_months', 'Liability cap', 'twelve (12) months') },
    { find: 'the laws of the State of Delaware',
      put: 'the laws of {{governing_law}}', f: pcFld('governing_law', 'Governing law', 'the State of Delaware') },
    { find: 'courts located in Wilmington, Delaware',
      put: 'courts located in {{venue}}', f: pcFld('venue', 'Venue', 'Wilmington, Delaware') },
  ],
};

/* ── reading the precedent ────────────────────────────────────── */
const pcReview = (id) => (typeof JV_REVIEWS === 'undefined' ? null : JV_REVIEWS[id] || null);
/* the agreement's own name, without the note about whose paper it is —
   that belongs in the provenance line, not in a template's title */
const pcName = (id) => (pcReview(id)?.name || id).replace(/\s*\((their paper|customer redline|signed)\)\s*$/i, '');
/* a clause heading without its number: templatePage numbers sections off
   the page, so a number carried over would be numbered again */
const pcHead = (s) => String(s || '').replace(/^\s*\d+(\.\d+)*\.?\s*/, '').trim();
/* The clauses are typeset and the playbook's wording is not, so "party's"
   in a rule and "party’s" in the agreement are the same word to a reader
   and two words to a diff. Settling the apostrophe before the diff keeps
   typography out of a list of tracked changes a lawyer has to answer. */
const pcTypo = (s) => String(s || '').replace(/([A-Za-z])'/g, '$1’');

/* where this agreement sits in the rest of the app: the request it came
   in on, the vault file it is filed as, and what was read out of that
   file. All of it looked up, none of it restated. */
function tplPrecSource(p) {
  const rid = typeof MX_CONTRACT_OF !== 'undefined' ? MX_CONTRACT_OF[p.party] : null;
  const req = rid && typeof mxRequest === 'function' ? mxRequest(rid) : null;
  const ref = req?.files?.[0] || null;
  const vault = ref && typeof mxVault === 'function' ? mxVault(ref.vault) : null;
  const file = vault?.files.find(f => f.name === ref.name) || null;
  return { rid, req, vault, file, facts: file?.facts || null };
}

/* ── the one judgement in this file ───────────────────────────
   Which wording the template should carry for a clause.

   The preferred wording is the review's own, per clause where it has
   one and from the playbook rule for the topic otherwise. Neither is
   safe on its own, because a topic can cover two clauses. Acme's "Most
   Favored Customer" is topic "Fees and payment" — the same topic as the
   fees clause, and the review hangs the fees wording off it — so taking
   that wording would replace a price-match promise with an invoicing
   term and call it the playbook's position.

   So the clause has to be the one the topic is about: its heading is
   the topic, or no other clause shares the topic. Where neither holds
   the signed wording stands, which is a worse template and a true one. */
function tplPrecTo(a, c) {
  const headed = pcHead(c.heading).toLowerCase() === String(c.topic || '').toLowerCase();
  const only = a.clauses.filter(x => x.topic === c.topic).length === 1;
  if (!headed && !only) return null;
  const own = (c.suggestions || []).find(s => s.key === 'preferred');
  if (own?.text) return { text: pcTypo(own.text), topic: c.topic };
  const rule = (a.rules || []).find(r => r.topic === c.topic);
  return rule?.preferred_language ? { text: pcTypo(rule.preferred_language), topic: c.topic } : null;
}

/* ── genericising ─────────────────────────────────────────────
   Per clause: what it says as signed, what the template should say, and
   a change for each reason a word moved. Then the sections the playbook
   expected and this agreement never had, wholly inserted. */
let pcSeq = 0;
function tplPrecGeneric(p) {
  const a = pcReview(p.id);
  if (!a) return null;
  const blanks = TPL_PREC_BLANKS[p.id] || [];
  const fields = [];
  const secs = [];

  for (const c of a.clauses) {
    const swap = ['unacceptable', 'fallback'].includes(c.status) ? tplPrecTo(a, c) : null;
    let to = swap ? swap.text : c.text;
    const changes = [];
    const word = swap ? { id: 'pc' + (++pcSeq), kind: 'wording', state: null, key: null,
      why: c.status === 'fallback'
        ? `Signed at fallback on ${String(swap.topic).toLowerCase()} — the playbook’s preferred wording instead`
        : `Signed outside the playbook on ${String(swap.topic).toLowerCase()} — the playbook’s preferred wording instead` } : null;
    if (word) changes.push(word);
    for (const b of blanks) {
      if (!to.includes(b.find)) continue;
      to = to.split(b.find).join(b.put);
      /* where the example came from matters: a value sitting in wording
         the playbook supplied was never in the signed agreement, and a
         note that said it read there would be inventing provenance */
      const signed = c.text.includes(b.find);
      changes.push({ id: 'pc' + (++pcSeq), kind: 'blank', state: null, key: b.f.key, hint: b.f.hint, src: signed ? 'signed' : 'playbook',
        why: signed ? `Becomes the blank ${b.f.label} — it read “${b.f.hint}” here`
          : `Becomes the blank ${b.f.label} — “${b.f.hint}” is the playbook’s value, not what was signed` });
      if (!fields.some(f => f.key === b.f.key)) fields.push({ ...b.f });
    }
    const sec = { k: 'clause', heading: pcHead(c.heading), from: c.text, to, status: c.status, topic: c.topic, changes };
    pcTidy(sec, word);
    secs.push(sec);
  }

  /* what the playbook expects and this paper never had. It is not a
     change to a clause, so it reads as a whole insertion. */
  for (const m of a.missing || []) {
    const text = pcTypo((m.suggestions || []).find(s => s.key === 'preferred')?.text || '');
    if (!text) continue;
    secs.push({ k: 'added', heading: pcHead(m.heading), from: '', to: text, status: 'missing', topic: m.topic,
      changes: [{ id: 'pc' + (++pcSeq), kind: 'added', state: null, key: null,
        why: `The playbook expects a ${String(m.topic).toLowerCase()} clause and this agreement has none` }] });
  }

  return { prec: p, review: a, src: tplPrecSource(p), secs, fields,
    name: a.playbook?.name || pcName(p.id), from: pcName(p.id) };
}

/* ── the redline, read off one diff ───────────────────────────
   redlineOf gives the segments; which change each segment belongs to is
   read back out of them rather than tracked separately, so there is one
   diff and no second bookkeeping to fall out of step with it.

   A struck run that is the whole signed clause is the wording change —
   redlineOf collapses a rewrite to one pair, and a rewrite is exactly
   what replacing a clause is. Otherwise the inserted words name their
   own reason: they carry the blank's token, or they do not and the
   clause was reworded around them. */
function pcRuns(sec) {
  const segs = redlineOf(sec.from, sec.to);
  const word = sec.changes.find(c => c.kind === 'wording' || c.kind === 'added') || null;
  /* A blank owns a run only when the run is about the blank and nothing
     else: the inserted words are the token, give or take punctuation, or
     the struck words are exactly the value it stands in for. Where the
     token merely happens to fall inside a reworded run, the run is the
     rewording — calling that "blank" would put the wrong reason in the
     margin next to half a rewritten sentence. */
  const byKey = (del, ins) => {
    const keys = [...String(ins).matchAll(/\{\{([a-z0-9_]+)\}\}/gi)].map(m => m[1]);
    if (keys.length !== 1) return null;
    const c = sec.changes.find(x => x.kind === 'blank' && x.key === keys[0]);
    if (!c) return null;
    const rest = String(ins).replace(/\{\{[a-z0-9_]+\}\}/i, '').replace(/[\s.,;:)”"']/g, '');
    return !rest || del.trim() === c.hint || del.trim() === c.hint + '.' ? c : null;
  };
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    const [k, t] = segs[i];
    if (k === 't') { out.push({ t }); continue; }
    let del = k === 'del' ? t : '', ins = k === 'ins' ? t : '';
    if (k === 'del' && segs[i + 1]?.[0] === 'ins') ins = segs[++i][1];
    const whole = sec.from.trim() && del.trim() === sec.from.trim();
    const c = (whole && word) || byKey(del, ins) || word || sec.changes[0];
    out.push({ del, ins, c });
  }
  return out;
}

/* ── reconciling the changes with what the diff actually shows ──
   Two things fall out of letting one diff be the record. A wording swap
   whose only effect was inside words that then became blanks leaves no
   struck text at all: a change nobody can see or answer, which is worse
   than no change, so it goes. And redlineOf collapses a rewritten
   clause to one struck run and one inserted one — right, because that
   is what a rewrite is, but it means the blanks inside the new wording
   have no run of their own. Those are answered with the rewrite that
   brought them, and say so rather than sitting there unclickable. */
function pcTidy(sec, word) {
  if (word && !pcRuns(sec).some(r => r.c === word)) sec.changes.splice(sec.changes.indexOf(word), 1);
  const runs = pcRuns(sec);
  const owner = sec.changes.find(c => c.kind !== 'blank' && runs.some(r => r.c === c))
    || sec.changes.find(c => runs.some(r => r.c === c));
  for (const c of sec.changes) {
    if (c.kind !== 'blank' || runs.some(r => r.c === c)) continue;
    if (owner && owner !== c) c.with = owner;
  }
}

/* what a change is answered with: its own answer, or the answer to the
   change that carries it */
const pcState = (c) => c?.state || c?.with?.state || null;
const pcOpen = (g) => g.secs.flatMap(s => s.changes).filter(c => !c.with && !c.state);
const pcCount = (g, kind) => g.secs.flatMap(s => s.changes).filter(c => c.kind === kind).length;

/* ── the artifact ─────────────────────────────────────────────── */
const PC_ART = {};
function tplPrecArtifact(g) {
  const id = 'precedent-' + g.prec.id;
  const a = PC_ART[id] || (PC_ART[id] = { id, kind: 'precedent', ext: 'precedent',
    name: `${g.name} — genericised from ${g.from}` });
  a.g = g;
  if (typeof ARTIFACTS !== 'undefined') ARTIFACTS[id] = a;
  return a;
}

/* a blank reads as the field it is, not as the token that stands for it */
function pcSplit(g, text) {
  return String(text).split(/(\{\{[a-z0-9_]+\}\})/i).filter(Boolean).map(part => {
    const m = /^\{\{([a-z0-9_]+)\}\}$/i.exec(part);
    if (!m) return part;
    const f = g.fields.find(x => x.key === m[1]);
    const c = g.secs.flatMap(s => s.changes).find(x => x.key === m[1]);
    return h('span', { class: 'prec-blank', 'data-tip': !f?.hint ? null
      : c?.src === 'signed' ? `Read “${f.hint}” in ${g.from}` : `“${f.hint}” from the playbook, kept as the example` },
      f?.label || m[1]);
  });
}

/* the words a section ends up with, once every change on it is answered.
   Anything still open counts as accepted, because that is what Accept
   all does and the two must not disagree. */
/* redlineOf sets a whole rewrite out on its own line, which is right on
   the page and not a line break in a template's paragraph */
function pcSettled(g, sec) {
  return pcRuns(sec).map(r => r.t != null ? r.t : (pcState(r.c) === 'out' ? r.del : r.ins))
    .join('').replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
const pcKept = (g, sec) => sec.k !== 'added' || pcState(sec.changes[0]) !== 'out';

function tplPrecRender(a) {
  const g = a.g;
  const st = a.st || (a.st = { filter: 'all' });
  const page = h('div', { class: 'prec-page' });

  const bar = h('div', { class: 'prec-bar' });
  const sheet = h('div', { class: 'prec-sheet' });

  const resolve = (c, how) => { c.state = how; paint(); };
  const resolveAll = (how) => { for (const c of pcOpen(g)) c.state = how; paint(); };

  /* one change, answered on its own. The lawyer's question on a single
     clause is never "all of them" — it is this one, and why. */
  const popover = (anchor, c) => {
    if (typeof closeMenu === 'function') closeMenu();
    document.querySelectorAll('.prec-pop').forEach(n => n.remove());
    const pop = h('div', { class: 'prec-pop', role: 'dialog', 'aria-label': 'Change' },
      h('div', { class: 'prec-pop-k' }, c.kind === 'blank' ? 'Blank' : c.kind === 'added' ? 'Added' : 'Wording'),
      h('div', { class: 'prec-pop-w' }, c.why),
      h('div', { class: 'prec-pop-a' },
        h('button', { class: 'prec-btn', type: 'button', onclick: () => { pop.remove(); resolve(c, 'out'); } }, 'Reject'),
        h('button', { class: 'prec-btn prec-btn--on', type: 'button', onclick: () => { pop.remove(); resolve(c, 'in'); } }, 'Accept')));
    document.body.append(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.top = Math.min(r.bottom + 6, innerHeight - pop.offsetHeight - 12) + 'px';
    pop.style.left = Math.max(12, Math.min(r.left, innerWidth - pop.offsetWidth - 12)) + 'px';
    pop.addEventListener('click', (e) => e.stopPropagation());
    const away = (e) => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', away); } };
    setTimeout(() => document.addEventListener('click', away), 0);
  };

  const runEl = (r) => {
    if (r.t != null) return document.createTextNode(r.t);
    const c = r.c;
    if (pcState(c)) return h('span', { class: 'prec-done' }, ...pcSplit(g, pcState(c) === 'out' ? r.del : r.ins));
    /* the filter does not hide the rest of the document — it stops
       colouring it, so the clause still reads as a clause */
    const off = st.filter !== 'all' && c?.kind !== st.filter;
    const wrap = h('span', { class: 'prec-pair' + (off ? ' prec-off' : ''), 'data-pc': c?.id });
    const hit = (e) => { e.stopPropagation(); popover(wrap, c); };
    if (r.del) wrap.append(h('del', { 'data-pc': c?.id, onclick: hit }, r.del));
    if (r.ins) wrap.append(h('ins', { 'data-pc': c?.id, onclick: hit }, ...pcSplit(g, r.ins)));
    return wrap;
  };

  const noteEl = (sec) => h('aside', { class: 'prec-note' }, sec.changes.map(c => h('span', {
    class: 'prec-note-r prec-note-r--' + c.kind + (pcState(c) ? ' is-' + pcState(c) : ''),
    role: 'button', tabindex: '0',
    onclick: (e) => { const t = c.with || c; if (!t.state) popover(e.currentTarget, t); },
  },
    h('b', {}, c.kind === 'blank' ? 'blank' : c.kind === 'added' ? 'added' : 'wording'),
    h('span', {}, pcState(c) === 'in' ? 'accepted' : pcState(c) === 'out' ? 'rejected'
      : c.with ? c.why + ' — answered with the rewrite of this clause' : c.why))));

  const secEl = (sec, n) => h('section', { class: 'prec-sec prec-sec--' + sec.k + (pcKept(g, sec) ? '' : ' is-out') },
    h('div', { class: 'prec-sec-main' },
      h('h2', { class: 'prec-sec-h' }, h('span', { class: 'prec-sec-n' }, n + '.'), sec.heading),
      h('p', { class: 'prec-sec-p' }, ...pcRuns(sec).map(runEl))),
    noteEl(sec));

  const paintBar = () => {
    const open = pcOpen(g);
    const tab = (k, label) => h('button', {
      class: 'prec-tab' + (st.filter === k ? ' is-on' : ''), type: 'button',
      onclick: () => { st.filter = k; paint(); },
    }, label);
    bar.replaceChildren(
      h('div', { class: 'prec-tabs', role: 'group', 'aria-label': 'Show' },
        tab('all', 'Everything'),
        tab('blank', `Blanks · ${pcCount(g, 'blank')}`),
        tab('wording', `Wording · ${pcCount(g, 'wording')}`),
        pcCount(g, 'added') ? tab('added', `Added · ${pcCount(g, 'added')}`) : null),
      h('div', { class: 'prec-bar-a' },
        open.length
          ? [h('span', { class: 'prec-bar-n' }, `${mxPlural(open.length, 'change')} open`),
            h('button', { class: 'prec-btn', type: 'button', onclick: () => resolveAll('out') }, 'Reject All'),
            /* Accept all is the whole of it in one move: answer
               everything, then hand it to Templates. Answering them one
               at a time ends at the same place, by way of the button the
               bar grows once nothing is left open. */
            h('button', { class: 'prec-btn prec-btn--on', type: 'button',
              onclick: () => { resolveAll('in'); tplPrecMake(g); } }, 'Accept All')]
          : [h('span', { class: 'prec-bar-n' }, 'Every change answered'),
            h('button', { class: 'prec-btn prec-btn--on', type: 'button', onclick: () => tplPrecMake(g) }, 'Create the Template')]));
  };

  const paint = () => {
    paintBar();
    let n = 0;
    sheet.replaceChildren(...g.secs.map(sec => secEl(sec, ++n)));
  };

  const src = g.src;
  page.append(
    h('header', { class: 'prec-head' },
      h('div', { class: 'prec-prov' },
        h('span', { class: 'prec-prov-t' }, g.from),
        h('span', { class: 'prec-prov-s' }, [
          src.file ? `${src.file.kind} · ${src.file.size}` : null,
          src.vault ? src.vault.name : null,
          src.rid ? src.rid : null,
          `Checked against the ${String(g.review.playbook?.name || '').toLowerCase()} playbook`,
        ].filter(Boolean).join(' · '))),
      h('h1', { class: 'prec-title' }, g.name),
      h('p', { class: 'prec-lede' },
        `${mxPlural(pcCount(g, 'blank'), 'blank')} and ${mxPlural(pcCount(g, 'wording'), 'wording change')}`
        + (pcCount(g, 'added') ? `, and ${mxPlural(pcCount(g, 'added'), 'section')} the playbook expects that this agreement never had` : '')
        + '. Clause numbers are dropped, because a template numbers its own.')),
    bar, sheet);
  paint();
  return { body: page };
}

/* ── handing it over ──────────────────────────────────────────
   Once the changes are answered this stops being a review and becomes an
   ordinary template: in the list, publishable, fillable, with the
   agreement it came out of written into its first version. */
function tplPrecMake(g) {
  const body = [];
  for (const sec of g.secs) {
    if (!pcKept(g, sec)) continue;
    body.push({ h: sec.heading }, { p: pcSettled(g, sec) });
  }
  const text = body.map(b => b.h ?? b.p).join(' ');
  /* a rejected blank stayed a literal, so its field has nothing left to
     fill — the template only carries the blanks that are really in it */
  const fields = g.fields.filter(f => text.includes(`{{${f.key}}}`));
  const t = newTemplate({
    name: g.name,
    kind: g.src.file?.kind || 'Agreement',
    description: `Genericised from ${g.from}.`,
    fields, body,
  }, true, false);
  mxTplEnsureVersions(t);
  /* the template's own history is where provenance belongs: open the
     version list in a year and it still says where the paper came from */
  if (t.versions?.[0]) t.versions[0].name = `Genericised from ${g.from}`;
  save();

  const kept = g.secs.filter(s => pcKept(g, s)).length;
  const out = g.secs.flatMap(s => s.changes).filter(c => c.state === 'out').length;
  const intro = [
    { role: 'user', text: `Make a template from ${g.from}.` },
    { role: 'bot', cites: null,
      answer: `**${t.name}** is in Templates as a draft — ${mxPlural(kept, 'section')}, `
        + `${mxPlural(fields.length, 'blank')} named and ready to fill`
        + (out ? `, and ${mxPlural(out, 'change')} you rejected, where ${g.from} stands as it was signed` : '')
        + `.\n\nIts first version is named after the agreement it came from, so the history says so too. `
        + 'Read it before you publish it: tell me what to add, cut or word differently and I will change it as a new version.',
      artifact: mxTplArtId(t),
      steps: [{ source: 'precedent', query: `Genericised ${g.from}`, count: mxPlural(fields.length, 'blank') },
        { source: 'template', query: `Saved ${t.name}`, count: 'v1' }],
      suggest: mxTplSuggest(t) },
  ];
  if (thread) {
    for (const m of intro.slice(1)) say('bot', m.answer, { ...m, text: m.answer, thinking: false });
    paintThread();
    queueMicrotask(() => openArtifact(mxTplArtifact(t)));
  } else {
    mxTplEditInChat(t, intro);
  }
  pbToast(`Made ${t.name} from ${g.from}`);
  return t;
}

/* ── picking one ──────────────────────────────────────────────
   Not a file picker. The agreements we can do this to are the ones
   already in the vault with a playbook behind them, so the list is of
   those — named, with where each one came from. */
function tplPrecStart() {
  const dim = h('div', { class: 'pb-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const close = (now) => {
    document.removeEventListener('keydown', onKey);
    if (now) return dim.remove();
    dim.classList.add('is-closing');
    setTimeout(() => dim.remove(), 150);
  };
  const rows = TPL_PREC.map(p => {
    const a = pcReview(p.id);
    if (!a) return null;
    const src = tplPrecSource(p);
    return h('button', { class: 'pb-tpl prec-pick', type: 'button', onclick: () => { close(true); tplPrecTurn(p); } },
      mxTile('file', src.file ? mxExt(src.file.name) : 'doc'),
      h('span', { class: 'pb-tpl-t' },
        h('span', { class: 'pb-tpl-n' }, pcName(p.id)),
        h('span', { class: 'pb-tpl-d' }, [src.vault?.name, src.rid, a.playbook?.name].filter(Boolean).join(' · '))),
      h('span', { class: 'pb-tpl-ct' }, mxPlural(a.clauses.length, 'clause')));
  }).filter(Boolean);
  dim.append(h('div', { class: 'pb-dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose an agreement' },
    h('header', { class: 'pb-dlg-head' },
      h('h2', { class: 'pb-dlg-t' }, 'Start from an agreement you have signed'),
      h('button', { class: 'pb-icon-btn', type: 'button', 'aria-label': 'Close', 'data-tip': 'Close', onclick: () => close(),
        html: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" '
          + 'stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>' })),
    h('p', { class: 'prec-pick-s' }, 'Clavia takes the deal out of it and shows every blank and every wording change as a tracked change.'),
    h('div', { class: 'pb-tpls' }, ...rows)));
  document.body.append(dim);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => dim.querySelector('.prec-pick')?.focus());
}

/* the way on the Templates "New Template" menu. The copy and the glyph
   live here so modules.js only has to know the key. */
function tplPrecWay() {
  return { key: 'precedent', name: 'From a Signed Agreement',
    desc: 'Take one you have already signed, and see every blank and wording change as a tracked change.',
    icon: () => h('span', { html: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
      + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M6 3.5h7.5L18.5 8.5V20.5H6z"/><path d="M13.5 3.5v5h5"/>'
      + '<path d="M8.6 12.3h3.2"/><path d="M8.6 15.6h6.4" stroke-dasharray="1.7 1.5"/></svg>' }).firstChild };
}

/* ── saying it in the chat ────────────────────────────────────
   What was read, what was found, and then the document. The steps are a
   true account of the order this file works in: the agreement, the
   blanks, the clauses against the playbook, the marking up. */
function tplPrecTurn(p) {
  const g = tplPrecGeneric(p);
  if (!g) return false;
  const a = tplPrecArtifact(g);
  const src = g.src;
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  if (!thread) {
    /* asked from Templates, there is no conversation to say it in — the
       document opens on its own and the chat is not faked around it */
    openArtifact(a, { full: true });
    return true;
  }
  thread.messages.push(m); paintThread();

  const steps = [
    { source: 'precedent', query: `Read ${g.from}`,
      rows: [{ title: src.file?.name || g.review.name, meta: src.vault?.name || (src.rid ? 'from ' + src.rid : 'signed') }] },
    { source: 'think', query: 'Found the values that belong to the deal', count: mxPlural(pcCount(g, 'blank'), 'blank') },
    { source: 'playbook', query: `Read every clause against the ${String(g.review.playbook?.name || '').toLowerCase()} playbook`,
      count: `${g.review.clauses.length} clauses` },
    { source: 'edit', query: 'Marked every change as a tracked change',
      count: mxPlural(pcOpen(g).length, 'change') },
  ];
  steps.forEach((s, i) => {
    setTimeout(() => { m.steps.push({ ...s, rows: s.rows || [], running: true }); renderBot(m); }, 300 + i * 700);
    setTimeout(() => { Object.assign(m.steps[i], s, { running: false }); renderBot(m); }, 300 + i * 700 + 560);
  });

  setTimeout(() => {
    m.thinking = false;
    if (m.traceOpen == null) m.traceOpen = false;
    const miss = pcCount(g, 'added');
    m.text = `${mxPlural(pcCount(g, 'blank'), 'blank')} and ${mxPlural(pcCount(g, 'wording'), 'wording change')}`
      + (miss ? `; ${mxPlural(miss, 'section')} the playbook expects were missing` : '; nothing the playbook expects is missing')
      + `.\n\nThe blanks are the deal coming out: every one keeps the value it had in ${g.from} as its example. `
      + 'The wording changes are the other thing, and the one worth your eye — where that agreement was signed at '
      + 'fallback or outside the playbook, the template takes the playbook’s preferred wording instead, because a '
      + 'concession you made once should not be the paper you open with.\n\n'
      + 'Nothing is settled. Accept or reject each one, or answer them all at once; what you accept becomes the template.';
    m.artifact = a.id;
    m.suggest = ['Show me only the wording changes', 'Accept the blanks and leave the wording to me'];
    renderBot(m);
    queueMicrotask(() => openArtifact(a));
  }, 300 + steps.length * 700 + 500);
  return true;
}

/* ── the answer() seam ────────────────────────────────────────
   Takes the prompt only when it is really this ask, and returns false
   otherwise, the same guarded shape skillAnswer has. No model: this is
   a match on the words, and what it cannot pin to one agreement it
   hands to the picker rather than guessing. */
const PC_ASK = /\b(template|our paper|house paper|standard paper|boilerplate)\b/i;
const PC_FROM = /\b(from|out of|based on|starting (from|with)|generici[sz]e[d]?|generici[sz]ing)\b/i;
const PC_SIGNED = /\b(signed|executed|precedent|this contract|that contract|this agreement|that agreement|existing (contract|agreement)|real (contract|agreement)|last (contract|agreement)|the \w+ (nda|msa|dpa|sow)\b)/i;

/* which agreement, by the counterparty's name or the document's own */
function tplPrecMatch(q) {
  const s = q.toLowerCase();
  return TPL_PREC.find(p => {
    if (s.includes(p.party.toLowerCase())) return true;
    const first = p.party.split(/\s+/)[0].toLowerCase();
    return first.length > 3 && s.includes(first);
  }) || null;
}

function tplPrecAnswer(prompt, files = []) {
  const q = String(prompt || '').trim();
  if (!q) return false;
  if (/^show me only the wording changes$/i.test(q) || /^accept the blanks/i.test(q)) {
    const a = typeof openArtifactNow !== 'undefined' && openArtifactNow?.kind === 'precedent' ? openArtifactNow : null;
    if (!a) return false;
    if (/^show/i.test(q)) { a.st = { filter: 'wording' }; }
    else { for (const c of a.g.secs.flatMap(s => s.changes)) if (c.kind === 'blank' && !c.state) c.state = 'in'; }
    const line = /^show/i.test(q)
      ? 'Showing the wording changes only. Everything else is still there, just not coloured — a clause has to read as a clause.'
      : 'Accepted every blank. The wording changes are still open, which is the part that is about our position rather than about this deal.';
    /* the ask is already in the thread — both the composer and a
       suggestion say it before answer() runs — so this only replies.
       say() assigns the extra over the text, so the sentence is passed as
       `text` too, the shape mxTplBuiltIntro's own replies use */
    say('bot', line, { text: line, steps: [], cites: null, thinking: false, artifact: a.id });
    paintThread();
    queueMicrotask(() => openArtifact(a));
    return true;
  }
  if (!PC_ASK.test(q) || !(PC_FROM.test(q) || PC_SIGNED.test(q))) return false;
  /* a file handed over in the box is not one of ours, and this works off
     the agreements we hold — so it is said, not faked */
  const p = tplPrecMatch(q + ' ' + files.map(f => f.name || f).join(' '));
  if (p) return tplPrecTurn(p);
  if (!PC_SIGNED.test(q) && !/\bsigned|precedent\b/i.test(q)) return false;
  say('bot', '', { text: 'Which one? These are the agreements I hold with a playbook behind them — pick one and I '
    + 'will take the deal out of it.', steps: [], cites: null, thinking: false });
  paintThread();
  setTimeout(tplPrecStart, 200);
  return true;
}

/* ── registering the kind ─────────────────────────────────────── */
RENDER.precedent = tplPrecRender;
/* a sheet of paper with a struck line and a line set in its place:
   tracked changes, which is the whole of what this view is */
KIND_ICON.precedent =
    '<rect x="4.6" y="1.9" width="14.8" height="20.2" rx="2.6" fill="#FCFCFB" stroke="#D8D3CC" stroke-width="1"/>'
  + '<path d="M7.8 7.4h8.4" stroke="#DDD8D1" stroke-width="1" stroke-linecap="round"/>'
  + '<path d="M7.8 11h5.6" stroke="#B4471F" stroke-width="1" stroke-linecap="round"/>'
  + '<path d="M7.2 11h6.8" stroke="#B4471F" stroke-width="0.8" stroke-linecap="round"/>'
  + '<path d="M7.8 14.6h8.4" stroke="#2E7D4F" stroke-width="1" stroke-linecap="round"/>';
KIND_LABEL.precedent = 'Genericised precedent';
KIND_SHORT.precedent = 'REDLINE';
NOUN.precedent = 'genericised precedent';

SOURCES.precedent = { label: 'the signed agreement', verb: 'Read',
  icon: '<path d="M6 3.5h7.5L18.5 8.5V20.5H6z"/><path d="M13.5 3.5v5h5"/><path d="M8.6 12.5h3.4M8.6 16h6.2"/>' };

/* ── its own colours ──────────────────────────────────────────
   No shared stylesheet to put these in, so the file carries them and
   appends them once. Every colour is a token with the fallback the rest
   of the app already uses for struck and inserted words (.hz-rl del/ins
   in horizon.css), so a token added later wins without touching this. */
(() => {
  const id = 'prec-style';
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = `
/* the page is its own container, because what has to reflow is the
   document beside a chat, not the window — the panel is narrow while
   the window is wide. The review's margin notes collapse off a named
   container for the same reason (@container jv, review.css). */
.prec-page { container: prec / inline-size; height: 100%; overflow: auto; background: var(--paper, #FCFCFB); }
.prec-head { padding: 26px 32px 18px; border-bottom: 1px solid var(--line-soft, #EAE6E0); }
.prec-prov { display: flex; flex-direction: column; gap: 2px; margin-bottom: 12px; }
.prec-prov-t { font-size: 12.5px; font-weight: 500; letter-spacing: .02em; text-transform: uppercase; color: var(--text-soft, #6F6A62); }
.prec-prov-s { font-size: 12.5px; color: var(--text-faint, #9A968E); }
.prec-title { margin: 0; font-family: var(--serif, Spectral, Georgia, serif); font-size: 25px; font-weight: 500; color: var(--text, #26231E); }
.prec-lede { margin: 8px 0 0; max-width: 62ch; font-size: 13.5px; line-height: 1.6; color: var(--text-soft, #6F6A62); }

.prec-bar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 10px;
  align-items: center; justify-content: space-between;
  padding: 10px 32px; border-bottom: 1px solid var(--line-soft, #EAE6E0);
  background: var(--paper, #FCFCFB); }
.prec-tabs { display: flex; gap: 2px; }
.prec-tab { padding: 5px 10px; border: 0; border-radius: 7px; background: none; font: inherit; font-size: 12.5px;
  color: var(--text-soft, #6F6A62); cursor: pointer; }
.prec-tab:hover { background: var(--hover, #F2EFEA); }
.prec-tab.is-on { background: var(--hover, #F2EFEA); color: var(--text, #26231E); font-weight: 500; }
.prec-bar-a { display: flex; align-items: center; gap: 8px; }
.prec-bar-n { font-size: 12.5px; color: var(--text-faint, #9A968E); font-variant-numeric: tabular-nums; }
.prec-btn { padding: 5px 11px; border: 1px solid var(--line, #DED9D2); border-radius: 7px;
  background: var(--paper, #FCFCFB); font: inherit; font-size: 12.5px; color: var(--text, #26231E); cursor: pointer; }
.prec-btn:hover { background: var(--hover, #F2EFEA); }
.prec-btn--on { border-color: var(--text, #26231E); background: var(--text, #26231E); color: var(--paper, #FCFCFB); }
.prec-btn--on:hover { opacity: .9; background: var(--text, #26231E); }

.prec-sheet { padding: 8px 32px 72px; }
.prec-sec { display: grid; grid-template-columns: minmax(0, 1fr) 208px; gap: 24px; padding: 18px 0;
  border-bottom: 1px solid var(--line-soft, #EAE6E0); }
.prec-sec.is-out { opacity: .45; }
.prec-sec-h { display: flex; gap: 8px; margin: 0 0 6px; font-family: var(--serif, Spectral, Georgia, serif);
  font-size: 15.5px; font-weight: 500; color: var(--text, #26231E); }
.prec-sec-n { color: var(--text-faint, #9A968E); font-variant-numeric: tabular-nums; }
.prec-sec-p { margin: 0; font-family: var(--serif, Spectral, Georgia, serif); font-size: 14.5px; line-height: 1.72;
  color: var(--text, #26231E); }
.prec-sec--added .prec-sec-h { color: var(--doc-ins, #2E7D4F); }

.prec-pair del, .prec-pair ins { cursor: pointer; border-radius: 2px; }
.prec-pair del { color: var(--pos-walkaway, #B4471F); text-decoration-color: var(--pos-walkaway, #B4471F); }
.prec-pair ins { color: var(--doc-ins, #2E7D4F); text-decoration-color: var(--doc-ins, #2E7D4F); }
.prec-pair del:hover { background: var(--prec-del-bg, #FBEDE8); }
.prec-pair ins:hover { background: var(--prec-ins-bg, #E8F2EB); }
.prec-off del, .prec-off ins { color: var(--text-faint, #9A968E); text-decoration-color: var(--text-faint, #9A968E); }
.prec-done { color: var(--text, #26231E); }
.prec-blank { padding: 0 4px; border-radius: 4px; background: var(--prec-blank-bg, #F0EDE6);
  box-shadow: inset 0 0 0 1px var(--line, #DED9D2); font-family: var(--sans, Geist, system-ui, sans-serif);
  font-size: 12.5px; color: var(--text-soft, #6F6A62); white-space: nowrap; }

.prec-note { display: flex; flex-direction: column; gap: 6px; padding-top: 2px; }
.prec-note-r { display: flex; flex-direction: column; gap: 1px; padding: 6px 9px; border-left: 2px solid var(--line, #DED9D2);
  border-radius: 0 6px 6px 0; background: var(--hover, #F2EFEA); font-size: 11.5px; line-height: 1.5;
  color: var(--text-soft, #6F6A62); text-align: left; cursor: pointer; }
.prec-note-r b { font-weight: 500; letter-spacing: .04em; text-transform: uppercase; font-size: 10px;
  color: var(--text-faint, #9A968E); }
.prec-note-r--blank { border-left-color: var(--prec-blank-mark, #B9AF9C); }
.prec-note-r--wording { border-left-color: var(--pos-walkaway, #B4471F); }
.prec-note-r--added { border-left-color: var(--doc-ins, #2E7D4F); }
.prec-note-r.is-in, .prec-note-r.is-out { cursor: default; opacity: .6; }

.prec-pop { position: fixed; z-index: 90; width: 258px; padding: 12px; border: 1px solid var(--line, #DED9D2);
  border-radius: 10px; background: var(--paper, #FCFCFB);
  box-shadow: 0 10px 30px rgba(0,0,0,.12); font-size: 12.5px; color: var(--text, #26231E); }
.prec-pop-k { font-size: 10px; font-weight: 500; letter-spacing: .05em; text-transform: uppercase;
  color: var(--text-faint, #9A968E); }
.prec-pop-w { margin: 4px 0 10px; line-height: 1.55; color: var(--text-soft, #6F6A62); }
.prec-pop-a { display: flex; gap: 6px; justify-content: flex-end; }
.prec-pick-s { margin: -4px 20px 12px; font-size: 13px; line-height: 1.6; color: var(--text-soft, #6F6A62); }

/* beside a chat there is no room for a margin: the note drops under the
   clause it is about rather than squeezing the words it explains */
@container prec (max-width: 760px) {
  .prec-sec { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .prec-note { flex-direction: row; flex-wrap: wrap; }
  .prec-note-r { flex: 1 1 210px; }
}
@container prec (max-width: 560px) {
  .prec-head, .prec-bar, .prec-sheet { padding-left: 20px; padding-right: 20px; }
}`;
  document.head.append(el);
})();
