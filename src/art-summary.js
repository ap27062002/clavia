/* ──────────────────────────────────────────────────────────────
   Contract summaries

   One contract — out of a vault, or handed over in the box — read into a
   Word document, then questioned, then emailed with the document named as
   the attachment. Three things that already existed separately in this
   app and never met: the file look-up has the facts but lives in a modal,
   the review page answers questions from clause text but only beside a
   request, and the Vault review table answers one question across many
   contracts rather than many questions about one.

   Nothing here re-reads a contract. The clause-by-clause reading was
   already done and is sitting in JV_REVIEWS; a request is the join that
   says which vault file it belongs to. So the summary quotes the clauses
   and carries the playbook's own verdict on them rather than deriving a
   second opinion that could disagree with the review page.

   This file owns one seam into the chat — sumTurn(prompt, files) — which
   returns false unless it recognises the ask, so every other kind of
   question falls through untouched. It has to sit above botTurn because
   BUILDS.doc matches the word "document" and would otherwise answer
   "summarise this contract in a Word document" with the Kestrel position
   brief, whatever contract was attached.
────────────────────────────────────────────────────────────── */

/* Our own colour for the one thing the shared stylesheet has no opinion
   about: a point in the summary that is outside the playbook. It borrows
   the document's own struck-text red, because it means the same thing in
   the same page — this is the part somebody has to argue about. */
(() => {
  if (document.getElementById('sum-css')) return;
  document.head.append(h('style', { id: 'sum-css' }, `
    .doc-page .sum-flag { color: var(--doc-del, #B4463A); font-weight: 600; }
    .doc-page .sum-who { opacity: .68; font-weight: 400; }
  `));
})();

/* ── what counts as asking for one ────────────────────────────
   Redline, compare and template keep their own asks; this is only the
   summary. "memo" and "brief" are deliberately not excluded — they are
   what people call this document, and BUILDS.doc would take them. */
const SUM_WANT = /\b(summar\w*|key terms|abstract|digest|brief me|break ?down)\b/i;
const SUM_NOT  = /\b(redline|compare|comparison|template|renewal calendar|playbook)\b/i;
const SUM_MAIL = /\b(e-?mail|mail (it|this|the summary)|send (it|this|the summary))\b/i;
const SUM_ADD  = /\badd (that|this|it|the answers?|those)\b|\b(put|include) (that|this|it) in the summary\b/i;
const SUM_RISK = /\b(risks?|concerns?|unusual|red ?flags?|issues?|problems?|worr\w*|watch out|biggest|worst)\b/i;
const SUM_PAPER = /\b(clause|contract|agreement|nda|dpa|msa|sow|addendum|paper|document)\b/i;
const SUM_Q    = /\?\s*$|^(what|when|where|which|who|whose|how|can|could|does|do|did|is|are|was|were|will|would|should|if|any|tell me|explain|remind me)\b/i;

/* the summary a conversation is about, held on the thread so two chats
   can each be about a different contract */
const sumOpen = (t) => {
  const a = ARTIFACTS[(t || thread)?.sumId];
  return a?.sum ? a : null;
};

const sumSnip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.lastIndexOf(' ', n);
  return t.slice(0, cut > n - 24 ? cut : n).trim() + '…';
};
/* A contract quoting its own defined terms puts double quotes inside the
   quotation. Nesting them as single quotes is the typographic convention
   and keeps the words themselves exactly as they are. */
const sumQuote = (s) => '“' + String(s).replace(/“/g, '‘').replace(/”/g, '’') + '”';
const sumHead = (c) => String(c.heading || '').replace(/^\d+(\.\d+)*\.?\s*/, '').replace(/\.$/, '');
/* what a clause is about, said in running prose. The review's own topic
   is better written than the contract's heading; both are title case,
   which reads as a mistake in the middle of a sentence. */
const sumName = (c) => (c.topic && !/not covered/i.test(c.topic) ? c.topic : sumHead(c))
  .toLowerCase().replace(/\b(dpa|nda|msa|sow|sla|ip)\b/g, (x) => x.toUpperCase());
const sumList = (xs) => xs.length < 2 ? (xs[0] || '')
  : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];

/* ══════════════════ WHICH CONTRACT ══════════════════
   A request is the only thing in the seed that knows a vault file and a
   clause-by-clause review are the same piece of paper. modules-work.js
   already walks r.files for its own reasons; this walks it the other way
   round, from the file to the reading. */
const SUM_KINDS = new Set(['Agreement', 'Addendum', 'Order form']);

function sumRequestFor(vaultId, name) {
  if (typeof JV_REVIEWS !== 'object') return null;
  for (const r of mxData().requests) {
    if (!r.review || !JV_REVIEWS[r.review]) continue;
    if ((r.files || []).some(f => f.vault === vaultId && f.name === name)) return r;
  }
  return null;
}

/* Everything that can be summarised: every contract in a vault, plus any
   contract that only exists as a review — with legal, never filed — since
   that is still something somebody will ask about by name. */
