/* ------------------------------------------------------------------
   A document somebody handed over, edited through the conversation.

   Two halves of this already worked, in places that never met. The
   chat could already turn a plain-words ask into tracked changes on a
   doc artifact (botTurn → docEditPlan → docRedline), and the review
   workspace could already propose a change and wait to be told to
   apply it — but only against a request that carries a playbook
   review, and only for playbook positions.

   What was missing was the step between them. botTurn applies
   immediately, so there was never a list to read before the page
   moved; and nothing turned a handed-over file into a document at
   all, so there was nothing to read it against.

   So this file is two thin things and no third copy of anything:
   a bridge from a file pill to a doc artifact, and a proposal layer
   that holds changes in the chat until somebody says yes. The diff is
   redlineOf. The tracked changes are docRedline. The versions are
   bumpVersion. The comments go in a.comments, where commentLayer
   already puts them. Nothing here writes markup that artifacts.js
   already knows how to write.
------------------------------------------------------------------ */

/* ── which contract a filename is ─────────────────────────────
   A name is all a file pill carries, so the name is what decides what
   opens. The first three of these are the mappings modules-data.js
   already makes between a request's files and its review; the rest
   catch the shapes of the other two. Anything unrecognised returns
   null and is said so: a file picked off a real desktop cannot be
   opened here, and opening somebody's lease as a confidentiality
   agreement under the words "as handed over" is worse than saying
   plainly that the bytes were never read. */
const DU_FILES = [
  [/acme[\s\S]*?\bsow\b|implementation\s+sow/i, 'acme-sow'],
  [/acme[\s\S]*?\bmsa\b|\bmsa\b/i,              'acme-msa'],
  [/kestrel|supplier\s+agreement/i,             'kestrel'],
  [/harbor|\bdpa\b|data\s+processing/i,         'harbor-dpa'],
  [/birch|\bnda\b|non-?disclosure|confidentialit/i, 'birch-nda'],
];
const DU_REVIEW = (name) => (DU_FILES.find(([re]) => re.test(name)) || [, null])[1];

/* a filename inside what was asked, for the Home box: it glues the pill's
   label to the front of the prompt rather than handing the file over, so
   the name has to be read back out of the sentence */
const DU_EXT = '(?:docx?|pdf|txt|md|rtf|odt)';
function duFileIn(s) {
  const q = String(s || '');
  return (new RegExp('[A-Z][^\\n—]*?\\.' + DU_EXT + '\\b').exec(q)
       || new RegExp('\\S+\\.' + DU_EXT + '\\b').exec(q) || [null])[0];
}

/* the ask that means "put this in front of me", as against the asks that
   mean something about a document already open */
const DU_OPEN = /\b(open|edit|editing|redline|red-?line|mark ?up|revise|amend|work on|take a look)\b/i;

/* ── a handed-over file as a document ────────────────────────
   One h1 for the file, a line saying where it came from, then every
   clause as the heading and paragraph it already is in reviews-data.js.
   No new artifact kind: it renders as a document because it is one. */
function docUploadOpen(fname) {
  const rid = DU_REVIEW(fname);
  const rv = (typeof JV_REVIEWS !== 'undefined' && JV_REVIEWS[rid]) || null;
  if (!rv) return null;

  const clauses = rv.clauses || [];
  const title = fname.replace(new RegExp('\\.' + DU_EXT + '$', 'i'), '');
  const blocks = [{ t: 'h1', v: title, k: 'b0' },
    { t: 'meta', v: `As handed over · ${fname} · ${clauses.length} clauses`, k: 'b1' }];
  clauses.forEach((c, i) => {
    blocks.push({ t: 'h2', v: c.heading, k: 'h' + c.n });
    blocks.push({ t: 'p',  v: c.text,    k: 'c' + c.n });
  });

  /* v1 is the file as it arrived and it is somebody else's work, so it is
     not "by Assistant" the way a drafted artifact is — which is also why
     this sets up its own first version rather than calling startVersions.

     Handing the same file over twice starts again rather than piling a
     second set of changes on the first, so the seed is its own copy: if
     it shared the array with the live version, a reset would hand back
     blocks that the last run had already redlined. */
  const id = 'doc-up-' + rid;
  const first = { name: 'As handed over', when: 'Just now', by: 'You', blocks };
  const a = defineArtifact({
    id,
    kind: 'doc',
    name: title,
    ext: 'docx',
    sub: `${rv.playbook?.name || 'Contract'} · ${clauses.length} clauses`,
    blocks,
    versions: [first],
    seed: [{ ...first, blocks: blocks.map(b => ({ ...b })) }],
    vi: 0,
    comments: [],
    /* what tells this apart from the briefs and notes the chat writes
       itself: those get edited the moment you ask, this gets proposed */
    handedOver: true,
    file: fname,
    review: rid,
  });
  /* proposals made against the copy that has just been replaced point at
     clauses that no longer carry what they were read from, so they go with
     it rather than waiting to be applied to a document they never saw */
  for (let i = DU_SETS.length - 1; i >= 0; i--) if (DU_SETS[i].doc === id) DU_SETS.splice(i, 1);
  return a;
}

