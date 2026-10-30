/* ------------------------------------------------------------------
   Tagging a document to a request.

   Half of "requests and tagging" is already built: a request page lists
   every document on it with its versions and rounds (documents() in
   modules-work.js), and Activity lists every version and note with a
   ref that clicks through to it. That half answers "what is tagged to
   this request", so nothing here renders a second list of it.

   What is missing is the forward direction. A document on the canvas
   has no route to a request at all — artifacts carry no request field
   and the artifact header has no Tag control. So this file does one
   thing: it takes what is open, finds the request it most likely
   belongs to, and lands it there through the writers the request page
   already reads back from — mxAddVersion for the paper, mxLog for the
   word about it. No new storage, no second view.
------------------------------------------------------------------ */

/* ── which request this document is likely to be about ──────────
   A company's name is in the request, so the match is against the
   name: Northwind Ltd against "Northwind NDA — redline.docx". Legal
   suffixes go first, because nobody files paper as "Harbor Retail plc".
   This is a string match on the name, not a judgement about the
   document — it orders the list and marks a row Suggested, and the
   person still chooses. */
const RQ_SUFFIX = /\b(ltd|limited|llc|l\.l\.c|plc|inc|incorporated|corp|corporation|gmbh|ag|s\.a|sa|bv|b\.v|pty|co|company|group|holdings)\b\.?/gi;
const rqFirm = (s) => String(s || '').toLowerCase()
  .replace(RQ_SUFFIX, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/* the words a kind of request tends to put in a filename. Only ever a
   tiebreak: a counterparty that matches outranks every one of these */
const RQ_TYPE_WORDS = {
  'NDA': /\bndas?\b|non-?disclosure|confidentialit/i,
  'Contract review': /\bmsa\b|master (services?|service|agreement)|redline|mark-?up|their paper/i,
  'Drafting': /order form|reseller|resale|licen[cs]e|letter|statement of work|\bsow\b|draft/i,
  'Privacy': /\bdpas?\b|data (processing|protection)|privacy|\bgdpr\b|sub-?processor/i,
  'Termination': /notice|terminat|non-?renewal/i,
  'Signature': /signature|signing|execution|execut(ed|ion) copy/i,
  'Advice': /\bmemo\b|advice|opinion|note on/i,
};

function rqCandidates(a) {
  let reqs = [];
  try { reqs = (typeof mxIntake === 'function' && mxIntake()) || []; } catch { return []; }
  const hay = [a?.name, a?.sub, a?.file, a?.ext && ('.' + a.ext)].filter(Boolean).join(' ').toLowerCase();
  const scored = reqs.map(r => {
    let score = 0, suggested = false;
    const firm = rqFirm(r.counterparty);
    const firmWords = firm.split(' ').filter(w => w.length > 2);
    if (firmWords.length && firmWords.every(w => hay.includes(w))) { score += 3; suggested = true; }
    /* the deal is named for the same company but shortened the way
       people actually write it — "Trellis" where the counterparty is
       "Trellis Health" — so it catches names the full one misses */
    const deal = rqFirm(String(r.deal || '').split(/[—–-]/)[0]);
    if (deal && deal.length > 2 && hay.includes(deal)) { score += 2; suggested = true; }
    if (RQ_TYPE_WORDS[r.type]?.test(hay)) score += 1;
    /* paper does not usually arrive on something already finished */
    if (typeof mxClosed === 'function' && mxClosed(r)) score -= 2;
    return { r, score, suggested: suggested && score > 0 };
  });
  return scored.sort((x, y) =>
    (y.suggested - x.suggested) || (y.score - x.score)
    || String(y.r.updated || '').localeCompare(String(x.r.updated || '')));
}

/* where a request is in its own path, which is what the list should
   say — "Negotiation", not the four-value status the table sorts on */
function rqStageLabel(r) {
  try { return mxStages(r)[mxStage(r)] || ''; } catch { return ''; }
}

/* ── what actually lands on the request ─────────────────────────
   A request version's blocks are { t, v } with escaped HTML carrying
   <del>/<ins> — the same shape docRedline writes onto a doc artifact,
   so a tracked change survives the move untouched. The one thing that
   does not survive is a bulleted block, whose v is an array of items;
   the request page renders h1 / h2 / meta / p and nothing else, so the
   items become lines rather than arriving as a stringified array. */
function rqBlocks(a) {
  const src = (typeof bodyOf === 'function' ? bodyOf(a, 'blocks') : a?.blocks) || [];
  const out = [];
  for (const b of src) {
    if (b.t === 'ul' && Array.isArray(b.v)) { for (const x of b.v) out.push({ t: 'p', v: '• ' + x }); continue; }
    if (typeof b.v !== 'string') continue;
    out.push({ t: b.t === 'h1' || b.t === 'h2' || b.t === 'meta' ? b.t : 'p', v: b.v });
  }
  return out;
}

const rqText = (html) => { const d = document.createElement('div'); d.innerHTML = String(html ?? ''); return d.textContent; };
const rqQuote = (s) => '“' + String(s).replace(/\s+/g, ' ').trim() + '”';

/* the whole document, as the request's next version. Tagged twice, it
   is the same document again rather than a second one — which is why
   the version it made is remembered on the document it made it on. */
function rqTagDoc(a, r) {
  const blocks = rqBlocks(a);
  if (!blocks.length) { pbToast('There is nothing in this document to tag.'); return null; }
  const file = (a.name || 'Document').replace(/\.(docx?|pdf)$/i, '') + '.' + (a.ext || 'docx');
  const prev = mxDocuments(r).find(d => d.taggedFrom === a.id);
  /* named the way the versions already on a request are named, so the
     version menu reads as one history rather than two */
  const d = mxAddVersion(r, {
    name: prev ? 'Revised draft' : 'Tagged draft',
    by: USER.name, when: mxNow(), file, blocks,
  }, prev?.id);
  d.taggedFrom = a.id;
  const n = d.versions.length;
  mxLog(r, { ev: 'version', what: `tagged ${rqQuote(a.name || 'a document')} to this request`, ref: { doc: d.id, v: n } });
  a.req = { id: r.id, title: r.title };
  save();
  return d;
}

/* one proposed change, as a comment on the version it belongs beside.
   Not a version: one clause is not a new draft of the paper, and the
   request page already counts notes against a version and shows them
   with it. */
function rqTagOne(a, r, change) {
  const docs = mxDocuments(r);
  const d = docs.find(x => x.taggedFrom === a.id) || docs[0] || null;
  const ref = d ? { doc: d.id, v: d.versions.length } : null;
  const where = change.heading ? change.heading + ': ' : '';
  const body = change.del && change.ins ? `${rqQuote(change.del)} → ${rqQuote(change.ins)}`
    : change.ins ? `insert ${rqQuote(change.ins)}`
    : `delete ${rqQuote(change.del)}`;
  mxLog(r, { kind: 'note', to: String(r.submitter || '').split(' ')[0] || null,
    what: `From ${a.name || 'the draft'} — ${where}${body}`, ref });
  return d;
}

/* ── the picker ─────────────────────────────────────────────────
   The modal shell the publish dialog already uses (sh-dim / sh-card /
   sh-head / sh-body / sh-foot), so this is not a new kind of dialog.
   Escape and a click on the backdrop are "no". */
function rqTagDialog(a, change) {
  if (!a) return;
  const all = rqCandidates(a);
  if (!all.length) { pbToast('There are no requests to tag this to.'); return; }
  let pick = (a.req && all.find(c => c.r.id === a.req.id))
    || all.find(c => c.suggested) || all[0];

  const dim = h('div', { class: 'sh-dim rqt-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const close = () => { dim.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };

  const search = h('input', { class: 'sh-search', type: 'text', spellcheck: 'false',
    placeholder: 'Search requests', 'aria-label': 'Search requests',
    oninput: () => paintList() });
  const list = h('div', { class: 'rqt-list', role: 'radiogroup', 'aria-label': 'Requests' });
  const go = h('button', { class: 'btn btn--primary', type: 'button', onclick: () => confirm() });

  const paintGo = () => {
    go.textContent = pick ? `Tag to ${pick.r.id}` : 'Choose a request';
    if (pick) go.removeAttribute('disabled'); else go.setAttribute('disabled', '');
  };

  const paintList = () => {
    const q = search.value.trim().toLowerCase();
    const rows = all.filter(c => !q
      || (c.r.id + ' ' + c.r.title + ' ' + (c.r.counterparty || '') + ' ' + (c.r.deal || '')).toLowerCase().includes(q));
    if (!rows.length) { list.replaceChildren(h('p', { class: 'rqt-none' }, 'No requests match.')); return; }
    list.replaceChildren(...rows.map(c => h('button', {
      class: 'rqt-row', type: 'button', role: 'radio',
      'aria-checked': String(pick?.r.id === c.r.id),
      onclick: () => { pick = c; paintList(); paintGo(); },
    },
      h('span', { class: 'rqt-id' }, c.r.id),
      h('span', { class: 'rqt-t' }, c.r.title),
      c.suggested ? h('span', { class: 'rqt-sug' }, 'Suggested')
        : h('span', { class: 'rqt-st' }, rqStageLabel(c.r)))));
  };

  const confirm = () => {
    if (!pick) return;
    const r = pick.r;
    const d = change ? rqTagOne(a, r, change) : rqTagDoc(a, r);
    if (!change && !d) return;
    close();
    rqPaintBtns();
    pbToast(change ? `The change is on ${r.id}.` : `${a.name || 'The document'} is on ${r.id}.`, {
      label: 'Open ' + r.id,
      run: () => {
        if (d) MX.intake.focus = { doc: d.id, v: d.versions.length };
        MX.intake.tab = change ? 'activity' : 'docs';
        if (typeof closeArtifact === 'function') closeArtifact();
        mxOpen('intake', r.id);
      },
    });
  };

  dim.append(h('div', { class: 'sh-card rqt-card' },
    h('header', { class: 'sh-head' },
      h('div', {},
        h('h2', { class: 'sh-title' }, change ? 'Tag this change to a request' : 'Tag to a request'),
        h('p', { class: 'rqt-of' }, a.name || 'This document')),
      h('div', { class: 'sh-head-act' },
        h('button', { class: 'icon-btn icon-btn-canvas', type: 'button', 'aria-label': 'Close',
          onclick: close,
          html: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            + 'stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' }))),
    h('div', { class: 'sh-body' },
      /* the change itself, so what is about to be filed is on screen
         while the request is chosen */
      change ? h('div', { class: 'rqt-chg' },
        change.heading ? h('h3', {}, change.heading) : null,
        h('p', { class: 'rqt-chg-t', html: (change.del ? `<del>${mxEsc(change.del)}</del> ` : '')
          + (change.ins ? `<ins>${mxEsc(change.ins)}</ins>` : '') })) : null,
      h('div', { class: 'sh-add' }, h('div', { class: 'sh-add-field' }, search)),
      list),
    h('footer', { class: 'sh-foot' },
      h('p', { class: 'rqt-note' }, change
        ? 'It lands as a comment on the request’s latest version.'
        : 'It lands as the request’s next version, tracked changes and all.'),
      h('div', { class: 'sh-foot-end' },
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
        go))));

  paintList();
  paintGo();
  document.addEventListener('keydown', onKey, true);
  document.body.append(dim);
  setTimeout(() => search.focus(), 30);
}

/* one proposed change, picked out of the document by the id the
   redline carries. Reads the nearest heading above it so the comment
   says which clause it is about. */
function rqTagChange(a, id) {
  const blocks = (typeof bodyOf === 'function' ? bodyOf(a, 'blocks') : a?.blocks) || [];
  const want = String(id);
  let del = '', ins = '', heading = '';
  for (const b of blocks) {
    if (typeof b.v === 'string' && b.v.includes(`data-rl="${want}"`)) {
      const d = document.createElement('div');
      d.innerHTML = b.v;
      for (const el of d.querySelectorAll(`[data-rl="${want}"]`)) {
        if (el.tagName === 'DEL') del += el.textContent; else ins += el.textContent;
      }
      break;
    }
    if ((b.t === 'h1' || b.t === 'h2') && typeof b.v === 'string') heading = rqText(b.v).trim();
  }
  if (!del && !ins) { pbToast('That change is no longer in the document.'); return; }
  rqTagDialog(a, { id: want, del: del.trim(), ins: ins.trim(), heading });
}

/* ── the control in the artifact header ─────────────────────────
   Reads "Tag" until it is tagged and then reads the request's number,
   because the number is the answer to the question the button raises.
   Clicking it again moves the tag. */
const RQ_TAG_IC = '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M4 10.8V4.9A.9.9 0 0 1 4.9 4h5.9a.9.9 0 0 1 .64.26l8.3 8.3a.9.9 0 0 1 0 1.28l-5.9 5.9a.9.9 0 0 1-1.28 0'
  + 'l-8.3-8.3A.9.9 0 0 1 4 10.8z"/><circle cx="8" cy="8" r="1.1"/></svg>';

let rqTagBtnList = [];
function rqPaintBtn(btn, a) {
  const on = a.req && a.req.id;
  btn.dataset.on = String(!!on);
  btn.lastChild.textContent = on ? a.req.id : 'Tag';
  btn.title = on ? `Tagged to ${a.req.id} · ${a.req.title}` : 'Tag this document to a request';
  btn.setAttribute('aria-label', btn.title);
}
/* a tag made in the dialog or in chat shows on whatever header is on
   screen, without rebuilding the canvas under the person's scroll */
function rqPaintBtns() {
  rqTagBtnList = rqTagBtnList.filter(x => x.btn.isConnected);
  for (const x of rqTagBtnList) rqPaintBtn(x.btn, x.a);
}
function rqTagExtras(a) {
  /* only paper goes on a request: a deck or a sheet has no version for
     the request page to hold */
  if (!a || a.kind !== 'doc' || typeof mxIntake !== 'function') return [];
  const btn = h('button', { class: 'rqt-btn', type: 'button',
    onclick: (e) => { e.stopPropagation(); rqTagDialog(a); } },
    h('span', { class: 'rqt-mark', html: RQ_TAG_IC }),
    h('span', { class: 'rqt-lab' }, 'Tag'));
  rqPaintBtn(btn, a);
  rqTagBtnList = rqTagBtnList.filter(x => x.btn.isConnected);
  rqTagBtnList.push({ btn, a });
  return [btn];
}

/* ── asking for it in words ─────────────────────────────────────
   Built the way formatTurn is built (art-format.js): push one bot
   message, run its steps, then write the answer. Returns true only
   when it took the turn, so anything it does not recognise falls back
   through to botTurn.

   What resolves a request is a pattern, not a reading: an RQ number
   first, and failing that the words left after the filler against the
   request's title, counterparty and deal. One hit is tagged; several
   or none come back as rows to pick from. */
const RQ_FILLER = /\b(tag|this|that|it|to|the|a|an|and|please|can|you|could|would|request|requests|intake|redline|document|doc|draft|file|link|attach|onto|on|for|with|my|our|us|into|put|add|under|against)\b/g;

function rqTagTurn(prompt) {
  const q = String(prompt || '');
  if (!/\btag\b/i.test(q)) return false;
  const idm = /\brq-?\s*(\d{3,5})\b/i.exec(q);
  if (!idm && !/\b(request|requests|intake)\b/i.test(q)) return false;
  if (typeof mxIntake !== 'function' || typeof thread === 'undefined' || !thread) return false;

  /* what is open beside the conversation first, then what the
     conversation last named — the order botTurn already uses */
  const open = typeof openArtifactNow !== 'undefined' ? openArtifactNow : null;
  const named = typeof lastArtifactIn === 'function' ? ARTIFACTS[lastArtifactIn()] : null;
  const doc = [open, named].find(x => x && x.kind === 'doc') || null;

  const m = { role: 'bot', steps: [], text: '', thinking: true };
  thread.messages.push(m);
  paintThread();
  const finish = (fn, ms) => setTimeout(() => {
    m.thinking = false;
    m.cites = null;
    if (m.traceOpen == null) m.traceOpen = false;
    fn();
    renderBot(m);
  }, ms);

  if (!doc) {
    finish(() => { m.text = 'There is no document in this conversation to tag. '
      + 'Open the draft or the redline you mean and ask again, or tag it from its header.'; }, 520);
    return true;
  }

  const cands = rqCandidates(doc);
  let hits = [];
  if (idm) {
    const want = ('rq-' + idm[1]).toLowerCase();
    hits = cands.filter(c => c.r.id.toLowerCase() === want);
  } else {
    const words = q.toLowerCase().replace(/[“”"'’]/g, ' ').replace(RQ_FILLER, ' ')
      .split(/[^a-z0-9]+/).filter(w => w.length > 2);
    if (words.length) hits = cands.filter(c => {
      const hay = (c.r.id + ' ' + c.r.title + ' ' + (c.r.counterparty || '') + ' ' + (c.r.deal || '')).toLowerCase();
      return words.every(w => hay.includes(w));
    });
  }

  const step = { source: 'request', query: 'Read the open requests',
    count: mxPlural(cands.length, 'request') };
  setTimeout(() => { m.steps.push({ ...step, rows: [], running: true }); renderBot(m); }, 280);
  setTimeout(() => { Object.assign(m.steps[0], step, { running: false }); renderBot(m); }, 980);

  if (hits.length === 1) {
    const r = hits[0].r;
    const d = rqTagDoc(doc, r);
    finish(() => {
      if (!d) { m.text = 'There is nothing in that document to tag — it has no body yet.'; return; }
      m.steps.push({ source: 'rqtag', query: `${r.id} · ${r.title}`, count: 'v' + d.versions.length });
      m.text = `Tagged **${doc.name}** to **${r.id}** · ${r.title}. It is v${d.versions.length} of `
        + `${d.title} on that request, with the tracked changes as they stand`
        + `${r.attorney ? `, and ${r.attorney.split(' ')[0]} has it` : ' — it is not assigned to anyone yet'}.`
        + '\n\nNothing has been sent to anyone outside legal.';
      m.suggest = [`Open ${r.id}`, 'Tag it somewhere else instead'];
      rqPaintBtns();
    }, 1400);
    return true;
  }

  finish(() => {
    const rows = (hits.length ? hits : cands).slice(0, 4);
    m.text = (hits.length ? 'More than one request matches.'
      : idm ? `There is no ${('RQ-' + idm[1]).toUpperCase()} in Intake.`
      : 'Which request should it go on?')
      + ' Pick one and I will tag it:';
    m.suggest = rows.map(c => `Tag it to ${c.r.id}`);
  }, 1400);
  return true;
}

/* what this file put on a request, read back off the request's own
   Activity. Nothing here renders it: the Documents panel and the
   Activity timeline on the request page already do, and a second list
   of the same thing would be a second answer to one question. */
function rqTaggedOn(r) {
  return (r?.activity || []).filter(x => /^tagged /.test(String(x.what || '')));
}

/* what the trace says it did */
SOURCES.rqtag = { label: 'Intake', verb: 'Tagged to',
  icon: '<path d="M4 10.8V4.9A.9.9 0 0 1 4.9 4h5.9a.9.9 0 0 1 .64.26l8.3 8.3a.9.9 0 0 1 0 1.28l-5.9 5.9'
    + 'a.9.9 0 0 1-1.28 0l-8.3-8.3A.9.9 0 0 1 4 10.8z"/><circle cx="8" cy="8" r="1.1"/>' };

/* ── styles ─────────────────────────────────────────────────────
   The dialog borrows the publish dialog's shell outright, so what is
   here is the header control, the request rows and the change
   preview. The two colours this feature owns are named with a
   fallback; nothing in the shared sheet moves. */
document.head.append(h('style', { id: 'rqt-css' }, `
.rqt-btn {
  appearance: none; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  height: 30px; padding: 0 9px;
  border: 0; border-radius: var(--radius); background: none;
  color: var(--text-soft); font: inherit; font-size: 12.6px;
  transition: background var(--fast, 120ms) var(--ease, ease), color var(--fast, 120ms) var(--ease, ease);
}
.rqt-btn:hover { background: var(--tint); color: var(--text); }
.rqt-btn .rqt-mark { flex: none; display: grid; place-items: center; }
.rqt-btn .rqt-mark svg { width: 15px; height: 15px; }
.rqt-btn[data-on="true"] { color: var(--text); }
.rqt-btn[data-on="true"] .rqt-mark { color: var(--rq-tag-on, #2E7D4F); }
.rqt-lab { font-variant-numeric: tabular-nums; }

.rqt-of {
  margin: 3px 0 0; font-size: 12.4px; color: var(--text-faint);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 340px;
}
.rqt-card { max-width: 492px; }

.rqt-chg {
  margin: 2px 0 12px; padding: 9px 11px;
  border: 1px solid var(--line-soft); border-radius: 10px; background: var(--bg-sunk);
}
.rqt-chg h3 {
  margin: 0 0 4px; font-family: var(--mono); font-weight: 400;
  font-size: 10px; letter-spacing: .085em; text-transform: uppercase; color: var(--text-faint);
}
.rqt-chg-t { margin: 0; font-size: 13.2px; line-height: 1.55; color: var(--text); }
.rqt-chg-t del { color: var(--rq-tag-del, #B4483C); }
.rqt-chg-t ins {
  color: var(--rq-tag-ins, #2E7D4F); text-decoration: none;
  border-bottom: 1px solid currentColor;
}

.rqt-list { display: flex; flex-direction: column; margin: 8px -4px 2px; }
.rqt-row {
  appearance: none; cursor: pointer; background: none;
  border: 0; border-bottom: 1px solid var(--line-soft); border-radius: 0;
  display: grid; grid-template-columns: 68px minmax(0, 1fr) auto;
  gap: 10px; align-items: center;
  padding: 9px 8px; text-align: left;
  font: inherit; font-size: 13.4px; color: var(--text);
  transition: background var(--fast, 120ms) var(--ease, ease);
}
.rqt-row:last-child { border-bottom: 0; }
.rqt-row:hover { background: var(--bg-sunk); }
.rqt-row[aria-checked="true"] { background: var(--tint); }
.rqt-id { color: var(--text-faint); font-size: 12.4px; font-variant-numeric: tabular-nums; }
.rqt-t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rqt-sug { font-size: 11.8px; color: var(--rq-tag-sug, #8A6D1F); white-space: nowrap; }
.rqt-st { font-size: 11.8px; color: var(--text-faint); white-space: nowrap; }
.rqt-none { margin: 0; padding: 14px 8px; font-size: 13px; color: var(--text-soft); }
.rqt-note { margin: 0; font-size: 12.2px; color: var(--text-faint); max-width: 236px; line-height: 1.45; }
`));
