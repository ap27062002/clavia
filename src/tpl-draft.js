/* ==================================================================
   Drafting from the template library, in the conversation.

   The Templates module already does the hard half of this: a template
   with its blanks named, a page where they are filled by hand, from a
   Vault file or from a sentence about the deal (mxReadDeal), and a
   Create Draft button that turns the filled template into a document
   with a conversation beside it. What it does not do is answer in that
   conversation — the first message promises "tell me what to change"
   and nothing was listening. This is the layer that listens.

   Two ways in, which are the same way twice:
     from the template   — the blanks are open, and the conversation
                           fills them a sentence at a time
     from a precedent    — a signed agreement is handed over, and the
                           draft is taken from what we actually agreed
                           last time rather than from our standard words

   Every fill lands as a tracked change, not as text that silently
   appeared: docRedline already strikes the old words and sets out the
   new ones under one id, and renderDoc already has the bar that accepts
   or rejects them. A blank being filled is exactly that shape — the
   bracketed placeholder goes, the value comes in — so nothing new was
   needed to show it.

   The part that is genuinely new is the comparison. A precedent carries
   terms that have no blank waiting for them: Harbor's affiliates inside
   the need-to-know group, their twenty-four-month disclosure window.
   Those are carried onto the template's own wording as tracked changes
   of their own, and each one is checked against the playbook position
   that covers it, so the answer can say whether what we signed last
   time is our preferred position, our fallback, or past our walkaway —
   rather than only that the two documents differ.

   Loaded after review.js (redlineOf) and before app.js: nothing here
   runs at load, so the globals it reads are all in place by call time.
================================================================== */

/* ── the signed NDAs there is nothing to draft from without ───────
   Everything else this file touches is shipped fixture. The Vault has
   signed MSAs, supplier paper and DPAs, but no signed NDA with facts
   read out of it, so flow B had nothing to take a draft from.

   Two, not one, and deliberately: Trellis sits on the playbook's
   preferred position for a confidentiality period and Harbor sits at
   the far edge of its fallback. One precedent would make the playbook
   line decoration; two make it a reading. */
const TPL_PREC_SEED = {
  id: 'signed-ndas', name: 'Signed NDAs', source: 'imanage',
  where: 'Workspaces · Legal · NDAs', owner: 'Roger Bennett',
  updated: '2026-10-02T09:15:00',
  description: 'Every mutual NDA we have signed, kept so the next one can be drafted from the last rather than from the template.',
  files: [
    { id: 'nda-harbor', name: 'Harbor Retail plc — Mutual NDA (signed).pdf',
      kind: 'Agreement', size: '7 pages', by: 'Roger Bennett', added: '2026-06-11T10:00:00',
      /* which template it was signed on, so a draft can be started from
         the precedent alone without being asked which paper it was */
      tpl: 'mutual-nda',
      summary: 'Signed with Harbor Retail last June on our Mutual NDA, with three changes: a five-year confidentiality period, their affiliates inside the need-to-know group, and a twenty-four-month disclosure window.',
      facts: {
        Counterparty: 'Harbor Retail plc',
        'Counterparty address': '6 Prince’s Dock, Liverpool L3 0AA',
        'Governing law': 'England and Wales',
        Purpose: 'evaluating a commercial partnership',
        'Confidentiality period': 'five years from each disclosure',
        'Our signatory': 'Roger Bennett, General Counsel',
        Representatives: 'employees, advisers and Affiliates who need to know it',
        'Disclosure window': 'the twenty-four months after the Effective date',
      } },
    { id: 'nda-trellis', name: 'Trellis — Mutual NDA (signed).pdf',
      kind: 'Agreement', size: '6 pages', by: 'Grace Coleman', added: '2026-08-04T10:00:00',
      tpl: 'mutual-nda',
      summary: 'Signed with Trellis in August on our standard Mutual NDA: three years, Delaware law, and one change — information comes back within 30 days of a request.',
      facts: {
        Counterparty: 'Trellis',
        'Counterparty address': '1209 Orange Street, Wilmington, Delaware',
        'Governing law': 'Delaware',
        Purpose: 'discussing a reseller arrangement',
        'Confidentiality period': 'three years from each disclosure',
        'Our signatory': 'Roger Bennett, General Counsel',
        'Return of information': 'return or destroy the other’s Confidential Information within 30 days of a request',
      } },
  ],
};

/* Added to the saved copy rather than to the seed, the way the Requests
   module adds the parts of its story that came later: a copy saved
   before this file existed takes the vault without losing anything
   anybody made, and a reseed brings it back because the flag lives on
   the data and not beside it. */
function tplPrecSeed() {
  if (typeof mxData !== 'function') return null;
  const d = mxData();
  if (d.ndaPrecV !== 1) {
    const at = d.vaults.findIndex(v => v.id === TPL_PREC_SEED.id);
    const copy = structuredClone(TPL_PREC_SEED);
    if (at >= 0) d.vaults[at] = copy; else d.vaults.unshift(copy);
    d.ndaPrecV = 1;
    save();
  }
  return d;
}

