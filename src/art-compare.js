/* ══ Comparing two versions of an artifact ═════════════════════════
   The version menu lets you read one version at a time. What it never
   let you do is read two against each other — which is the question
   anybody actually has about a history: not "what did v1 say" but
   "what changed between v1 and v3".

   The comparison itself is not written here. intake-compare.js already
   does this for the documents attached to an intake request —
   mxCompare lines two versions up paragraph by paragraph (so a clause
   that only moved is matched to itself) and then compares each changed
   paragraph word by word. All that was missing was a way to hand it an
   artifact's versions, which it has never seen, and somewhere to put
   the answer. This file is those two things and nothing else.

   It is read-only on purpose. A redline you can accept or reject is a
   proposal (that is review.js, and docRedline on a document). This is a
   record: it says what changed and changes nothing. */

/* ── an artifact version, in the shape mxCompare can read ─────────
   mxPlainBlocks wants {blocks:[{t,v}]}. A document version already is
   that; a template keeps a snapshot of its body, and a playbook a
   snapshot of its clauses, so each kind needs saying once.

   A kind with no prose — a deck's slides, a sheet's cells, an agent's
   settings — returns null rather than being flattened into something
   that would diff but mean nothing. */
const ARTC_ESC = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function artVersionBlocks(a, i) {
  const v = a?.versions?.[i];
  if (!v) return null;

  /* a document, an email, a drafted request: blocks already, except a
     list, whose items are one value — compared as one paragraph a
     changed bullet would read as the whole list rewritten */
  if (v.blocks?.length) {
    const out = [];
    for (const b of v.blocks) {
      if (b.t === 'ul' && Array.isArray(b.v)) {
        for (const li of b.v) out.push({ t: 'p', v: '· ' + ARTC_ESC(li) });
      } else out.push({ t: b.t, v: b.v });
    }
    return { blocks: out };
  }

  const snap = v.snap;
  if (!snap) return null;

  /* a template: its sections as headings, its clauses as paragraphs.
     The placeholders stay as they are written, so a changed
     {{term_years}} reads as one changed blank and not as prose. */
  if (Array.isArray(snap.body)) {
    return { blocks: snap.body.map(b => (b.h !== undefined
      ? { t: 'h2', v: ARTC_ESC(b.h) }
      : { t: 'p', v: ARTC_ESC(b.p !== undefined ? b.p : b.v) })) };
  }

  /* a playbook: its sections, then each clause's positions, each one
     labelled. The label matters — without it a fallback that moved up
     the list would compare against the preferred position above it and
     read as a rewrite rather than as a reorder. */
  if (Array.isArray(snap.clauses)) {
    const out = [];
    let section = null;
    for (const c of snap.clauses) {
      const sec = c.section || 'General';
      if (sec !== section) { section = sec; out.push({ t: 'h1', v: ARTC_ESC(sec) }); }
      out.push({ t: 'h2', v: ARTC_ESC(c.topic || 'Untitled clause') });
      const line = (label, text) => { if (text) out.push({ t: 'p', v: ARTC_ESC(label + ' — ' + text) }); };
      line('Covers', c.covers);
      line('Preferred', c.preferred);
      line('Walk away', c.walkaway);
      (c.fallbacks || []).forEach((f, n) => {
        const nth = (c.fallbacks || []).length > 1 ? ` ${n + 1}` : '';
        line('Fallback' + nth, f.text);
        line('Fallback' + nth + ' language', f.language);
      });
    }
    return { blocks: out };
  }
  return null;
}

/* whether compare can say anything at all about this artifact */
const artCanCompare = (a) => !!(a?.versions?.length >= 2
  && artVersionBlocks(a, a.versions.length - 1) && artVersionBlocks(a, 0));

const ARTC_NOUN = { doc: 'document', template: 'template', playbook: 'playbook',
                    mail: 'email', request: 'document' };
const artcNoun = (a) => ARTC_NOUN[a?.kind] || (typeof NOUN === 'object' && NOUN[a?.kind]) || 'file';

/* ── where it is reached from ─────────────────────────────────────
   The version cascade off the name menu is where someone already is
   when they are thinking about versions, so the way to compare two of
   them belongs at the bottom of that list rather than in a toolbar
   somewhere else. */
function artCompareMenu(sub, a) {
  if (!a?.versions || a.versions.length < 2) return;
  if (typeof mxGlyphs === 'function') mxGlyphs();
  const ok = artCanCompare(a);
  sub.append(h('div', { class: 'menu-rule' }),
    h('button', {
      class: 'menu-item artc-open' + (ok ? '' : ' is-off'),
      type: 'button', role: 'menuitem',
      'aria-disabled': ok ? null : 'true',
      title: ok ? null : 'Compare reads documents, templates and playbooks.',
      html: MI(GLYPHS.compare),
      onclick: (e) => {
        e.stopPropagation();
        if (!ok) return;
        closeMenu();
        /* two versions have only one comparison in them, so asking which
           two would be asking a question with one answer */
        if (a.versions.length === 2) artCompareOpen(a, 0, 1);
        else artComparePick(a);
      },
    }, h('span', { class: 'menu-label' }, 'Compare versions…')));
}