/* the review behind an open document, for the playbook positions */
const duReviewOf = (a) => (typeof JV_REVIEWS !== 'undefined' && JV_REVIEWS[a?.review]) || null;
const duClauses = (a) => duReviewOf(a)?.clauses || [];

/* ── where a proposal points ─────────────────────────────────
   Blocks are addressed by their own key rather than by position,
   because drafting a section moves everything under it and a pending
   proposal would otherwise point one clause too high. */
const duBlocks = (a) => bodyOf(a, 'blocks') || [];
const duIndex = (a, k) => duBlocks(a).findIndex(b => b.k === k);

const duRef = (c) => `§${c.n} ${String(c.heading || '').replace(/^\d+\.\s*/, '').replace(/\.$/, '')}`;
const duSnip = (t, n = 130) => {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};
const duPlural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
function duAnd(list) {
  const x = list.filter(Boolean);
  return x.length < 2 ? (x[0] || '') : x.slice(0, -1).join(', ') + ' and ' + x[x.length - 1];
}

/* which clause an instruction is about: the number if it names one, then
   the whole topic if it says it, then the distinctive words of a heading.

   Words that say nothing about which clause this is are dropped before the
   scoring. "Playbook" and "covered" are in there for a reason that is not
   obvious: a clause the playbook has no position on carries the literal
   topic "Not covered by the playbook", so scoring that string would let
   "align this with our playbook" land on whichever uncovered clause came
   first — the phrase names the standard to measure against, never the
   clause to measure. */
const DU_STOP = new Set(['information', 'confidential', 'agreement', 'party',
  'parties', 'clause', 'section', 'playbook', 'covered', 'position', 'wording']);
const DU_UNCOVERED = /^not covered/i;
const duTopic = (c) => (c.topic && !DU_UNCOVERED.test(c.topic)) ? c.topic : '';

function duTarget(part, a) {
  const s = String(part);
  const cs = duClauses(a);
  const num = /(?:§|\bclause\s+|\bsection\s+|\bparagraph\s+)(\d+)\b/i.exec(s);
  if (num) {
    const c = cs.find(x => String(x.n) === num[1]);
    if (c) return { c, k: 'c' + c.n };
  }
  const low = s.toLowerCase();
  const topic = cs.find(x => duTopic(x) && low.includes(duTopic(x).toLowerCase()));
  if (topic) return { c: topic, k: 'c' + topic.n };
  let best = null, score = 0;
  for (const c of cs) {
    /* the heading carries its own number, which is not a word about it */
    const src = (duTopic(c) || String(c.heading || '').replace(/^\d+\.\s*/, '')).toLowerCase();
    const words = src.match(/[a-z]{5,}/g) || [];
    const n = words.filter(w => !DU_STOP.has(w) && low.includes(w)).length;
    if (n > score) { score = n; best = c; }
  }
  return best ? { c: best, k: 'c' + best.n } : {};
}

/* ── sections this can draft ─────────────────────────────────
   The only prose in this file that is not in reviews-data.js: six
   stock clauses, because "draft a data protection section" has to
   produce a section and there is no model here to write one. Anything
   outside the six gets the compliance sentence with the topic in it,
   which is honest about being a template rather than a draft. */
const DU_CLAUSES = [
  { re: /\bai\b|artificial intelligence|machine[- ]learning|\bllm\b|\bmodel/i,
    heading: 'Use of AI Tools',
    text: 'The receiving party will not input the disclosing party’s Confidential Information into any '
        + 'artificial intelligence or machine-learning tool, or use it to train, fine-tune or evaluate any '
        + 'model, unless the tool runs within the receiving party’s own controlled environment, does not '
        + 'retain or learn from the inputs, and is bound by confidentiality obligations no less protective '
        + 'than this Agreement.' },
  { re: /data protection|personal data|privacy|\bgdpr\b|dpdp/i,
    heading: 'Data Protection',
    text: 'To the extent Confidential Information includes personal data, each party will process it only for '
        + 'the Purpose and in accordance with applicable data protection law, and will put in place technical '
        + 'and organisational measures appropriate to the risk.' },
  { re: /publicity|announce|press|marks|logo/i,
    heading: 'Publicity',
    text: 'Neither party will use the other party’s name or marks, or announce the existence of this '
        + 'Agreement or of the discussions between the parties, without the other party’s prior written '
        + 'consent.' },
  { re: /notice/i,
    heading: 'Notices',
    text: 'Notices under this Agreement will be in writing and delivered by hand, courier or email to the '
        + 'contacts each party names for the purpose, and take effect on receipt.' },
  { re: /counterpart|e-?sign|electronic signature|execution/i,
    heading: 'Counterparts',
    text: 'This Agreement may be executed in counterparts and by electronic signature, each of which is an '
        + 'original and which together form one instrument.' },
  { re: /no obligation|no commitment|no partnership|exclusivit/i,
    heading: 'No Obligation',
    text: 'Nothing in this Agreement obliges either party to proceed with any transaction, and neither party '
        + 'acquires any licence or other right in the other party’s Confidential Information except as '
        + 'expressly stated.' },
];