/* which playbook has our positions on a given template's paper */
const TPL_PB = { 'mutual-nda': 'nda', 'one-way-nda': 'nda', 'msa-short': 'saas', dpa: 'dpa', reseller: 'saas' };

/* ── what a precedent says, and where it goes ─────────────────────
   Two readings of the same facts. The first is the blanks: a fact that
   answers a named field goes into it like any other value. Only what
   the document actually states — a guessed term in a contract is worse
   than a bracket somebody has to fill. Dates are not read across on
   purpose: the date we signed with Harbor is not the date of this one. */
const TPL_FROM_FACT = [
  [/^(counterparty|customer|supplier|recipient|reseller)$/, F => F.Counterparty],
  [/^counterparty_address$/, F => F['Counterparty address']],
  [/^governing_law$/, F => F['Governing law']],
  [/^purpose$/, F => F.Purpose],
  [/^signatory$/, F => F['Our signatory']],
  [/^term_years$/, F => tplSpan(F['Confidentiality period'])],
  [/^(initial_term|term)$/, F => (/^\d+ months$/.test(F.Term || '') ? F.Term : null)],
  [/^cap_months$/, F => (/^(\d+) months/.exec(F['Liability cap'] || '') || [])[1]],
  [/^payment_days$/, F => (/(\d+)/.exec(F.Payment || '') || [])[1]],
  [/^seats$/, F => F.Seats],
];

/* The second reading, and the one that is new. A term we negotiated last
   time that has no blank waiting for it still contradicts something our
   template says in its own fixed words. Each row names the phrase of
   ours it stands against, and the fact's own wording is what goes in its
   place — so the carry is the precedent talking, not this file. */