function sumCandidates() {
  const out = [], read = new Set();
  for (const v of mxData().vaults) {
    for (const f of v.files) {
      if (!SUM_KINDS.has(f.kind)) continue;
      const rq = sumRequestFor(v.id, f.name);
      if (rq) read.add(rq.review);
      out.push({ key: v.id + '|' + f.name, name: f.name, file: f, vault: v, rq,
        review: rq ? JV_REVIEWS[rq.review] : null });
    }
  }
  if (typeof JV_REVIEWS === 'object') {
    for (const rq of mxData().requests) {
      if (!rq.review || read.has(rq.review) || !JV_REVIEWS[rq.review]) continue;
      const rv = JV_REVIEWS[rq.review];
      out.push({ key: 'rev|' + rq.review, name: rv.name + '.docx', file: null, vault: null, rq, review: rv });
    }
  }
  return out;
}

/* The words that actually name a contract. "Agreement", "redline" and
   "their paper" name every one of them, so they name none. */
const SUM_NOISE = new Set(['their', 'paper', 'signed', 'customer', 'redline', 'agreement',
  'contract', 'docx', 'pdf', 'the', 'our', 'draft', 'and', 'ltd', 'inc', 'corp', 'llc']);
const sumNames = (c) => [...new Set(
  (c.name.replace(/\.[a-z0-9]+$/i, '') + ' ' + (c.rq?.counterparty || ''))
    .toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !SUM_NOISE.has(w)))];

/* The file pill wins outright when its name is one we hold. Otherwise the
   words of the ask and of the pill are scored together, so "summarise the
   Acme MSA" lands on the MSA rather than the SOW on the same account. */
function sumPick(text, files = []) {
  const cands = sumCandidates();
  const pill = (files || []).map(f => f.name).join(' ').trim();
  const exact = pill && cands.find(c => c.name.toLowerCase() === pill.toLowerCase());
  if (exact) return exact;
  const low = (pill + ' ' + text).toLowerCase();
  let best = null, score = 0;
  for (const c of cands) {
    const n = sumNames(c).filter(w => low.includes(w)).length;
    if (n > score) { score = n; best = c; }
  }
  if (!score) return null;
  /* a document handed over under a name we do not hold is an upload, and
     the summary should say so rather than claim it came out of a vault */
  if (pill && sumNames(best).some(w => pill.toLowerCase().includes(w))) best.upload = pill;
  return best;
}

/* ══════════════════ READING IT ══════════════════
   Two sources, and the summary says which it had. A contract with a
   review has clauses, their playbook position and what we need instead. A
   contract with only a vault entry has the facts somebody filed with it,
   which is a shorter and more honest document. */

/* The order a summary reads in, and the clause each line comes from. The
   label is the contract's own heading — inventing a tidier one would put
   words in the document that are not in the contract.

   The patterns are anchored harder than they look because they are tested
   against the heading and the topic joined: a loose /term/ matches
   "Payment terms" and a loose /services/ matches "Services warranty", and
   both put the wrong clause at the top of the summary. */
const SUM_TERM = /^\d*\.?\s*term\b|term and|renewal|term of confidentiality/i;
const SUM_SVC = /scope|^\d*\.?\s*services\b|subscription|processing instruction|definition of confidential/i;
const SUM_ORDER = [
  SUM_SVC,
  /confidential information|use restriction/i,
  /fees|payment|price/i,
  SUM_TERM,
  /terminat/i,
  /liabilit/i,
  /indemn/i,
  /data protection|subprocessor|personal data|audit|international transfer|deletion of data/i,
  /warrant|acceptance/i,
  /insur/i,
  /intellectual property|licen[cs]e/i,
  /assign/i,
  /governing law|jurisdiction/i,
];

/* Key dates, pulled out of the clause's own numbers. Every one of these
   is a figure written in the contract — nothing is counted forward from a
   signature date, because the seeded contracts do not carry one and a
   calculated deadline nobody can check is the worst line a summary could
   have. */
const SUM_DATES = [
  [/initial (?:subscription )?term (?:is|of) [^.;]*?\((\d+)\)\s*(month|year)/i, (m) => `Initial term: ${m[1]} ${m[2]}s`],
  [/renews automatically for successive [^.;]*?\((\d+)\)\s*(month|year)/i, (m) => `Renews automatically for further ${m[1]}-${m[2]} terms`],
  [/notice of non-renewal at least [^.;]*?\((\d+)\)\s*days/i, (m) => `Notice to stop it renewing: at least ${m[1]} days before the term ends`],
  [/for convenience[^.;]*?\((\d+)\)\s*days/i, (m) => `Termination for convenience: ${m[1]} days' notice`],
  [/cure the breach within [^.;]*?\((\d+)\)\s*days/i, (m) => `Cure period for material breach: ${m[1]} days`],
  [/payable within [^.;]*?\((\d+)\)\s*days|pay each invoice within [^.;]*?\((\d+)\)\s*days/i,
    (m) => `Payment due: ${m[1] || m[2]} days from the invoice date`],
  [/adjust its prices[^.;]*?\((\d+)\)\s*days/i, (m) => `Price changes: ${m[1]} days' notice`],
  [/within [^.;]*?\((\d+)\)\s*hours/i, (m) => `Notification window: ${m[1]} hours`],
  [/\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/,
    (m) => `Date named in the clause: ${m[1]}`],
];