/* ── one instruction, one proposal ───────────────────────────
   Returns a proposal, or { err } with something to say about why not.
   Null means this was not an instruction at all, which is how an
   ordinary question about the document reaches the ordinary answer. */
const DU_VERB = '(?:revise|rewrite|change|make|update|tighten|amend|fix|soften|align|replace|strike|delete'
              + '|remove|draft|add|insert|write|comment|flag|note|query|ask|bring|concede|restore)';

function duProposeOne(part, a) {
  const s = String(part).trim();
  if (!s) return null;
  const tgt = duTarget(s, a);
  const ref = tgt.c ? duRef(tgt.c) : '';

  /* a comment: the one ask that changes nothing on the page */
  if (/\b(comment|flag|note|query|ask them|ask why)\b/i.test(s)) {
    if (!tgt.c) return { err: `I could not tell which clause to comment on in “${duSnip(s, 60)}”. `
      + 'Name it — "comment on §7", or the heading it sits under.' };
    const m = /[:–—]\s*(.+)$/.exec(s) || /\b(?:saying|asking|that)\s+(.+)$/i.exec(s);
    let text = m ? m[1].trim()
      : tgt.c.need ? `What we need here: ${tgt.c.need}`
      : 'Please explain the reasoning behind this clause.';
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.?!”]$/.test(text)) text += '.';
    return { kind: 'comment', k: tgt.k, ref, title: `Comment on ${ref}`, where: tgt.c.heading, text };
  }

  /* a section that is not there yet */
  if (/\b(draft|add|insert|write)\b/i.test(s) && /\b(section|clause|provision|paragraph)\b/i.test(s)) {
    const t = /\b(?:on|about|covering|for|regarding|dealing with)\s+(.+)$/i.exec(s)
           || /\b(?:a|an)\s+(.+?)\s+(?:section|clause|provision|paragraph)\b/i.exec(s);
    const topic = (t ? t[1] : 'general matters').replace(/[.\s]+$/, '').replace(/^(?:a|an|the)\s+/i, '');
    const tpl = DU_CLAUSES.find(x => x.re.test(topic));
    const cs = duClauses(a);
    const heading = `${cs.length + 1}. ${tpl ? tpl.heading : duTitleCase(topic)}`;
    const text = tpl ? tpl.text
      : `Each party will comply with all applicable laws and with its own policies relating to `
        + `${topic.toLowerCase()} in connection with this Agreement and the Purpose.`;
    return { kind: 'section', after: tgt.k || null, ref: 'New section',
      title: `Add a ${tpl ? tpl.heading : duTitleCase(topic)} section`, heading, text };
  }

  /* a named clause against its playbook position, which is the one kind
     of revision that already has wording written for it */
  if (tgt.c && (tgt.c.suggestions || []).length
      && /\b(revise|rewrite|amend|align|bring|fix|concede|restore|replace|delete|remove|preferred|fallback|playbook|position)\b/i.test(s)) {
    const sug = duPickPosition(tgt.c, s);
    if (sug) return duReviseProposal(a, tgt, sug);
  }

  /* what the chat already understood about a document in plain words:
     change X to Y, soften it, tighten it. docEditPlan does the reading
     and returns edits against block positions; a named clause narrows
     them to that clause rather than the whole document. */
  if (typeof docEditPlan === 'function') {
    const plan = docEditPlan(a, s);
    const named = tgt.c ? duIndex(a, tgt.k) : -1;
    let edits = plan?.edits || [];
    if (named >= 0) edits = edits.filter(e => e.i === named);
    if (edits.length) {
      const blocks = duBlocks(a);
      return edits.map(e => {
        const b = blocks[e.i];
        const c = duClauses(a).find(x => 'c' + x.n === b.k);
        return { kind: 'revise', k: b.k, ref: c ? duRef(c) : 'the document',
          title: plan.name, from: docPlain(b.v), to: e.to };
      });
    }
    if (plan && named >= 0) return { err: `${ref} does not carry the words that ask changes. `
      + 'Quote the exact text you want replaced and I will find it.' };
  }

  if (tgt.c && (tgt.c.suggestions || []).length === 0
      && /\b(revise|rewrite|amend|align|bring|fix|concede|restore)\b/i.test(s)) {
    return { err: `${ref} ${tgt.c.status === 'none' ? 'is not covered by this playbook'
      : 'already sits where the playbook wants it'}, so there is no position to move it to. `
      + 'Quote the words you want changed and I will redline those.' };
  }
  if (new RegExp('\\b' + DU_VERB + '\\b', 'i').test(s)) {
    return { err: `I am not sure what to change in “${duSnip(s, 60)}”. `
      + 'Name the clause and what you want, or quote the exact words to replace.' };
  }
  return null;
}

const duTitleCase = (s) => String(s).replace(/\b[a-z]/g, m => m.toUpperCase());

/* which of a clause's written positions the ask means */
function duPickPosition(c, s) {
  const by = (k) => (c.suggestions || []).find(x => x.key === k);
  if (/\bfallback|concede|the most we\b/i.test(s)) return by('fallback') || by('preferred');
  if (/\brestore|our own text|our paper\b/i.test(s)) return by('original') || by('preferred');
  if (/\bdelete|remove|strike\b/i.test(s)) return by('remove') || by('preferred');
  return by('preferred') || by('fallback') || (c.suggestions || [])[0];
}
const DU_POS = { preferred: 'Our preferred wording', fallback: 'Our fallback wording',
  original: 'Our own text, restored', remove: 'Delete the clause' };