const TPL_CARRY = [
  { fact: 'Representatives', pb: 'representatives', what: 'who the information can be shown to',
    find: /employees and advisers who need to know it/ },
  { fact: 'Disclosure window', pb: null, what: 'how long disclosures stay covered',
    find: /the twelve months after the Effective date/ },
  { fact: 'Return of information', pb: 'return', what: 'when information comes back',
    find: /return or destroy the other[’']s Confidential Information/ },
];

/* per-draft state: which template it came from, and which of its tracked
   changes were carried off a precedent rather than filled into a blank —
   kept so one reply can put exactly those back without touching the
   blanks somebody has already answered */
const TPL_DRAFT = {};
const tplState = (a) => (TPL_DRAFT[a.id] ||= { tplId: a.tplId, carried: [], prec: null });

/* ── the words ────────────────────────────────────────────────────
   "five years from each disclosure" is a fact about a signed agreement;
   "five years" is what goes in a blank labelled Confidentiality period.
   The span is the front of it, and the number is read off the same
   words the Templates module already reads numbers off. */
const tplSpan = (s) => (/^([\w-]+\s+(?:year|month)s?)\b/i.exec(String(s || '')) || [])[1] || null;
function tplYears(s) {
  const m = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:\(\d+\)\s*)?years?\b/i.exec(String(s || ''));
  if (!m) return null;
  return /^\d+$/.test(m[1]) ? +m[1] : (typeof MX_NUM_W !== 'undefined' ? MX_NUM_W[m[1].toLowerCase()] : null) || null;
}
const tplEsc = (x) => (typeof docEsc === 'function' ? docEsc(x) : String(x));
const tplQ = (x) => '“' + x + '”';

/* a block as it would read if every change waiting on an answer were
   accepted — which is how a blank that has just been filled should be
   counted, since the words are in the document and somebody only has to
   say yes */
function tplAccepted(v) {
  const d = document.createElement('div');
  d.innerHTML = String(v);
  for (const el of [...d.querySelectorAll('del[data-rl]')]) el.remove();
  return d.textContent;
}
const tplBusy = (b) => typeof b.v === 'string' && b.v.includes('data-rl');

/* the blanks still bracketed in the draft as it stands */
function tplOpen(a, t) {
  const blocks = (typeof bodyOf === 'function' && bodyOf(a, 'blocks')) || [];
  const said = blocks.map(b => (typeof b.v === 'string' ? tplAccepted(b.v) : '')).join('\n');
  return t.fields.filter(f => said.includes('[' + f.label + ']'));
}
/* how the open ones are named in an answer: bolded() is the only markup
   an answer takes, so the blank is named as it appears on the page and
   the template's own example says what belongs in it */
const tplList = (fs) => fs.map(f => `**[${f.label}]**${f.hint ? ' — e.g. ' + f.hint : ''}`).join('\n');

/* ── proposing the changes ────────────────────────────────────────
   One edit per block: the paragraph as it reads now, with every blank
   this pass can answer replaced. docRedline does the rest — it runs
   redlineOf over the two and emits the struck words and the new ones
   under one id, which is already what the document knows how to show.

   A block that still carries an unanswered change is left alone. Diffing
   against words that are themselves half struck through produces a
   redline of a redline, and more to the point the reader has not yet
   said what they want to happen to the first one. */
function tplFill(a, t, got, meta, rows = []) {
  const blocks = (typeof bodyOf === 'function' && bodyOf(a, 'blocks')) || [];
  const edits = [], put = [], held = [], carried = [];
  blocks.forEach((b, i) => {
    if (typeof b.v !== 'string') return;
    const now = docPlain(b.v);
    let to = now;
    /* A carried term goes in before the blanks of the same paragraph, while
       the words are still the ones the template wrote. Harbor's disclosure
       window and the confidentiality period are both in the Term paragraph,
       so done the other way round the second of them would be dropped for
       landing on a block that the first had already marked up. */
    for (const row of rows) {
      if (row.done || tplBusy(b) || !row.find.test(to)) continue;
      const ours = row.find.exec(to)[0];
      row.done = true;
      if (ours === row.theirs) continue;
      to = to.replace(row.find, row.theirs);
      row.ours = ours;
      carried.push(row);
    }
    for (const f of t.fields) {
      const val = got[f.key];
      const mark = '[' + f.label + ']';
      if (!val || !to.includes(mark)) continue;
      if (tplBusy(b)) { if (!held.includes(f.label)) held.push(f.label); continue; }
      to = to.split(mark).join(String(val).trim());
      if (!put.some(x => x.key === f.key)) put.push({ key: f.key, label: f.label, val: String(val).trim() });
    }
    if (to !== now) edits.push({ i, to });
  });
  const out = tplRedline(a, edits, meta);
  out.carried = carried;
  /* Which of the new changes are carried wording rather than answered
     blanks, told apart by the struck words: a blank is the only thing on
     the page that is written in square brackets, so a change that strikes
     one is a fill and everything else came off the precedent. */
  out.carriedIds = carried.length ? out.ids.filter(id => !tplStrikesBlank(a, id)) : [];
  /* the draft is called after whoever it is with, the moment that blank
     is answered — a document named "Mutual NDA" in a list of drafts is
     no help to anybody */
  const who = put.find(x => /^(counterparty|customer|recipient|supplier|reseller)$/.test(x.key));
  if (who) a.name = `${t.name || 'Draft'} — ${who.val}`;
  return { ...out, put, held };
}

/* whether a change strikes a bracketed blank, which is what tells a blank
   being answered apart from a wording carried off a precedent */
function tplStrikesBlank(a, id) {
  for (const b of bodyOf(a, 'blocks') || []) {
    if (typeof b.v !== 'string' || !b.v.includes('data-rl')) continue;
    const d = document.createElement('div');
    d.innerHTML = b.v;
    for (const el of d.querySelectorAll('del[data-rl]')) {
      if (el.dataset.rl === id && el.textContent.includes('[')) return true;
    }
  }
  return false;
}

/* docRedline returns a version number; which changes it made is what
   this file needs, so the pending ids are read either side of it */
function tplRedline(a, edits, meta) {
  if (!edits.length) return { n: null, ids: [] };
  const was = new Set(docPending(a));
  const n = docRedline(a, edits, meta);
  return { n, ids: n ? docPending(a).filter(id => !was.has(id)) : [] };
}

/* A change carried off a precedent is not the same act as a blank being
   filled, and the reader is entitled to see which is which before
   answering either. docRedline sets only the id, so the mark is put on
   afterwards — the block already holds markup, and renderDoc writes it
   straight back out. */
function tplMarkCarry(a, ids) {
  if (!ids.length) return;
  for (const b of (bodyOf(a, 'blocks') || [])) {
    if (!tplBusy(b)) continue;
    const d = document.createElement('div');
    d.innerHTML = b.v;
    let hit = false;
    for (const el of d.querySelectorAll('ins[data-rl], del[data-rl]')) {
      if (!ids.includes(el.dataset.rl)) continue;
      el.classList.add('tpld-carry');
      hit = true;
    }
    if (hit) b.v = d.innerHTML;
  }
}

/* ── the playbook, on what the precedent changed ──────────────────
   A confidentiality period is a number, and the playbook states its
   positions on it as numbers in its own prose, so they are read out of
   that prose rather than restated here. Read, not inferred: if the
   clause does not say, nothing is claimed. */
function tplClause(t, id) {
  const pb = typeof pbFind === 'function' ? pbFind(TPL_PB[t.id] || '') : null;
  return pb ? { pb, c: (pb.clauses || []).find(x => x.id === id) || null } : { pb: null, c: null };
}
function tplTermCheck(t, val) {
  const { c } = tplClause(t, 'term');
  const n = tplYears(val);
  if (!c || !n) return null;
  const pref = tplYears(c.preferred);
  const walk = tplYears((/shorter than\s+[^,.;]*/i.exec(c.walkaway || '') || [])[0]);
  const span = /between\s+(\S+)\s+and\s+(\S+)\s+years?/i.exec(c.fallback || '');
  const low = span ? tplYears(span[1] + ' years') : null, high = span ? tplYears(span[2] + ' years') : null;
  const name = `**${c.topic}**`;
  const yrs = (k) => `${k} year${k === 1 ? '' : 's'}`;
  const says = `our preferred is ${pref ? yrs(pref) : 'not stated'}${walk ? `, and we walk away under ${yrs(walk)}` : ''}`;
  if (walk && n < walk) return `${val} is under our walkaway on ${name} — ${says}. That one should not go out without a conversation.`;
  if (pref && n === pref) return `${val} is our preferred position on ${name}, so there is nothing to flag.`;
  if (low && high && n >= low && n <= high) {
    return `${val} is inside the fallback on ${name} — ${says}. Worth a second look before it goes out, but it is not off-playbook.`;
  }
  return `${val} is outside both our preferred and our fallback on ${name} — ${says}.`;
}

/* For a carried wording there is no number to compare, so what is
   compared is the words themselves: the ones the precedent puts in that
   our template does not have — redlineOf already separates them out —
   against the three positions the clause states in its own prose.
   Whichever position names those words is the one this sits on; on a
   tie the more cautious reading wins. */
function tplPbWhere(c, ours, theirs) {
  if (!c || typeof redlineOf !== 'function') return null;
  const ins = redlineOf(ours, theirs).filter(s => s[0] === 'ins').map(s => s[1]).join(' ').toLowerCase();
  const words = [...new Set(ins.match(/[a-z]{4,}/g) || [])];
  if (!words.length) return null;
  const score = (k) => { const s = String(c[k] || '').toLowerCase(); return words.filter(w => s.includes(w)).length; };
  const best = ['walkaway', 'fallback', 'preferred'].map(k => [k, score(k)]).sort((x, y) => y[1] - x[1])[0];
  return best[1] ? best[0] : null;
}
const TPL_WHERE_SAYS = {
  preferred: 'our preferred position',
  fallback: 'inside our fallback',
  walkaway: 'past our walkaway',
};

/* ── which conversation this is ───────────────────────────────────
   A draft is a doc artifact that knows which template it came from. The
   conversation is about it either because it is named in the
   conversation's own id — the Templates module opens the session as
   tpl-ses-<draft> — or because a message in it carries the artifact. */
function tplDraftOn() {
  if (typeof thread === 'undefined' || !thread) return null;
  const ids = [];
  if (thread.id?.startsWith('tpl-ses-')) ids.push(thread.id.slice(8));
  for (const m of thread.messages || []) if (m.artifact) ids.unshift(m.artifact);
  for (const id of ids) {
    const a = ARTIFACTS[id];
    if (a?.kind === 'doc' && a.tplId && mxTemplate(a.tplId)) return a;
  }
  return null;
}

/* ── starting one ─────────────────────────────────────────────────
   The template's words with its blanks left bracketed, as the three
   kinds of block a doc artifact is made of, and a conversation beside
   it. Anything already typed on the template's own Fill in page is
   honoured rather than thrown away. */
function tplDraftStart(t, prec = null, deal = '', said = '') {
  if (!t) return;
  tplPrecSeed();
  const vals = (typeof MX !== 'undefined' && MX.templates?.values?.[t.id]) || {};
  const txt = (s) => tplEsc(String(s).replace(/\{\{([a-z0-9_]+)\}\}/gi,
    (_, k) => vals[k]?.trim() || `[${mxFieldLabel(t, k)}]`));
  const blocks = [{ t: 'h1', v: tplEsc(t.name || 'Untitled') },
    ...t.body.filter(b => (b.h ?? b.p).trim())
      .map(b => (b.h !== undefined ? { t: 'h2', v: txt(b.h) } : { t: 'p', v: txt(b.p) }))];
  const who = vals.counterparty?.trim();
  const id = pbUid('draft');
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const a = defineArtifact({ id, kind: 'doc', ext: 'docx', tplId: t.id, sub: 'From template',
    name: `${t.name || 'Draft'}${who ? ' — ' + who : ''}`,
    versions: [{ name: 'First draft', when: 'Today · ' + now, by: 'Assistant', blocks }] });
  TPL_DRAFT[id] = { tplId: t.id, carried: [], prec: prec?.name || null };
  t.used++; t.updated = mxNow(); save();

  const article = /^[aeiou]/i.test(t.name || '') ? 'an' : 'a';
  openSession({ id: 'tpl-ses-' + id, artifact: a.id, label: a.name, meta: 'now',
    people: [{ name: USER.name, online: true, owner: true }],
    messages: [{ role: 'user', text: said.trim()
      || `Draft ${article} ${t.name}${prec ? ` from the ${prec.name}` : ''}.` }] });
  queueMicrotask(() => openArtifact(a));

  if (prec) return tplDraftPrecedent(a, prec);
  const got = deal.trim() ? mxReadDeal(t, deal) : {};
  return tplDraftFirst(a, t, got);
}

/* the opening answer: what the draft is, whatever the opening sentence
   already said, and what is still bracketed */
function tplDraftFirst(a, t, got) {
  const steps = [{ source: 'template', query: `Used the ${t.name} template`,
    count: mxPlural(t.fields.length, 'blank') }];
  if (Object.keys(got).length) steps.push({ source: 'think', query: 'Read the deal against the blanks' });
  return tplTurn(steps, () => {
    const r = Object.keys(got).length ? tplFill(a, t, got, { name: 'Filled from the brief' }) : null;
    const open = tplOpen(a, t);
    const term = r?.put.find(x => x.key === 'term_years');
    const head = r?.put.length
      ? `Here is the draft. ${tplSaid(r)} — **v${r.n}**, so each one is struck and set out where it belongs and you can take them one at a time.`
      : `Here is the draft, straight off the ${t.name} template. Nothing is filled in yet — the blanks are in square brackets.`;
    return {
      artifact: a.id,
      count: r?.n ? 'Version ' + r.n : null,
      text: [head, term ? tplTermCheck(t, term.val) : null, tplLeftSays(open),
        'Tell me the deal in a sentence, or hand me one we have already signed, and I will fill what it says.']
        .filter(Boolean).join('\n\n'),
      suggest: tplSuggest(a, t, open),
    };
  });
}

/* ── filling it in by conversation ────────────────────────────────
   Four asks, in the order that one beats another: a precedent handed
   over decides the whole draft, so it is read first; a reply about what
   to keep is about changes already on the page; a question about one
   blank is a question, not a value; and anything else is read as a
   sentence about the deal.

   Nothing matched is not an answer. It falls through to the document's
   own turn — soften this, tighten that, change X to Y — which already
   works on any doc artifact and should keep working on this one. */
const TPL_LEFT = /\b(?:what(?:'s| is| are)?\s+(?:still\s+)?(?:left|missing|outstanding|open)|still to fill|what else|anything (?:else|left)|which blanks|what do you (?:still )?need)\b/i;
const TPL_KEEP = /\b(?:keep|stick (?:with|to)|revert to|go back to|leave|use)\b[^.]{0,30}\b(?:template|standard|our own|usual)\b|\breject (?:the )?(?:carried|precedent|their)\b/i;
const TPL_ASK1 = /\bwhat (?:should|goes in|do you want for)\s+(?:the\s+)?(.+?)\s*(?:be|go)?\s*\??$/i;
const TPL_PREC_CUE = /\b(?:precedent|signed|last time|previous|earlier|the one we did|take (?:the|its) terms|based on|same as|from the)\b/i;

function tplDraftTurn(prompt, files = []) {
  if (typeof mxData !== 'function' || typeof docRedline !== 'function') return false;
  tplPrecSeed();
  const a = tplDraftOn();
  if (!a) return tplDraftOpen(prompt, files);
  const t = mxTemplate(a.tplId);
  if (!t) return false;
  const q = String(prompt || '').trim();
  const st = tplState(a);

  /* a precedent handed over or named */
  const prec = tplPrecFind(q, files);
  if (prec) { tplDraftPrecedent(a, prec); return true; }

  /* the changes carried off a precedent, put back */
  if (TPL_KEEP.test(q) && st.carried.length) { tplDraftKeep(a, t); return true; }

  /* a question about one blank, which is not a value for it */
  const named = TPL_ASK1.exec(q);
  const field = named && tplField(t, named[1]);
  if (field) { tplDraftField(a, t, field); return true; }

  /* what is left */
  if (TPL_LEFT.test(q)) { tplDraftLeft(a, t); return true; }

  /* a sentence about the deal */
  const got = mxReadDeal(t, q);
  if (Object.keys(got).length) { tplDraftSentence(a, t, got); return true; }

  return false;
}

/* The composer can put a template in the box, and the message arrives
   with the pill's own label in front of it — "Mutual NDA template ·
   Harbor Retail plc — Mutual NDA (signed).pdf — three years, English
   law". So the opening is read off the prompt: no plumbing, and a
   message that names a template and asks for a draft works typed out
   by hand as well. */
function tplDraftOpen(prompt, files) {
  if (typeof mxData !== 'function') return false;
  const q = String(prompt || '').trim();
  const cut = q.indexOf(' — ');
  const head = cut < 0 ? q : q.slice(0, cut);
  const tail = cut < 0 ? '' : q.slice(cut + 3);
  const live = mxData().templates.filter(x => x.status === 'live' && x.fields?.length);
  const pills = head.split(' · ').map(s => s.trim()).filter(Boolean);
  const byPill = pills.map(p => live.find(x => p.toLowerCase() === (x.name + ' template').toLowerCase())).find(Boolean);
  /* typed out rather than picked: it has to name a template and ask for
     a draft, or this would answer every message that mentions an NDA */
  const asked = /\b(draft|fill (?:it )?(?:in|out)|prepare|start|make me|write me)\b/i.test(q) && /\btemplate\b/i.test(q);
  const byName = asked ? live.filter(x => q.toLowerCase().includes(x.name.toLowerCase()))
    .sort((x, y) => y.name.length - x.name.length)[0] : null;
  const t = byPill || byName;
  if (!t) return false;
  /* a precedent put in the box with the template is a pill of its own, so
     the pills are read as attachments and the words after them as the deal */
  const prec = tplPrecFind(tail, [...files, ...pills.map(n => ({ name: n }))]);
  tplDraftStart(t, prec, byPill ? tail : q, q);
  return true;
}

/* ── a precedent, named or attached ───────────────────────────────
   Only the Vault files we have actually read facts out of. An uploaded
   file we know nothing about is not a precedent this can draft from,
   and pretending otherwise would be inventing terms. */
function tplPrecAll() {
  if (typeof mxData !== 'function') return [];
  return mxData().vaults.flatMap(v => (v.files || []).filter(f => f.facts).map(f => ({ f, v })));
}
/* what a file is called in a sentence: the counterparty it is with, and
   the front of its own name */
const tplPrecNames = (f) => [f.facts.Counterparty, f.name, f.name.split(/\s+[—-]\s+|\s*\(/)[0]]
  .filter(Boolean).map(s => s.toLowerCase());

function tplPrecFind(text, files = []) {
  const all = tplPrecAll();
  if (!all.length) return null;
  /* an attachment is its own cue — it was handed over on purpose */
  for (const att of files) {
    const n = String(att?.name || '').toLowerCase();
    if (!n) continue;
    const hit = all.find(x => x.f.name.toLowerCase() === n || tplPrecNames(x.f).some(s => s.length > 3 && n.includes(s)));
    if (hit) return hit.f;
  }
  /* named in the sentence instead: the name alone is not enough, because
     "an NDA with Harbor Retail" is a counterparty and not a precedent.
     Something has to say it is one we already have. */
  const q = String(text || '').toLowerCase();
  if (!q || !TPL_PREC_CUE.test(q)) return null;
  const hit = all.find(x => tplPrecNames(x.f).some(s => s.length > 3 && q.includes(s)));
  return hit ? hit.f : null;
}

/* ── flow B: the draft taken from the precedent ───────────────────
   Two passes over the same facts, and they are different acts. The
   blanks are filled from what the precedent states. Then the terms that
   have no blank to go in are carried onto our own wording, each checked
   against the playbook clause that covers it, so the answer says where
   last time's deal sits rather than only that it is not this one. */
function tplDraftPrecedent(a, file) {
  const t = mxTemplate(a.tplId);
  if (!t || !file?.facts) return false;
  const F = file.facts;
  const st = tplState(a);
  st.prec = file.name;
  const steps = [
    { source: 'internal', query: `Read ${file.name}`,
      rows: Object.entries(F).slice(0, 6).map(([k, v]) => ({ title: `${k}: ${v}`, meta: 'signed' })) },
    { source: 'template', query: `Matched it to the blanks in ${t.name}` },
  ];
  const { pb } = tplClause(t, 'term');
  if (pb) steps.push({ source: 'playbook', query: `Checked what it changes against the ${pb.name} playbook` });

  return tplTurn(steps, () => {
    /* the blanks it answers */
    const got = {};
    for (const f of t.fields) {
      const read = TPL_FROM_FACT.find(([re]) => re.test(f.key));
      const val = read ? read[1](F) : null;
      if (val) got[f.key] = val;
    }
    /* and the terms it negotiated that no blank was waiting for, which go
       in alongside them rather than in a version of their own */
    const rows = TPL_CARRY.filter(row => F[row.fact]).map(row => ({ ...row, theirs: F[row.fact] }));
    const r = tplFill(a, t, got, { name: `Drafted from ${file.name}` }, rows);

    const notes = r.carried.map((row) => {
      const { c } = tplClause(t, row.pb || '');
      const where = tplPbWhere(c, row.ours, row.theirs);
      return `**${row.what[0].toUpperCase() + row.what.slice(1)}** — they had ${tplQ(row.theirs)} where our template says ${tplQ(row.ours)}. `
        + (c && where ? `That is ${TPL_WHERE_SAYS[where]} on **${c.topic}**.`
          : 'The playbook has no position on it, so it is a judgement call.');
    });
    tplMarkCarry(a, r.carriedIds);
    st.carried = [...st.carried, ...r.carriedIds];

    const open = tplOpen(a, t);
    const term = r.put.find(x => x.key === 'term_years');
    /* said in terms, not in tracked changes: one negotiated term can land
       as two struck phrases, and "2 terms" for one of them is a miscount */
    const got2 = r.carried.length;
    const head = r.put.length || got2
      ? `Drafted from ${file.name} rather than from the template. ${tplSaid(r)}`
        + (got2 ? `, and carried ${mxPlural(got2, 'negotiated term')} onto our own wording` : '')
        + ` — all of it as tracked changes in **v${r.n}**.`
      : `${file.name} does not state anything these blanks are waiting for, so the draft is still the template.`;
    return {
      artifact: a.id,
      count: r.n ? 'Version ' + r.n : null,
      text: [head, notes.length ? notes.join('\n\n') : null, term ? tplTermCheck(t, term.val) : null,
        tplLeftSays(open),
        got2 ? 'If you would rather start from our standard words, say to keep the template wording '
          + 'where the precedent differs and I will put those back without touching the blanks.' : null]
        .filter(Boolean).join('\n\n'),
      suggest: [got2 ? 'Keep the template wording where the precedent differs' : null,
        open.length ? `What should ${open[0].label} be?` : null,
        'Check this against our playbook'].filter(Boolean),
    };
  });
}

/* ── the three shorter answers ────────────────────────────────── */
function tplDraftSentence(a, t, got) {
  return tplTurn([{ source: 'think', query: 'Read the deal against the blanks' }], () => {
    const r = tplFill(a, t, got, { name: 'Filled from the conversation' });
    const open = tplOpen(a, t);
    const term = r.put.find(x => x.key === 'term_years');
    return {
      artifact: a.id,
      count: r.n ? 'Version ' + r.n : null,
      text: [r.put.length ? `${tplSaid(r)} — **v${r.n}**.` : 'I could not place any of that against these blanks.',
        r.held.length ? `${r.held.map(l => '**[' + l + ']**').join(' and ')} already ${r.held.length > 1 ? 'have' : 'has'} a change `
          + 'waiting on the page — answer that one and I will put this in next.' : null,
        term ? tplTermCheck(t, term.val) : null, tplLeftSays(open)].filter(Boolean).join('\n\n'),
      suggest: tplSuggest(a, t, open),
    };
  });
}

function tplDraftLeft(a, t) {
  return tplTurn([{ source: 'read', query: 'Read the draft for blanks still open' }], () => {
    const open = tplOpen(a, t);
    return {
      artifact: a.id,
      count: open.length ? mxPlural(open.length, 'blank') : 'none',
      text: open.length
        ? `${mxPlural(open.length, 'blank')} still to fill, out of ${t.fields.length}. `
          + 'Each one is in square brackets in the draft, with what goes in it beside its name here:\n\n'
          + tplList(open) + '\n\nTell me any of them in a sentence and they go in as tracked changes.'
        : 'Nothing is left in brackets — every blank has an answer. '
          + 'What is still open is the tracked changes themselves, which are yours to accept or reject.',
      suggest: tplSuggest(a, t, open),
    };
  });
}

function tplDraftField(a, t, f) {
  return tplTurn([{ source: 'template', query: `Read ${f.label} in the ${t.name} template` }], () => {
    const open = tplOpen(a, t);
    const done = !open.some(x => x.key === f.key);
    return {
      artifact: a.id,
      text: done
        ? `**[${f.label}]** is already answered in the draft — the change is on the page waiting for you to accept or reject it. `
          + 'Tell me a different value and I will propose that instead.'
        : `**[${f.label}]** is ${f.hint ? `the sort of thing ${tplQ(f.hint)} is` : 'still open'} — `
          + `it appears in the draft wherever the template put it. Say what it should be and it goes in as a tracked change.`,
      suggest: tplSuggest(a, t, open),
    };
  });
}

/* Keeping our wording is rejecting exactly the carried changes. The
   blanks somebody has already answered are a different decision and are
   not touched, which is the whole reason their ids are kept apart. */
function tplDraftKeep(a, t) {
  const st = tplState(a);
  const ids = [...st.carried];
  return tplTurn([{ source: 'template', query: 'Put our own wording back where the precedent differed' }], () => {
    const live = new Set(docPending(a));
    const hit = ids.filter(id => live.has(id));
    for (const id of hit) docResolve(a, id, 'reject');
    st.carried = [];
    const open = tplOpen(a, t);
    return {
      artifact: a.id,
      count: hit.length ? mxPlural(hit.length, 'change') + ' rejected' : 'nothing to do',
      text: [hit.length
        ? `Put our own words back in ${mxPlural(hit.length, 'place')} — the carried ${hit.length > 1 ? 'terms are' : 'term is'} `
          + `rejected, and ${st.prec ? st.prec + ' is' : 'the precedent is'} no longer driving the wording.`
        : 'There are no carried terms left on the page — they have all been answered already.',
        'The filled blanks are untouched: those were your answers, not the precedent’s.',
        tplLeftSays(open)].filter(Boolean).join('\n\n'),
      suggest: tplSuggest(a, t, open),
    };
  });
}

/* ── how a fill is said ──────────────────────────────────────── */
function tplSaid(r) {
  if (!r?.put.length) return 'Nothing went in';
  const names = r.put.map(x => `**[${x.label}]**`);
  const list = names.length < 3 ? names.join(' and ')
    : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  return `Filled ${list} as tracked ${r.put.length > 1 ? 'changes' : 'a change'}`;
}
const tplLeftSays = (open) => (open.length
  ? `Still to fill: ${open.map(f => '**[' + f.label + ']**').join(', ')}.`
  : 'Every blank is answered now.');

/* where to go next: the next blank, a precedent if we have one that
   matches this paper, and the playbook check, which review.js answers */
function tplSuggest(a, t, open) {
  const st = tplState(a);
  const prec = tplPrecAll().find(x => x.f.tpl === t.id && x.f.name !== st.prec);
  return [open.length ? `What should ${open[0].label} be?` : 'Read it through for anything that looks unusual',
    prec ? `Take the terms from the ${prec.f.facts.Counterparty} NDA we signed` : null,
    'Check this against our playbook'].filter(Boolean).slice(0, 3);
}

/* a field asked for by name, matched on the label the draft shows */
function tplField(t, said) {
  const q = String(said || '').toLowerCase().replace(/^the\s+/, '').replace(/[[\]]/g, '').trim();
  if (q.length < 3) return null;
  return t.fields.find(f => f.label.toLowerCase() === q)
    || t.fields.find(f => f.label.toLowerCase().includes(q) || q.includes(f.label.toLowerCase()))
    || null;
}

/* ── the turn ─────────────────────────────────────────────────────
   The same shape templateTurn uses: the steps run, and the work happens
   when the last of them lands, so the trace is a record of what was
   done and not an animation played over a result that already existed. */
function tplTurn(steps, done) {
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();
  let at = 320;
  steps.forEach((s, i) => {
    setTimeout(() => { m.steps.push({ ...s, rows: s.rows || [], running: true }); renderBot(m); }, at);
    at += 620;
    setTimeout(() => { Object.assign(m.steps[i], s, { running: false }); renderBot(m); }, at);
    at += 180;
  });
  setTimeout(() => {
    m.thinking = false;
    m.cites = null;
    if (m.traceOpen == null) m.traceOpen = false;
    const out = done() || {};
    m.text = out.text || '';
    if (out.artifact) m.artifact = out.artifact;
    if (out.suggest?.length) m.suggest = out.suggest;
    if (out.count && m.steps.length) m.steps[m.steps.length - 1].count = out.count;
    renderBot(m);
    const art = out.artifact && ARTIFACTS[out.artifact];
    if (art && document.getElementById('main')?.dataset.artifact === 'open') openArtifact(art);
  }, at + 280);
  return true;
}

/* ── starting it from a list ──────────────────────────────────────
   Either flow, without a pill: pick a template and the conversation
   fills it, or pick one we have signed and the draft is taken from that
   instead. With a draft already open the same button picks a precedent
   for it, because that is the only thing left to choose. */
function tplDraftPick() {
  tplPrecSeed();
  const open = tplDraftOn();
  if (open) return tplPrecPick(open);
  const live = mxData().templates.filter(x => x.status === 'live' && x.fields?.length);
  const precs = tplPrecAll().filter(x => x.f.tpl && mxTemplate(x.f.tpl));
  mxPick({ title: 'Draft in this conversation', sub: 'Clavia fills the blanks in as you tell it the deal',
    one: true, action: 'Draft',
    groups: [
      { label: 'From a template', items: live.map(t => ({ id: 'tpl|' + t.id, label: t.name, sub: mxPlural(t.fields.length, 'blank') })) },
      { label: 'From one we have signed', items: precs.map(x => ({ id: 'prec|' + x.v.id + '|' + x.f.id, label: x.f.name, sub: x.v.name })) },
    ],
    onDone: ([id]) => {
      const [kind, a1, a2] = id.split('|');
      if (kind === 'tpl') return tplDraftStart(mxTemplate(a1));
      const f = mxVault(a1)?.files.find(x => x.id === a2);
      if (f) tplDraftStart(mxTemplate(f.tpl), f);
    } });
}

function tplPrecPick(a) {
  const t = mxTemplate(a.tplId);
  const groups = mxData().vaults.map(v => ({ label: v.name,
    items: (v.files || []).filter(f => f.facts).map(f => ({ id: v.id + '|' + f.id, label: f.name, sub: f.size })) }));
  mxPick({ title: 'Draft from one we have signed', sub: 'Clavia takes the terms from it, as tracked changes',
    one: true, action: 'Use', groups,
    onDone: ([id]) => {
      const [vid, fid] = id.split('|');
      const f = mxVault(vid)?.files.find(x => x.id === fid);
      if (!f || !t) return;
      pbToast(`Reading ${f.name}`);
      tplDraftPrecedent(a, f);
    } });
}

/* ── the one thing on screen that is this file's own ──────────────
   A change carried off a precedent and a blank being filled are both
   tracked changes, and the document styles them both the same. They are
   not the same decision — one is a term somebody negotiated last year
   and the other is an answer given a minute ago — so the carried ones
   are marked apart. Quietly: a dotted underline rather than a solid
   one, on the document's own redline colours. */
(function tplDraftCSS() {
  const id = 'tpld-css';
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = `
.doc-page ins.tpld-carry { text-decoration-style: dotted; text-decoration-thickness: 2px;
  background: var(--tpld-carry-bg, #F3EFE3); color: var(--doc-ins, #2E7D4F); }
.doc-page del.tpld-carry { text-decoration-style: dotted; opacity: .8; }`;
  document.head.append(el);
})();