function sumDates(rv) {
  const out = [], said = new Set();
  for (const c of rv.clauses) {
    for (const [re, say] of SUM_DATES) {
      const m = re.exec(c.text || '');
      if (!m) continue;
      const line = say(m);
      if (said.has(line)) continue;
      said.add(line);
      out.push({ t: line, n: c.n, c });
    }
  }
  return out;
}

/* What somebody has to argue about, worst first. The verdict and the
   position we need are the review's own words; the escalation is the
   review's too, and it is the most useful line in a summary — it says who
   has to sign the concession off. */
function sumNotes(rv) {
  const of = (st) => rv.clauses.filter(c => c.status === st);
  const out = [];
  for (const c of of('unacceptable')) {
    out.push({ sev: 'high', n: c.n, c, who: c.escalate || null,
      t: `<b>Clause ${c.n} ${docEsc(sumHead(c))}</b> is outside the playbook — ${docEsc(c.why || c.summary)}`
        + ` We need: ${docEsc(c.need || 'our standard position')}` });
  }
  for (const c of (rv.missing || [])) {
    out.push({ sev: 'high', n: null, c, who: c.escalate || null,
      t: `<b>No ${docEsc(sumName(c))} clause at all.</b> The ${docEsc(rv.playbook?.name || 'playbook')} expects one: `
        + docEsc(c.need || c.why || '') });
  }
  for (const c of of('fallback')) {
    out.push({ sev: 'mid', n: c.n, c, who: null,
      t: `<b>Clause ${c.n} ${docEsc(sumHead(c))}</b> sits inside our fallback — ${docEsc(c.concede || c.why || '')}` });
  }
  return out;
}
/* the same note three ways: styled in the document, plain in the chat,
   and marked up but unstyled in a mail somebody else will read */
const sumNoteDoc = (n) => (n.who ? `${n.t} <span class="sum-who">Sign-off: ${docEsc(n.who)}.</span>` : n.t);
const sumNoteMail = (n) => n.t + (n.who ? ` Sign-off: ${docEsc(n.who)}.` : '');
const sumNoteText = (n) => sumNoteMail(n).replace(/<[^>]+>/g, '');

function sumRead(c) {
  const rv = c.review, f = c.file, rq = c.rq;
  const docTitle = rv ? rv.name : f.name.replace(/\.[a-z0-9]+$/i, '');
  const short = docTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const them = rq?.counterparty || f?.facts?.Counterparty || 'the other side';
  const pb = rv?.playbook || null;
  const F = {
    key: c.key, slug: c.key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    title: `Contract summary: ${short}`, short, docTitle, them,
    parties: pb ? `${them} (${pb.counterparty}) and us (${pb.party})` : `${them} and us`,
    status: c.upload ? `Handed over · ${c.upload}`
      : c.vault ? `From Vault · ${c.vault.name} · added ${pbWhen(f.added)}`
      : `With Legal · ${rq.id} · ${rq.title}`,
    playbook: pb?.name || null, clauses: rv ? rv.clauses : [], facts: f?.facts || null,
    file: c.upload || c.name, vault: c.vault?.name || null, rq: rq?.id || null,
    today: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    rows: [], dates: [], notes: [], overview: '', qa: [],
  };

  if (rv) {
    const used = new Set();
    for (const re of SUM_ORDER) {
      const hit = rv.clauses.find(x => !used.has(x) && re.test(x.heading + ' ' + (x.topic || '')));
      if (!hit) continue;
      used.add(hit);
      F.rows.push({ label: sumHead(hit), n: hit.n, text: sumSnip(hit.text, 180), c: hit });
    }
    F.dates = sumDates(rv);
    F.notes = sumNotes(rv);
    /* the counts are the review's own, so the summary cannot disagree
       with the review page about how bad the contract is */
    const k = rv.counts || {};
    const bits = [];
    if (k.preferred) bits.push(`${k.preferred} ${k.preferred === 1 ? 'matches' : 'match'} our preferred position`);
    if (k.fallback) bits.push(`${k.fallback} ${k.fallback === 1 ? 'sits' : 'sit'} inside a fallback we can accept`);
    if (k.unacceptable) bits.push(`${k.unacceptable} ${k.unacceptable === 1 ? 'is' : 'are'} outside it`);
    if (k.none) bits.push(`${k.none} ${k.none === 1 ? 'is' : 'are'} not covered by it`);
    const bad = rv.clauses.filter(x => x.status === 'unacceptable').map(sumName);
    const miss = (rv.missing || []).map(c => `${/^[aeiou]/.test(sumName(c)) ? 'an' : 'a'} ${sumName(c)} clause`);
    F.overview = `${docTitle} is on the table with ${them}, read clause by clause against our `
      + `${pb?.name || 'playbook'} playbook. Of ${rv.clauses.length} clauses, ${sumList(bits)}.`
      + (bad.length ? ` The ${bad.length === 1 ? 'one' : 'ones'} to argue about `
        + `${bad.length === 1 ? 'is' : 'are'} ${sumList(bad)}.` : '')
      + (miss.length ? ` The playbook also expects ${sumList(miss)}, `
        + `${miss.length === 1 ? 'which does not appear in it at all'
          : miss.length === 2 ? 'and neither appears in it at all'
          : 'and none of them appear in it at all'}.` : '');
  } else {
    F.rows = Object.entries(f.facts || {}).map(([k, v]) =>
      ({ label: k.replace(/_/g, ' '), n: null, text: String(v), c: null }));
    F.dates = Object.entries(f.facts || {})
      .filter(([k, v]) => /renew|notice|term|expir|date|payment/i.test(k + ' ' + v))
      .map(([k, v]) => ({ t: `${k.replace(/_/g, ' ')}: ${v}`, n: null, c: null }));
    F.overview = `${f.summary} ${F.rows.length ? `${mxPlural(F.rows.length, 'term')} were filed with it.` : ''} `
      + 'Nobody has read it clause by clause, so this is what is on file rather than a reading of the '
      + 'paper — send it for review and the summary can carry the playbook positions too.';
  }
  return F;
}