function duReviseProposal(a, tgt, sug) {
  const i = duIndex(a, tgt.k);
  const from = i >= 0 ? docPlain(duBlocks(a)[i].v) : (tgt.c.text || '');
  return { kind: 'revise', k: tgt.k, ref: duRef(tgt.c),
    title: DU_POS[sug.key] || sug.label || 'A revision', from, to: sug.text || '' };
}

/* every clause the playbook disagrees with, in one list — the ask that
   proposes the whole document rather than one line of it */
function duProposeAll(a) {
  const out = [];
  for (const c of duClauses(a)) {
    if (c.status !== 'unacceptable' && c.status !== 'fallback') continue;
    const sug = duPickPosition(c, 'preferred');
    if (!sug) continue;
    const p = duReviseProposal(a, { c, k: 'c' + c.n }, sug);
    if (p.from !== p.to) out.push(p);
  }
  return out;
}

/* ── the proposals, held in the conversation ─────────────────
   Nothing reaches the page until a row is applied, which is the whole
   point: a list you can read and argue with before the document moves. */
const DU_SETS = [];
let duSeq = 0;

const duPendingIn = (a) => DU_SETS.filter(x => x.doc === a.id)
  .flatMap(x => x.items.filter(p => p.status === 'pending'));

/* ── applying one ────────────────────────────────────────────
   Three shapes, all of them handed to code that already exists:
   a revision and a drafted section become tracked changes through
   docRedline, a comment goes where commentLayer puts comments. */
function duApply(set, p, quiet) {
  const a = ARTIFACTS[set.doc];
  if (!a || !p || p.status !== 'pending') return false;

  if (p.kind === 'comment') {
    a.comments = a.comments || [];
    a.comments.push({ where: p.where || 'the document', text: p.text, by: USER.name, at: 'Just now', k: p.k });
  } else if (p.kind === 'section') {
    const after = p.after ? duIndex(a, p.after) : -1;
    const at = after >= 0 ? after + 1 : duBlocks(a).length;
    const hk = 'n' + (++duSeq), pk = 'n' + (++duSeq);
    const n = duInsert(a, at, { name: p.title }, [
      { t: 'h2', v: p.heading, k: hk }, { t: 'p', v: p.text, k: pk }]);
    if (!n) return false;
    p.k = pk; p.version = n;
  } else {
    const i = duIndex(a, p.k);
    if (i < 0) return false;
    /* two changes on the same words cannot both be tracked: the diff
       reads the block with the markup taken off, so the struck text and
       the inserted text would run together into the next redline */
    if (/data-rl=/.test(String(duBlocks(a)[i].v))) {
      if (!quiet) toast('That clause already has a change on it. Accept or reject it first.');
      return false;
    }
    const n = docRedline(a, [{ i, to: p.to }], { name: p.title });
    if (!n) return false;
    p.version = n;
  }
  p.status = 'applied';
  return true;
}

/* A new section has no block to diff against, and docRedline only writes
   into blocks that are already on the page. So the empty heading and
   paragraph are put on the current version, the words are redlined into
   them, and the version that came before gets its own array of blocks
   back — otherwise the history would show a section that was never in it. */
function duInsert(a, at, meta, parts) {
  /* the version docRedline will read, which is the one being shown rather
     than the last one in the list — they are the same until somebody
     scrolls back through the history, and writing to the wrong one would
     put the section in a version nobody is looking at */
  const i = a.vi ?? a.versions.length - 1;
  const v = a.versions[i];
  if (!v) return null;
  const was = duBlocks(a);
  const next = was.slice();
  next.splice(at, 0, ...parts.map(p => ({ t: p.t, v: '', k: p.k })));
  v.blocks = next;
  const n = docRedline(a, parts.map((p, j) => ({ i: at + j, to: p.v })), meta);
  v.blocks = was;
  return n;
}

function duApplyAll(set) {
  let n = 0, last = null;
  for (const p of set.items.filter(x => x.status === 'pending')) {
    if (duApply(set, p, true)) { n++; last = p; }
  }
  if (n) duLand(set, last);
  set.paint?.();
  return n;
}

/* what happens after something is applied: the canvas shows the document
   it was applied to, at the place it landed */
function duLand(set, p) {
  const a = ARTIFACTS[set.doc];
  if (!a) return;
  if (typeof openArtifact === 'function') openArtifact(a);
  requestAnimationFrame(() => { duPins(a); if (p) duReveal(a, p.k); });
}

/* a comment that was proposed in the chat and accepted is a comment, so
   it gets the pin commentLayer draws — except that nothing redraws pins
   for comments that already exist, so this places them itself */