/* the docked panel has no name menu, so the version history gets its own way in */
function artCompareFoot(a) {
  if (!artCanCompare(a)) return null;
  if (typeof mxGlyphs === 'function') mxGlyphs();
  return h('button', {
    class: 'artc-foot', type: 'button', html: MI(GLYPHS.compare),
    onclick: (e) => {
      e.stopPropagation(); closeMenu();
      if (a.versions.length === 2) artCompareOpen(a, 0, 1); else artComparePick(a);
    },
  }, h('span', {}, 'Compare versions…'));
}

/* ── which two ────────────────────────────────────────────────────
   Two lists, the older on the left of the arrow. They default to the
   two newest, which is the comparison nearly everybody wants. */
function artComparePick(a) {
  artcStyle();
  const V = a.versions.length;
  let from = V - 2, to = V - 1;

  const label = (i) => `${versionLabel(a, i)} · ${a.versions[i].when}`
    + (a.versions[i].name ? ` · ${a.versions[i].name}` : '');
  const sel = (which) => {
    const s = h('select', { class: 'artc-sel', 'aria-label': which === 'from' ? 'Original version' : 'Compared against' },
      a.versions.map((v, i) => h('option', { value: String(i) }, label(i))));
    s.value = String(which === 'from' ? from : to);
    s.addEventListener('change', () => {
      if (which === 'from') from = +s.value; else to = +s.value;
      warn.hidden = from !== to;
      go.disabled = from === to;
    });
    return s;
  };

  const close = () => { dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const dim = h('div', { class: 'pb-dim mx-rqf-dim', onclick: (e) => { if (e.target === dim) close(); } });

  const warn = h('p', { class: 'artc-warn', hidden: true }, 'Pick two different versions.');
  const go = h('button', { class: 'pb-btn pb-btn--primary', type: 'button',
    onclick: () => { close(); artCompareOpen(a, Math.min(from, to), Math.max(from, to)); } }, 'Compare');

  dim.append(h('div', { class: 'pb-dlg mx-rqf artc-pick', role: 'dialog', 'aria-label': 'Compare versions' },
    h('header', { class: 'mx-rqf-head' }, h('h2', { class: 'pb-dlg-t' }, 'Compare versions')),
    h('div', { class: 'mx-rqf-body' },
      h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, 'Original'), sel('from')),
      h('label', { class: 'mx-rqf-f' }, h('span', { class: 'mx-rqf-l' }, 'Compared against'), sel('to')),
      warn),
    h('footer', { class: 'mx-rqf-foot' },
      h('button', { class: 'pb-btn', type: 'button', onclick: close }, 'Cancel'), go)));
  document.body.append(dim);
  addEventListener('keydown', onKey, true);
}

/* ── the comparison ───────────────────────────────────────────────
   What changed, clause by clause, over the whole text marked. The two
   version numbers and the count sit in a bar that stays put while you
   read, because stepping through changes is useless if the control
   scrolls away from you. */