/* ══════════════════ THE DOCUMENT ══════════════════
   renderDoc has no table block and adding one would mean editing
   artifacts.js, which is not this file's to edit — so the key terms are a
   bullet list with the clause number in the lead. */
function sumBlocks(F) {
  const b = [{ t: 'h1', v: docEsc(F.title) }];
  b.push({ t: 'meta', v: [
    `<b>Agreement:</b> ${docEsc(F.docTitle)}`,
    `<b>Parties:</b> ${docEsc(F.parties)}`,
    `<b>Status:</b> ${docEsc(F.status)}`,
    `<b>Prepared by:</b> ${docEsc(USER.name)}, Legal · ${F.today}`,
  ].join('<br>') });
  b.push({ t: 'h2', v: 'Overview' }, { t: 'p', v: docEsc(F.overview) });
  if (F.rows.length) {
    b.push({ t: 'h2', v: 'Key terms' });
    b.push({ t: 'ul', v: F.rows.map(r => `<b>${docEsc(r.label)}${r.n ? ` (clause ${r.n})` : ''}:</b> `
      + (r.c ? sumQuote(docEsc(r.text)) : docEsc(r.text))) });
  }
  if (F.dates.length) {
    b.push({ t: 'h2', v: 'Key dates and periods' });
    b.push({ t: 'ul', v: F.dates.map(d => docEsc(d.t)
      + (d.n ? ` <span class="sum-who">(clause ${d.n})</span>` : '')) });
  }
  b.push({ t: 'h2', v: 'Points to note' });
  if (F.notes.length) {
    b.push({ t: 'ul', v: F.notes.map(n => n.sev === 'high'
      ? `<span class="sum-flag">${sumNoteDoc(n)}</span>` : sumNoteDoc(n)) });
  } else {
    b.push({ t: 'p', v: F.playbook
      ? `Nothing in it is outside our ${docEsc(F.playbook)} playbook.`
      : 'Nothing is flagged, because nobody has read it against a playbook yet.' });
  }
  if (F.qa.length) {
    b.push({ t: 'h2', v: 'Questions answered' });
    for (const x of F.qa) b.push(...sumQaBlocks(x));
  }
  return b;
}
const sumQaBlocks = (x) => [{ t: 'p', v: `<b>${docEsc(x.q)}</b>` }, { t: 'p', v: docEsc(x.a) }];

function sumDoc(F) {
  const id = 'doc-summary-' + F.slug;
  const a = ARTIFACTS[id] || defineArtifact({ id, kind: 'doc', ext: 'docx', name: F.title });
  a.name = F.title;
  a.sub = `Contract summary · ${mxPlural(F.rows.length, 'term')} · `
    + mxPlural(F.notes.length, 'point to note', 'points to note');
  a.sum = F;
  /* made in this conversation, so its history starts here rather than
     carrying whatever an earlier run of it left behind */
  a.versions = [{ when: 'Just now', by: 'Assistant', name: 'The summary', blocks: sumBlocks(F) }];
  a.vi = 0;
  return a;
}