function duPins(a) {
  for (const c of (a.comments || [])) {
    if (!c.k) continue;
    const el = duBlockEl(a, c.k);
    if (!el || el.querySelector('.cmt-pin[data-du]')) continue;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    /* the same pin commentLayer draws, with one addition: these sit on
       blocks that are contenteditable and whose oninput writes innerHTML
       straight back into the block, so a pin that was editable would be
       baked into the document's own words by the next keystroke */
    el.append(h('button', {
      class: 'cmt-pin', 'data-du': '1', type: 'button', contenteditable: 'false',
      title: `${c.where} — ${c.text}`,
      onclick: (e) => { e.stopPropagation(); toast(c.text); },
    }, avatarEl(c.by || USER.name, 'cmt-pin-face')));
  }
}

function duBlockEl(a, k) {
  const i = duIndex(a, k);
  const page = document.querySelector('#artifactPanel .doc-page');
  return i >= 0 && page ? page.children[i] || null : null;
}
function duReveal(a, k) {
  const el = duBlockEl(a, k);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('du-flash');
  void el.offsetWidth;
  el.classList.add('du-flash');
}

/* ── the list in the chat ────────────────────────────────────
   A repaint builds a new message node, so the list is asked for again
   rather than held; it keeps a reference to whichever node is current
   so applying one row can redraw the rest in place. */
const DU_KIND = { revise: 'Revise', section: 'New section', comment: 'Comment' };

function duPropsNode(set) {
  const box = h('div', { class: 'du-props' });
  const paint = () => {
    const applied = set.items.filter(p => p.status === 'applied').length;
    const pending = set.items.filter(p => p.status === 'pending').length;
    box.replaceChildren(
      h('div', { class: 'du-h' },
        h('b', {}, duPlural(set.items.length, 'proposed change')),
        h('span', { class: 'du-sum' }, `${applied} applied · ${pending} pending`),
        pending > 1 ? h('button', { class: 'du-btn du-btn-go', type: 'button',
          onclick: () => {
            const n = duApplyAll(set);
            toast(n ? `Applied ${duPlural(n, 'change')} as tracked changes.` : 'Nothing left to apply.');
          } }, 'Apply all') : null),
      ...set.items.map((p, i) => duRow(set, p, i)));
  };
  set.paint = paint;
  paint();
  return box;
}

function duRow(set, p, i) {
  return h('div', { class: `du-row is-${p.status}` },
    h('span', { class: `du-k du-k-${p.kind}` }, DU_KIND[p.kind]),
    h('div', { class: 'du-b' },
      h('div', { class: 'du-t' },
        h('b', {}, `${i + 1}. ${p.title}`),
        p.ref && p.kind !== 'section' ? h('span', { class: 'du-ref' }, p.ref) : null),
      h('div', { class: 'du-prev' }, ...duPreview(p))),
    h('div', { class: 'du-a' }, ...(
      p.status === 'pending' ? [
        h('button', { class: 'du-btn', type: 'button',
          onclick: () => { p.status = 'skipped'; set.paint?.(); } }, 'Skip'),
        h('button', { class: 'du-btn du-btn-go', type: 'button',
          onclick: () => { if (duApply(set, p)) duLand(set, p); set.paint?.(); } }, 'Apply'),
      ] : p.status === 'applied' ? [
        h('span', { class: 'du-ok' }, p.version ? `Applied · v${p.version}` : 'Applied'),
        h('button', { class: 'du-see', type: 'button',
          onclick: () => duLand(set, p) }, 'View'),
      ] : [h('span', { class: 'du-skip' }, 'Skipped')])));
}

/* The words that go and the words that come in their place — read off the
   same diff the document itself gets redlined with, so a preview can
   never disagree with what applying it does. The two sides are collected
   rather than interleaved: a one-term swap then shows only the term, and
   a whole-clause rewrite shows the old clause struck and the new one set
   out, which is the shape a redline is read in. */
function duPreview(p) {
  if (p.kind === 'comment') return [h('span', { class: 'du-q' }, `“${p.text}”`)];
  if (p.kind === 'section') return [h('ins', {}, `${p.heading} ${duSnip(p.text, 160)}`)];
  const segs = typeof redlineOf === 'function' ? redlineOf(p.from, p.to) : [['ins', p.to]];
  let out = '', ins = '';
  for (const [k, t] of segs) {
    if (k === 'del') out += t;
    else if (k === 'ins') ins += t;
  }
  return [out.trim() ? h('del', {}, duSnip(out, 110)) : null,
    ins.trim() ? h('ins', {}, duSnip(ins, 150))
      : h('span', { class: 'du-same' }, ' — struck, nothing in its place')].filter(Boolean);
}

/* ── the turn ────────────────────────────────────────────────
   Returns false when it has nothing, so an ordinary question about the
   document still reaches the ordinary answer. */