function artCompareOpen(a, i, j) {
  artcStyle();
  const res = mxCompare(artVersionBlocks(a, i), artVersionBlocks(a, j));
  if (!res) return toast(`Compare reads documents, templates and playbooks — not ${artcNoun(a)}s.`);
  const summary = mxCompareSummary(res);

  const page = h('article', { class: 'doc-page artc-page' },
    res.rows.map(row => h({ h1: 'h1', h2: 'h2' }[row.t] || 'p', {
      class: { h1: 'doc-h1', h2: 'doc-h2' }[row.t] || 'doc-p',
      html: mxCompareHtml(row),
    })));

  const scroll = h('div', { class: 'artc-scroll' });
  let at = 0;
  const count = h('span', { class: 'artc-n' }, res.changes ? `— of ${res.changes}` : 'No changes');

  /* both halves of a change light up together: the struck words and the
     ones that replaced them are one change, not two.
     The scrolling is the container's own and it lands rather than
     glides: a change is an inline run inside a paragraph, and both
     scrollIntoView and scroll-behavior put the move in the hands of an
     animation that some browsers never run, leaving the reader looking
     at the wrong paragraph with the counter saying 2 of 4. */
  const go1 = (n) => {
    if (!n) return;
    at = n;
    page.querySelectorAll('.is-at').forEach(x => x.classList.remove('is-at'));
    const hit = [...page.querySelectorAll(`[data-c="${n}"]`)];
    hit.forEach(x => x.classList.add('is-at'));
    const mark = hit[0];
    if (mark) {
      const want = scroll.scrollTop + mark.getBoundingClientRect().top
        - scroll.getBoundingClientRect().top - scroll.clientHeight / 2;
      scroll.scrollTop = Math.max(0, want);
    }
    count.textContent = `${n} of ${res.changes}`;
  };
  const step = (dir) => { if (res.changes) go1(((at - 1 + dir + res.changes) % res.changes) + 1); };

  const ARR = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const CH = (d) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

  const bar = h('div', { class: 'artc-bar' },
    h('div', { class: 'artc-bar-l' },
      h('span', { class: 'artc-k' }, 'Redline'),
      h('span', { class: 'artc-v is-old', title: `Original: ${versionLabel(a, i)} · ${a.versions[i].when}` }, versionLabel(a, i)),
      h('span', { class: 'artc-ar', 'aria-hidden': 'true', html: ARR }),
      h('span', { class: 'artc-v is-new', title: `Compared against: ${versionLabel(a, j)} · ${a.versions[j].when}` }, versionLabel(a, j))),
    h('div', { class: 'artc-bar-r' }, count,
      res.changes ? h('button', { class: 'artc-b', type: 'button', 'aria-label': 'Previous change', title: 'Previous change', html: CH('M15 6l-6 6 6 6'), onclick: () => step(-1) }) : null,
      res.changes ? h('button', { class: 'artc-b', type: 'button', 'aria-label': 'Next change', title: 'Next change', html: CH('M9 6l6 6-6 6'), onclick: () => step(1) }) : null));

  const lede = res.changes
    ? `${mxPlural(res.changes, 'change')} across ${mxPlural(summary.length, 'clause')} · ${res.ins} added, ${res.del} removed`
    : `${versionLabel(a, i)} and ${versionLabel(a, j)} say the same thing`;

  const sum = h('section', { class: 'artc-sum' },
    h('div', { class: 'artc-sum-h' }, h('b', {}, 'What changed'), h('span', {}, lede)),
    summary.map(g => h('button', { class: 'artc-sum-row', type: 'button', onclick: () => go1(g.c) },
      h('span', { class: 'artc-sum-t' }, g.head),
      h('span', { class: 'artc-sum-d' },
        g.del ? h('del', {}, g.del) : null,
        g.del && g.ins ? ' ' : null,
        g.ins ? h('ins', {}, g.ins) : null),
      h('span', { class: 'artc-sum-n' }, String(g.n)))));

  scroll.append(sum, page);

  const close = () => { dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); removeEventListener('keydown', onKey, true); };
  /* ← and → step through the changes, the way they do in Word; Escape
     is the way out, and the only one besides the button */
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); return close(); }
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  };
  const dim = h('div', { class: 'pb-dim artc-dim', onclick: (e) => { if (e.target === dim) close(); } });

  dim.append(h('div', { class: 'artc', role: 'dialog', 'aria-label': `Compare ${versionLabel(a, i)} and ${versionLabel(a, j)}` },
    h('header', { class: 'artc-head' },
      h('div', { class: 'artc-head-m' },
        h('h2', { class: 'artc-t' }, a.name),
        h('p', { class: 'artc-s' }, `A record of what changed. Nothing here changes the ${artcNoun(a)}.`)),
      h('button', { class: 'artc-x', type: 'button', 'aria-label': 'Close', title: 'Close',
        html: CH('M6 6l12 12M18 6L6 18'), onclick: close })),
    bar, scroll));
  document.body.append(dim);
  addEventListener('keydown', onKey, true);
}

/* ── its own css, injected once ───────────────────────────────────
   The marked words need no rules at all: .doc-page ins and .doc-page
   del are already the colours tracked changes are in everywhere else,
   so the page is built inside a .doc-page and inherits them. What is
   here is the sheet around it. */