/* ══════════════════ THE RUN ══════════════════ */
function sumRun(pick, files = []) {
  const F = sumRead(pick);
  const a = sumDoc(F);
  thread.sumId = a.id;

  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();

  const steps = [
    { source: 'document', query: 'Read ' + F.file,
      count: pick.upload ? 'handed over' : pick.vault ? 'from Vault' : 'with Legal' },
    { source: 'think', query: 'Pulled out the key terms and dates',
      count: mxPlural(F.rows.length, 'term') + (F.dates.length ? ` · ${mxPlural(F.dates.length, 'date')}` : '') },
  ];
  if (F.playbook) {
    steps.push({ source: 'playbook', query: `Checked it against the ${F.playbook} playbook`,
      count: F.notes.length ? mxPlural(F.notes.length, 'point to note', 'points to note') : 'no differences' });
  }
  steps.push({ source: 'doc', query: 'Wrote the summary', count: 'DOCX' });

  steps.forEach((st, i) => {
    setTimeout(() => { m.steps.push({ ...st, rows: [], running: true }); renderBot(m); }, 320 + i * 760);
    setTimeout(() => { Object.assign(m.steps[i], st, { running: false }); renderBot(m); }, 320 + i * 760 + 600);
  });

  setTimeout(() => {
    m.thinking = false;
    if (m.traceOpen == null) m.traceOpen = false;
    m.text = `${F.overview}\n\nThe summary is a Word document — overview, key terms with their clause `
      + 'numbers, the dates, and what is worth arguing about. Ask me anything about '
      + `${F.short} and I will answer from ${F.clauses.length ? 'its clauses' : 'what is on file'}; `
      + 'I can add the answers to the summary, then email it.';
    m.cites = null;
    m.artifact = a.id;
    m.suggest = sumSuggest(F);
    renderBot(m);
    if (document.getElementById('main')?.dataset.artifact === 'open') openArtifact(a);
  }, 320 + steps.length * 760 + 420);
}

/* follow-ups this contract can actually answer, which is why they are
   read off its clauses rather than written out as four fixed strings */
function sumSuggest(F) {
  const out = [];
  const has = (re) => F.clauses.some(c => re.test(c.heading + ' ' + (c.topic || '')));
  if (has(SUM_TERM)) out.push('When does it renew, and what notice do we have to give?');
  if (has(/assign/i)) out.push(`Can ${F.them} assign this agreement?`);
  if (F.clauses.length) {
    out.push('What are the biggest risks for us?');
    const bad = F.clauses.find(c => c.status === 'unacceptable');
    if (bad) out.push(`What does it say about ${sumName(bad)}?`);
  } else {
    /* the counterparty is already in the parties line, so asking about it
       would be the one suggestion whose answer is on screen */
    for (const r of F.rows.filter(x => !/counterparty/i.test(x.label)).slice(0, 2)) {
      out.push(`What is on file about the ${r.label.toLowerCase()}?`);
    }
  }
  /* the email is the end of this flow, so it keeps its place whatever
     else the contract has to offer */
  return [...out.slice(0, 3), 'Email the summary to ' + sumPerson('', F).n];
}

/* asked for a summary with nothing to summarise */
function sumAskWhich() {
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();
  setTimeout(() => {
    m.thinking = false;
    m.text = 'Which contract? Attach it in the box, or name one — I can summarise anything in a '
      + 'vault, and the ones already with Legal come with their playbook reading attached.';
    m.suggest = sumCandidates().filter(c => c.review).slice(0, 4)
      .map(c => `Summarise ${c.name.replace(/\.[a-z0-9]+$/i, '')} in a Word document`);
    renderBot(m);
  }, 620);
}

/* asked for a summary again, in a conversation that already has one */
function sumAgainTurn(a) {
  const F = a.sum;
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();
  setTimeout(() => {
    m.thinking = false;
    m.text = `${F.short} is already summarised in this conversation — it is below. `
      + 'Ask me about it, or name a different contract and I will summarise that one too.';
    m.artifact = a.id;
    m.suggest = sumSuggest(F);
    renderBot(m);
  }, 560);
}

/* ══════════════════ FOLLOW-UP QUESTIONS ══════════════════
   The same reading review.js does beside a request, over the same
   clauses: a topic branch where the question names one, and otherwise the
   passage whose words most overlap the question's. There is no model
   here, and the answer is always the contract's own sentence, quoted. */
const SUM_TOPICS = [
  [/\bgovern\w*|\blaw\b|jurisdiction|courts?|disputes?|arbitrat\w*|\bsue\b/i, /governing law|jurisdiction/i],
  [/\brenew\w*|roll ?over|extend|extension/i, SUM_TERM],
  [/\bterminat\w*|get out|exit|cancel|walk away/i, /terminat/i],
  [/how long|surviv\w*|expir\w*|duration|until when|end date|\bterm\b/i, SUM_TERM],
  [/\bassign\w*|change of control|novat\w*/i, /assign/i],
  [/\bliabilit\w*|\bcap\b|damages|losses|indemn\w*/i, /liabilit|indemn/i],
  [/\bpay\w*|invoice|fees?|price\w*|cost|charge|increase/i, /fees|payment|price/i],
  [/confidential\w*|\bnda\b|secret|disclos\w*/i, /confidential/i],
  [/\binsur\w*/i, /insur/i],
  [/\bdata\b|personal|gdpr|breach|subprocessor|audit\w*|transfer\w*|delet\w*/i,
    /data|subprocessor|audit|transfer|deletion|processing/i],
  [/\bip\b|intellectual|owner\w*|\bowns?\b|licen[cs]e/i, /intellectual|licen[cs]e/i],
  [/scope|deliverab\w*|acceptance|change control/i, /scope|acceptance|^\d*\.?\s*services\b/i],
  [/\bnotices?\b|serve notice/i, /notice|general/i],
];