function docUploadTurn(prompt, files) {
  if (typeof thread === 'undefined' || !thread) return false;
  const q = String(prompt || '');

  const open = (typeof openArtifactNow !== 'undefined' && openArtifactNow?.id)
    || (typeof lastArtifactIn === 'function' ? lastArtifactIn() : null);
  const on = ARTIFACTS[open]?.handedOver ? ARTIFACTS[open] : null;

  const named = (files || []).map(f => f?.name).find(Boolean) || duFileIn(q);
  if (named && DU_OPEN.test(q) && (!on || on.file !== named)) {
    duOpenTurn(named, q);
    return true;
  }
  if (!on) return false;

  /* follow-ups on a list that is already in the conversation */
  const waiting = duPendingIn(on);
  if (waiting.length && /\bapply (?:them |these )?all\b|\ball at once\b|\btake them all\b/i.test(q)) {
    const sets = [...new Set(DU_SETS.filter(x => x.doc === on.id && x.items.some(p => p.status === 'pending')))];
    let n = 0;
    for (const s of sets) n += duApplyAll(s);
    duTurn(m => {
      m.text = `Applied ${duPlural(n, 'change')} as tracked changes. `
        + 'They are on the page now — accept or reject them where they sit, or take them all from the bar at the top.';
      m.artifact = on.id;
    });
    return true;
  }
  if (waiting.length && /\b(next one|one at a time|apply (?:the )?(?:next|first)(?: one)?)\b/i.test(q)) {
    const p = waiting[0];
    const set = DU_SETS.find(x => x.items.includes(p));
    const ok = duApply(set, p);
    if (ok) duLand(set, p);
    set.paint?.();
    const left = duPendingIn(on).length;
    duTurn(m => {
      m.text = ok
        ? `Applied: ${p.title}${p.ref && p.kind !== 'section' ? ` — ${p.ref}` : ''}. `
          + (left ? `${duPlural(left, 'change')} still waiting. Say "next" when you are ready.`
                  : 'That was the last one.')
        : 'That one could not go on as it stands — the clause already carries a change. '
          + 'Answer that one on the page first.';
      m.artifact = on.id;
    });
    return true;
  }
  const one = /\b(apply|skip)\s+(?:#|number\s+|change\s+)?(\d+)\b/i.exec(q);
  if (one && waiting.length) {
    const set = [...DU_SETS].reverse().find(x => x.doc === on.id);
    const p = set?.items[+one[2] - 1];
    duTurn(m => {
      if (!p) { m.text = 'I could not find that one in the last list.'; return; }
      if (p.status !== 'pending') { m.text = `${one[2]} is already ${p.status}.`; return; }
      if (/apply/i.test(one[1])) {
        const ok = duApply(set, p);
        if (ok) duLand(set, p);
        m.text = ok ? `Applied ${one[2]}. ${p.title}.`
          : `${one[2]} could not go on — that clause already carries a change.`;
      } else { p.status = 'skipped'; m.text = `Skipped ${one[2]}. ${p.title}.`; }
      set.paint?.();
      m.artifact = on.id;
    });
    return true;
  }

  /* and otherwise: an instruction, or several, each proposed */
  return duProposeTurn(on, q);
}

/* a small turn with nothing to look up — an answer about a list that is
   already in the conversation. Nothing is being fetched, so it is a beat
   rather than a run of calls, but the beat is still read off PACE: the
   demo flags scale that in place, and a turn with its own number in it
   would keep waiting when the whole app had been told to hurry. */
const duBeat = () => Math.max(60, Math.round(
  (typeof PACE !== 'undefined' ? PACE.answer : 1200) * 0.35));

function duTurn(fill) {
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();
  setTimeout(() => { m.thinking = false; fill(m); renderBot(m); }, duBeat());
  return m;
}

/* ── opening it ──────────────────────────────────────────────── */
function duOpenTurn(fname, prompt) {
  const a = docUploadOpen(fname);
  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();

  if (!a) {
    setTimeout(() => {
      m.thinking = false;
      m.text = `I can only reach **${fname}** by its name — a file handed over in the box arrives `
        + `here as a name and nothing else, so I have not read a word of it.\n\nThe agreements I do hold `
        + `in full are the Acme MSA and its SOW, the Kestrel supplier agreement, the Harbor Retail DPA `
        + `and the Birch Labs NDA. Name one of those and I will open it and mark it up.`;
      renderBot(m);
    }, 420);
    return;
  }

  const n = duClauses(a).length;
  const steps = [
    { source: 'document', query: `Read ${fname}`, count: `${n} clauses` },
    { source: 'playbook', query: `Checked it against ${duReviewOf(a)?.playbook?.name || 'the playbook'}`,
      count: `${duProposeAll(a).length} off position` },
  ];
  const P = typeof PACE !== 'undefined' ? PACE : { lead: 400, working: 700, settle: 300, answer: 300 };
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let t = P.lead;
  steps.forEach((step, i) => {
    at(t, () => { m.steps.push({ ...step, rows: [], running: true }); renderBot(m); });
    t += P.working;
    at(t, () => { Object.assign(m.steps[i], step, { running: false }); renderBot(m); });
    t += P.settle;
  });

  /* Anything asked in the same breath as "open this" is an instruction
     about it, so it is proposed rather than waiting for a second ask.
     An instruction always names what it is about — a clause, a quoted
     phrase, the playbook, a verb that acts on words — and "open this so
     I can edit it" names none of those, which is how the two are told
     apart without guessing where one ends. */
  let tail = prompt
    .replace(new RegExp('^[\\s\\S]*?\\.' + DU_EXT + '\\b\\s*[—–-]*\\s*', 'i'), '')
    .replace(/^.*?\b(?:and|then)\s+(?=\w)/i, '').trim();
  if (!/[“"']|§|\bclause\b|\bsection\b|\bplaybook\b|\bcomment\b|\bflag\b|\bdraft\b|\bchange\b|\bsoften\b|\btighten\b|\bshorter\b/i.test(tail)) tail = '';

  at(t + P.answer, () => {
    m.thinking = false;
    m.text = `**${fname}** is open beside this conversation, as it was handed over — `
      + `${duPlural(n, 'clause')}, v1, nothing changed. `
      + 'Tell me what to revise, what to draft, or where to leave a comment. '
      + 'I will propose each change first; nothing touches the page until you apply it, '
      + 'one at a time or all at once.';
    m.artifact = a.id;
    if (typeof openArtifact === 'function') openArtifact(a);
    const got = duGather(a, tail);
    if (got.items.length) {
      /* the set is made once; the list that draws it is asked for again
         on every repaint, which is why one holds the other and not the
         other way round */
      const set = duSet(a, got.items);
      m.extra = () => duPropsNode(set);
      m.text += `\n\n${duSaid(a, got)}`;
    } else {
      m.suggest = duSuggest(a);
    }
    renderBot(m);
  });
}

/* ── proposing ───────────────────────────────────────────────── */
function duSplit(s) {
  return String(s).split(new RegExp(
    ';|\\.\\s+(?=[A-Z])|,\\s*(?:and\\s+|then\\s+)?(?=' + DU_VERB + '\\b)'
    + '|\\s+(?:and|then)\\s+(?=' + DU_VERB + '\\b)', 'i'))
    .map(x => x.trim()).filter(Boolean);
}

/* "align the whole thing with our playbook" against "align §5 with our
   playbook": both name the playbook, and only one of them means the
   document. What separates them is whether the ask names a clause at all,
   so an ask that points somewhere specific is never widened to everything. */
const DU_WHOLE = /\b(?:the )?(?:whole|entire|everything|all of (?:it|this)|document|contract|agreement)\b/i;
const DU_NAMES_ONE = /§\s*\d|\b(?:clause|section|paragraph)\s+\d/i;
const duWantsAll = (q) => !DU_NAMES_ONE.test(q)
  && /\bplaybook\b|\bour positions?\b/i.test(q)
  && (DU_WHOLE.test(q) || /\b(align|bring|fix|redline|mark ?up)\b/i.test(q));

function duGather(a, q) {
  const items = [], errs = [];
  if (duWantsAll(q)) {
    const all = duProposeAll(a);
    if (all.length) items.push(...all);
    else errs.push('Nothing in this document sits off our playbook, so there is no position to move it to.');
  } else {
    for (const part of duSplit(q)) {
      const r = duProposeOne(part, a);
      if (!r) continue;
      if (Array.isArray(r)) items.push(...r);
      else if (r.err) errs.push(r.err);
      else items.push(r);
    }
  }
  /* a change that proposes the words already on the page is not a change */
  return { items: items.filter(p => p.kind !== 'revise' || p.from !== p.to), errs };
}

function duSet(a, items) {
  const set = { id: 'du' + (++duSeq), doc: a.id,
    items: items.map(p => ({ ...p, id: 'dp' + (++duSeq), status: 'pending' })) };
  DU_SETS.push(set);
  return set;
}

function duSaid(a, got) {
  const k = { revise: 0, section: 0, comment: 0 };
  for (const p of got.items) k[p.kind]++;
  const parts = duAnd([
    k.revise && duPlural(k.revise, 'revision'),
    k.section && duPlural(k.section, 'new section'),
    k.comment && duPlural(k.comment, 'comment'),
  ].filter(Boolean));
  const many = got.items.length > 1;
  return `I have proposed ${parts} for **${a.name}**. `
    + `Nothing is in the document yet — apply ${many ? 'them one at a time or all at once' : 'it'}, `
    + `and ${many ? 'each one lands' : 'it lands'} as a tracked change you can still accept or reject on the page.`
    + (got.errs.length ? `\n\n${got.errs.join(' ')}` : '');
}

function duProposeTurn(a, q) {
  const got = duGather(a, q);
  if (!got.items.length && !got.errs.length) return false;
  duTurn(m => {
    if (!got.items.length) { m.text = got.errs.join(' '); return; }
    const set = duSet(a, got.items);
    m.text = duSaid(a, got);
    m.extra = () => duPropsNode(set);
    if (typeof openArtifact === 'function' && !document.querySelector('#artifactPanel .doc-page')) openArtifact(a);
  });
  return true;
}

/* four follow-ups that work against whichever contract was handed over,
   rather than four that only work against one of them */
function duSuggest(a) {
  const cs = duClauses(a);
  const off = cs.find(c => (c.suggestions || []).length);
  const say = cs.find(c => c.need && !(c.suggestions || []).length) || cs[cs.length - 1];
  return [
    'Align the whole thing with our playbook',
    off && say
      ? `Bring §${off.n} to our preferred wording, draft a data protection section, `
        + `and comment on §${say.n} with our position`
      : 'Draft a data protection section',
    duSwapIn(cs),
    'Draft a use of AI tools section',
  ].filter(Boolean).slice(0, 4);
}

/* a quoted swap taken off the document's own words, so the suggestion
   names text that is actually in it */
const DU_BUMP = { one: ['three', 3], two: ['three', 3], three: ['five', 5], five: ['seven', 7],
  seven: ['three', 3], ten: ['five', 5], twelve: ['twenty-four', 24], thirty: ['forty-five', 45],
  'forty-five': ['thirty', 30], sixty: ['thirty', 30], ninety: ['sixty', 60] };
function duSwapIn(cs) {
  const re = /\b(one|two|three|five|seven|ten|twelve|thirty|forty-five|sixty|ninety)\s*\(\d+\)\s*(year|month|day)s?\b/i;
  for (const c of cs) {
    const m = re.exec(c.text || '');
    if (!m) continue;
    const up = DU_BUMP[m[1].toLowerCase()];
    if (!up) continue;
    const unit = up[1] === 1 ? m[2] : m[2] + 's';
    return `Change “${m[0]}” to “${up[0]} (${up[1]}) ${unit}”`;
  }
  return null;
}

/* ── its own styles ──────────────────────────────────────────
   Injected rather than added to a shared sheet, and every colour is a
   token with the value artifacts.css already uses for a redline behind
   it, so this reads the same as the document it talks about. */
const DU_CSS = `
.du-props {
  margin-top: 12px; border: 1px solid var(--line, #E8E4DF);
  border-radius: var(--radius-lg, 12px); background: var(--surface, #fff); overflow: hidden;
}
.du-h {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-bottom: 1px solid var(--line-soft, #F0EDE7);
  background: var(--tint, #F4F2EF); font-size: 13.2px;
}
.du-h b { font-weight: 550; }
.du-sum { color: var(--text-soft, #6B6862); font-size: 12.4px; margin-right: auto; }
.du-row {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 10px 12px; border-top: 1px solid var(--line-soft, #F0EDE7);
}
.du-row:first-of-type { border-top: 0; }
.du-row.is-skipped { opacity: .55; }
.du-k {
  flex: 0 0 auto; margin-top: 1px; padding: 2px 7px; border-radius: 999px;
  font-size: 11.2px; letter-spacing: .02em; white-space: nowrap;
  border: 1px solid var(--line-strong, #D8D3CC); color: var(--text-soft, #6B6862);
}
.du-k-revise  { border-color: var(--doc-ins, #2E7D4F); color: var(--doc-ins, #2E7D4F); }
.du-k-section { border-color: var(--gold, #847347); color: var(--gold, #847347); }
.du-k-comment { border-color: var(--agent-purple, #8D75A8); color: var(--agent-purple, #8D75A8); }
.du-b { min-width: 0; flex: 1 1 auto; }
.du-t { display: flex; flex-wrap: wrap; align-items: baseline; gap: 7px; font-size: 13.4px; }
.du-t b { font-weight: 550; }
.du-ref { color: var(--text-faint, #9A968E); font-size: 12.2px; }
.du-prev { margin-top: 4px; font-size: 12.8px; line-height: 1.5; }
.du-prev del { color: var(--doc-del, #B4463A); }
.du-prev ins {
  text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px;
  color: var(--doc-ins, #2E7D4F); background: var(--doc-ins-bg, #EAF3ED); border-radius: 2px;
}
.du-prev .du-same, .du-q { color: var(--text-soft, #6B6862); }
.du-a { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; }
.du-btn {
  appearance: none; cursor: pointer; font: inherit; font-size: 12.4px;
  padding: 4px 10px; border-radius: var(--radius, 8px);
  border: 1px solid var(--line-strong, #D8D3CC);
  background: var(--surface, #fff); color: var(--text-soft, #6B6862);
}
.du-btn:hover { border-color: var(--text-faint, #9A968E); color: var(--text, #1A1A18); }
.du-btn-go {
  background: var(--rail-bg, #0D1F16); border-color: var(--rail-bg, #0D1F16); color: #fff;
}
.du-btn-go:hover { background: var(--rail-bg-active-solid, #16301F); color: #fff; }
.du-ok { font-size: 12.2px; color: var(--doc-ins, #2E7D4F); white-space: nowrap; }
.du-skip { font-size: 12.2px; color: var(--text-faint, #9A968E); }
.du-see {
  appearance: none; cursor: pointer; font: inherit; font-size: 12.2px; padding: 0;
  border: 0; background: none; color: var(--text-soft, #6B6862); text-decoration: underline;
  text-underline-offset: 2px;
}
.du-see:hover { color: var(--text, #1A1A18); }
/* where a change landed, said for a second and then left alone */
@keyframes du-flash {
  from { background: var(--doc-ins-bg, #EAF3ED); }
  to   { background: transparent; }
}
.du-flash { animation: du-flash 1.4s ease-out 1; border-radius: 3px; }
@media (prefers-reduced-motion: reduce) { .du-flash { animation: none; } }
`;

if (!document.getElementById('du-css')) {
  document.head.append(h('style', { id: 'du-css' }, DU_CSS));
}