function artcStyle() {
  if (document.getElementById('artc-css')) return;
  document.head.append(h('style', { id: 'artc-css' }, `
.artc-open.is-off { opacity: .45; cursor: default; }
.artc-open.is-off:hover { background: none; }
.artc-foot { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px;
  border: 0; border-top: 1px solid var(--line-soft); background: none; font: inherit;
  font-size: 13px; color: var(--text-soft); text-align: left; cursor: pointer; }
.artc-foot:hover { background: var(--tint); color: var(--text); }
.artc-foot .ic { flex: none; color: var(--text-faint); }

.artc-pick .artc-sel { display: block; width: 100%; height: 38px; padding: 0 10px;
  border: 1px solid var(--line); border-radius: 10px; background: var(--surface);
  font: inherit; font-size: 13.5px; color: var(--text); outline: 0; }
.artc-pick .artc-sel:focus { border-color: var(--line-strong); }
.artc-warn { margin: 0; font-size: 12.5px; color: var(--artc-warn, #B4463A); }

.artc-dim { position: fixed; inset: 0; z-index: 90; background: rgba(20,20,19,.42);
  display: grid; place-items: stretch; padding: 4vh 4vw;
  animation: fadeIn 180ms var(--ease) backwards; }
.artc-dim.is-closing { opacity: 0; transition: opacity 150ms var(--ease); }
.artc { display: flex; flex-direction: column; min-height: 0; overflow: hidden;
  width: 100%; max-width: 1040px; margin: 0 auto;
  background: var(--bg-sunk); border-radius: 16px;
  box-shadow: 0 28px 70px -24px rgba(20,20,19,.4), 0 2px 6px rgba(20,20,19,.08);
  animation: pbDlgIn 260ms var(--pb-open, var(--ease)) backwards; }
.artc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 20px 20px 14px 26px; background: var(--surface); border-bottom: 1px solid var(--line); }
.artc-head-m { min-width: 0; display: grid; gap: 3px; }
.artc-t { margin: 0; font-family: var(--serif); font-weight: 400; font-size: 21px;
  letter-spacing: -0.01em; overflow-wrap: anywhere; }
.artc-s { margin: 0; font-size: 12.5px; color: var(--text-faint); }
.artc-x { flex: none; display: grid; place-items: center; width: 30px; height: 30px;
  border: 0; border-radius: 8px; background: none; color: var(--text-soft); cursor: pointer; }
.artc-x:hover { background: var(--tint); color: var(--text); }

.artc-bar { flex: none; display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 8px 16px 8px 26px; background: var(--surface);
  border-bottom: 1px solid var(--line); }
.artc-bar-l, .artc-bar-r { display: flex; align-items: center; gap: 8px; }
.artc-k { font-family: var(--mono); font-size: 10px; letter-spacing: .09em;
  text-transform: uppercase; color: var(--text-faint); margin-right: 2px; }
.artc-v { display: grid; place-items: center; min-width: 32px; height: 22px; padding: 0 7px;
  border-radius: 6px; font-size: 12px; font-variant-numeric: tabular-nums; }
.artc-v.is-old { background: var(--artc-old-bg, #FBEDEA); color: var(--artc-old, #A8413A); }
.artc-v.is-new { background: var(--artc-new-bg, #E8F3EC); color: var(--artc-new, #26674A); }
.artc-ar { display: grid; place-items: center; color: var(--text-faint); }
.artc-n { font-size: 12.5px; color: var(--text-soft); font-variant-numeric: tabular-nums;
  min-width: 70px; text-align: right; }
.artc-b { display: grid; place-items: center; width: 26px; height: 26px; border: 0;
  border-radius: 7px; background: none; color: var(--text-soft); cursor: pointer; }
.artc-b:hover { background: var(--tint); color: var(--text); }

.artc-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 26px 40px;
  scrollbar-width: thin; }
.artc-sum { max-width: 720px; margin: 0 auto 24px; background: var(--surface);
  border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.artc-sum-h { display: grid; gap: 2px; padding: 13px 16px; border-bottom: 1px solid var(--line-soft); }
.artc-sum-h b { font-size: 13px; font-weight: 500; }
.artc-sum-h span { font-size: 12.5px; color: var(--text-soft); }
.artc-sum-row { display: flex; align-items: baseline; gap: 12px; width: 100%; padding: 9px 16px;
  border: 0; background: none; font: inherit; text-align: left; cursor: pointer; }
.artc-sum-row + .artc-sum-row { border-top: 1px solid var(--line-soft); }
.artc-sum-row:hover { background: var(--tint); }
.artc-sum-t { flex: none; max-width: 38%; font-size: 13px; color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.artc-sum-d { flex: 1; min-width: 0; font-size: 12.5px; color: var(--text-soft);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.artc-sum-d del { color: var(--doc-del, #B4463A); }
.artc-sum-d ins { color: var(--doc-ins, #2E7D4F); text-decoration: underline;
  text-decoration-thickness: 1px; text-underline-offset: 2px; }
.artc-sum-n { flex: none; font-size: 11.5px; color: var(--text-faint); font-variant-numeric: tabular-nums; }

/* a comparison is read, never edited — so no caret, and the marks are
   not the clickable ones a proposal has */
.artc-page { cursor: default; }
.artc-page ins, .artc-page del { cursor: default; }
.artc-page ins:hover, .artc-page del:hover { outline: 0; }
.artc-page .is-at { background: var(--artc-at, #FBF3D6); border-radius: 2px;
  box-shadow: 0 0 0 2px var(--artc-at, #FBF3D6); }
`));
}