/* The words every clause of every contract contains carry no signal about
   which clause is meant — "agreement" appears in all seven of a supplier
   agreement's clauses, so a question containing it would match the first
   one and look like a reading. */
const SUM_STOP = new Set(('what does the contract say about can either party parties is are a an of to in for and or '
  + 'on with this that it we they their our any be do how when which who whose will would should if us me the then '
  + 'than there from have has was were did much many under says said tell explain give get put need '
  + 'agreement agreements clause clauses section document paper provider customer supplier buyer processor').split(' '));
const sumWords = (t) => String(t).toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 2 && !SUM_STOP.has(x));
const sumHit = (set, w) => set.has(w)
  || (w.length > 4 && [...set].some(y => y.startsWith(w.slice(0, 5))));

/* The clause a question is about. A topic the question names narrows the
   field rather than deciding it, because /audit/ alone also matches
   "Processing Instructions" through the word processing — the question's
   own words have to settle which clause inside that field it meant. The
   heading counts twice, since that is where a contract says what a clause
   is for. */
function sumFind(F, q) {
  /* the contract's own name is how you say which contract, not which
     clause, so "can Kestrel Freight assign this?" is a question about
     assignment and nothing else */
  const own = new Set(sumWords(F.short + ' ' + F.them));
  const qw = sumWords(q).filter(w => !own.has(w));
  if (!qw.length || !F.clauses.length) return null;
  const topic = SUM_TOPICS.find(([on]) => on.test(q));
  let best = null, score = 0;
  for (const c of F.clauses) {
    const head = c.heading + ' ' + (c.topic || '');
    const named = topic && topic[1].test(head) ? 2 : 0;
    const hw = new Set(sumWords(head));
    const heads = qw.filter(x => sumHit(hw, x)).length * 2;
    for (const s of String(c.text || '').split(/(?<=[.;])\s+/)) {
      const sw = new Set(sumWords(s + ' ' + head));
      const n = qw.filter(x => sumHit(sw, x)).length + heads + named;
      if (n > score) { score = n; best = { c, s, named: !!named }; }
    }
  }
  return score ? best : null;
}

/* the review's verdict, said in a sentence rather than a status word */
function sumReading(F, c) {
  if (c.status === 'unacceptable') {
    return `That is outside our ${F.playbook} playbook. We need: ${c.need || 'our standard position'}`
      + (c.escalate ? ` Conceding it is ${c.escalate}'s call.` : '');
  }
  if (c.status === 'fallback') return `That sits inside our acceptable fallback: ${c.concede || c.why || ''}`;
  if (c.status === 'preferred') return 'That matches our preferred position, so there is nothing to argue about.';
  return `Our ${F.playbook} playbook has no position on it, so it is a judgement call rather than a deviation.`;
}

function sumAnswerFrom(F, q) {
  const cite = (c) => ({ source: 'document', label: 'Clause ' + c.n,
    title: `${F.short} · ${sumHead(c)} — ${sumSnip(c.text, 120)}` });

  /* the risks question is not about one clause, it is about the list */
  if (SUM_RISK.test(q)) {
    if (!F.notes.length) {
      return { text: F.playbook ? `Nothing in it is outside our ${F.playbook} playbook.`
        : `Nobody has read ${F.short} against a playbook, so I have no flags to give you — only what is on file.` };
    }
    const high = F.notes.filter(n => n.sev === 'high').slice(0, 4);
    const use = high.length ? high : F.notes.slice(0, 3);
    return {
      text: `${use.length === F.notes.length ? 'All of it' : mxPlural(use.length, 'thing')}, worst first:\n\n`
        + use.map((n, i) => `- ${sumNoteText(n)}[${i + 1}]`).join('\n'),
      /* a clause that is missing cites the playbook that wanted it, since
         there is no clause in the contract to point at */
      cites: use.map(n => n.n ? cite(n.c)
        : { source: 'playbook', label: F.playbook, title: `${F.playbook} playbook · expects a ${sumName(n.c)} clause` }),
    };
  }

  /* facts only: answer from what was filed, and say that is all there is */
  if (!F.clauses.length) {
    const qw = sumWords(q);
    const hit = (F.rows || []).find(r => qw.some(w => sumHit(new Set(sumWords(r.label + ' ' + r.text)), w)));
    return { text: hit
      ? `From what is on file: **${hit.label}** — ${hit.text}.\n\nThat is a note somebody filed with the `
        + `document, not a clause I have read. For the clause itself, ${F.short} needs to go for review.`
      : `${F.short} has not been read clause by clause, so I cannot answer that from it. What is on file is `
        + `${sumList((F.rows || []).map(r => r.label.toLowerCase()))} — send it for review and I can answer properly.` };
  }

  const best = sumFind(F, q);
  if (!best) {
    return { text: `${F.short} does not say anything about that. It covers `
      + `${sumList(F.rows.slice(0, 6).map(r => r.label.toLowerCase()))}, and the usual boilerplate.` };
  }
  /* the whole clause when the question named its topic, the sentence that
     answered when it did not — quoting a whole liability clause back at
     somebody who asked one narrow thing is not an answer */
  const said = best.named ? sumSnip(best.c.text, 280) : sumSnip(best.s, 240);
  return { text: `**Clause ${best.c.n} ${sumHead(best.c)}:** ${sumQuote(said)}[1]\n\n${sumReading(F, best.c)}`,
    cites: [cite(best.c)], c: best.c };
}

function sumAskTurn(a, q) {
  const F = a.sum;
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();
  const step = { source: 'document', query: `Looked through ${F.short}`,
    count: F.clauses.length ? mxPlural(F.clauses.length, 'clause') : 'what is on file' };
  setTimeout(() => { m.steps.push({ ...step, rows: [], running: true }); renderBot(m); }, 260);
  setTimeout(() => { Object.assign(m.steps[0], step, { running: false }); renderBot(m); }, 900);
  setTimeout(() => {
    m.thinking = false;
    if (m.traceOpen == null) m.traceOpen = false;
    const out = sumAnswerFrom(F, q);
    m.text = out.text;
    m.cites = out.cites || null;
    /* held so "add that to the summary" knows what "that" was. The plain
       form is what goes in the document — a citation marker in a Word
       document points at nothing. */
    F.last = { q: q.replace(/\s+/g, ' ').trim(),
      a: out.text.replace(/\[\d+\]/g, '').replace(/\*\*/g, '').replace(/\n+/g, ' ').replace(/^- /gm, '').trim() };
    m.suggest = ['Add that to the summary'];
    renderBot(m);
  }, 1250);
}

/* The summary grows. Appended to the blocks as they stand rather than
   rebuilt from the reading, so tracked changes somebody has not answered
   yet survive the addition. */
function sumAddTurn(a) {
  const F = a.sum;
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();
  setTimeout(() => {
    m.thinking = false;
    if (m.traceOpen == null) m.traceOpen = false;
    if (!F.last) {
      m.text = 'Ask me something about the contract first, and then I can put the answer in the summary.';
      return renderBot(m);
    }
    const x = F.last;
    if (!F.qa.some(y => y.q === x.q)) F.qa.push(x);
    const blocks = (bodyOf(a, 'blocks') || []).slice();
    if (!blocks.some(b => b.t === 'h2' && b.v === 'Questions answered')) blocks.push({ t: 'h2', v: 'Questions answered' });
    blocks.push(...sumQaBlocks(x));
    const n = bumpVersion(a, { by: 'Assistant', name: 'Questions answered' }, { blocks });
    m.steps.push({ source: 'doc', query: 'Added it under Questions answered', count: 'Version ' + (n || 2), rows: [] });
    m.text = `Added, under **Questions answered** — v${n}. The answer in the document is the plain one, `
      + 'without the citation, so it reads as a sentence somebody wrote.';
    m.artifact = a.id;
    m.suggest = ['Email the summary to ' + sumPerson('', F).n];
    renderBot(m);
    if (document.getElementById('main')?.dataset.artifact === 'open') openArtifact(a);
  }, 820);
}

/* ══════════════════ THE EMAIL ══════════════════
   A draft, with the summary named as the attachment. renderMail has no
   attachment row of its own, so the attachment is a line in the body and
   the real one is the Outlook destination in Export, which already starts
   a mail with the document attached. Nothing is sent. */
const sumAddr = (n) => (typeof MEET_BOOK === 'object' && MEET_BOOK[n])
  || n.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') + '@unifyapps.com';

/* whoever the ask names, out of the cast the requests already have —
   and failing that whoever asked for this contract to be looked at */
function sumPerson(q, F) {
  const cast = [...new Set([...mxData().requests.map(r => r.requester),
    ...(typeof MX_LEGAL !== 'undefined' ? MX_LEGAL.map(p => p.name) : [])].filter(Boolean))]
    .filter(n => n !== USER.name);
  const named = cast.find(n => new RegExp('\\b' + n.split(' ')[0] + '\\b', 'i').test(q || ''));
  const owner = F?.rq && mxRequest(F.rq)?.requester;
  const who = named || (owner && owner !== USER.name ? owner : null) || cast[0] || 'Grace Coleman';
  return { n: who, e: sumAddr(who) };
}

function sumMailTurn(a, q) {
  const F = a.sum;
  const to = sumPerson(q, F);
  const key = F.rows.slice(0, 2).map(r => `<b>${docEsc(r.label)}${r.n ? ` (clause ${r.n})` : ''}:</b> ${docEsc(r.text)}`);
  const notes = F.notes.slice(0, 3).map(sumNoteMail);
  const attach = `${F.title}.docx`;

  const blocks = [{ t: 'p', v: `Hi ${docEsc(to.n.split(' ')[0])},` },
    { t: 'p', v: `Here is a summary of ${docEsc(F.docTitle)} with ${docEsc(F.them)}.` },
    { t: 'p', v: docEsc(F.overview) }];
  if (key.length) blocks.push({ t: 'p', v: 'Key terms:' }, { t: 'ul', v: key });
  if (notes.length) blocks.push({ t: 'p', v: 'Points to note:' }, { t: 'ul', v: notes });
  if (F.qa.length) {
    blocks.push({ t: 'p', v: 'You also asked:' },
      { t: 'ul', v: F.qa.map(x => `<b>${docEsc(x.q)}</b> ${docEsc(x.a)}`) });
  }
  blocks.push({ t: 'strong', v: `The full summary is attached as ${docEsc(attach)}.` },
    { t: 'p', v: 'Happy to talk it through.' },
    { t: 'p', v: `Best,<br>${docEsc(USER.name.split(' ')[0])}` });

  const id = 'mail-summary-' + F.slug;
  const name = `${F.short} — summary to ${to.n}`;
  const mail = ARTIFACTS[id] || defineArtifact({ id, kind: 'mail', ext: '', name });
  mail.name = name;
  mail.sub = `Draft · to ${to.n}`;
  mail.to = [to];
  mail.cc = [];
  mail.subject = F.title;
  mail.blocks = blocks;

  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();
  const step = { source: 'outlook', query: `Drafted a mail to ${to.n}`, count: 'not sent' };
  setTimeout(() => { m.steps.push({ ...step, rows: [], running: true }); renderBot(m); }, 300);
  setTimeout(() => { Object.assign(m.steps[0], step, { running: false }); renderBot(m); }, 1000);
  setTimeout(() => {
    m.thinking = false;
    if (m.traceOpen == null) m.traceOpen = false;
    m.text = `Drafted to ${to.n} — the overview, `
      + (F.rows.length ? 'two key terms with their clause numbers' : 'what is on file')
      + (notes.length ? `, the ${notes.length === 1 ? 'point' : notes.length + ' points'} worth noting` : '')
      + (F.qa.length ? ', and the questions you asked' : '') + '.\n\n'
      + `The body names **${attach}** as the attachment. Attaching it for real is the Outlook `
      + 'destination in the summary’s Export, which starts a mail with the document on it. '
      + 'Nothing has been sent.';
    m.cites = null;
    m.artifact = mail.id;
    renderBot(m);
  }, 1400);
}

/* ══════════════════ THE SEAM ══════════════════
   Shaped like skillAnswer: true means this file has taken the turn, false
   means it recognised nothing and the chat should carry on as before.
   "Make it shorter" deliberately returns false — botTurn's docEditPlan
   already turns that into tracked changes on whatever doc is in hand, and
   a second implementation of it here would be the worse one. */
function sumTurn(prompt, files = []) {
  if (!thread) return false;
  const q = String(prompt || '').trim();
  if (!q) return false;
  const wants = SUM_WANT.test(q) && !SUM_NOT.test(q);
  const open = sumOpen();

  /* "add that to the summary" and "email the summary" both carry the word
     summary, so what to do with one is read before the ask to make one */
  if (open && SUM_ADD.test(q)) { sumAddTurn(open); return true; }
  if (open && SUM_MAIL.test(q) && !/\?\s*$/.test(q)) { sumMailTurn(open, q); return true; }

  /* a contract named in the ask wins over the one already summarised, so
     the second contract in a conversation gets its own document */
  if (wants) {
    const pick = sumPick(q, files);
    if (pick && (!open || open.sum.key !== pick.key)) { sumRun(pick, files); return true; }
    if (pick && open) { sumAgainTurn(open); return true; }
    if (!open) {
      if (files.length || SUM_PAPER.test(q)) { sumAskWhich(); return true; }
      return false;
    }
    /* "summarise the conversation so far" is not this feature's ask, even
       in a conversation that has a contract summary in it */
    if (!SUM_PAPER.test(q) && !/\b(it|this|that|again)\b/i.test(q)) return false;
    sumAgainTurn(open);
    return true;
  }
  if (!open) return false;
  if (!SUM_Q.test(q)) return false;
  /* A question in a conversation that has a summary is not automatically a
     question about the contract — "how are we doing on adoption" is not.
     It has to name the paper, ask the one thing a summary is for, or share
     a word with a clause; otherwise botTurn should have it. */
  const F = open.sum;
  const near = SUM_RISK.test(q) || SUM_PAPER.test(q)
    || SUM_TOPICS.some(([on]) => on.test(q))
    || !!sumFind(F, q);
  if (!near) return false;
  sumAskTurn(open, q);
  return true;
}
