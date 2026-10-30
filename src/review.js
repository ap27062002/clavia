/* ==================================================================
   The contract page a request opens onto.

   Brought over from the Jev experiment's review workspace
   (Experiments/jev/static/review.js) as it was: the contract on the
   left with each clause marked by where it lands, and on the right the
   playbook's reading of it — a bar of the three positions, the clauses
   worst first, and for each one the reasoning, the playbook's own
   clause, and a redline that can be applied, with or without a comment.
   Notes sit in the margin, Word-style, and are internal or for them.
   Under the panel, tabs: Playbook and Ask. Ask is more than Jev's: besides
   answering, it flags the contract's issues as suggestion cards and
   redrafts a selection (see "Ask: questions about the contract").

   What changed in the move:
     · no server. The reviews are static (reviews-data.js); what you
       apply and note is kept on the request (request.work).
     · Ask is answered from the contract's own words, by overlap.
     · running a different playbook is a stand-in (see rerun()).
     · left out, because each needs the server: their reply and rounds,
       the Word download, tailored drafts.
     · every class is prefixed jv- (review.css), and the position marks
       are the playbook's own.

   Loaded before app.js; runs at call time.
================================================================== */

/* ── one word-by-word diff for the whole app ──────────────────
 Their words against ours, in the shape a saved redline has:
 [['t'|'del'|'ins', text], …]. It lived inside reviewPage, which meant
 the chat could not reach it and would have had to grow a second one.
 It is pure — two strings in, segments out — so it sits out here. */
function redlineOf(from, to) {
  if (!from.trim()) return [['ins', to]];
  const a = from.split(/(\s+)/).filter(Boolean), b = to.split(/(\s+)/).filter(Boolean);
  const L = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  const put = (k, t) => { const last = out[out.length - 1]; if (last && last[0] === k) last[1] += t; else out.push([k, t]); };
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { put('t', a[i]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) put('del', a[i++]);
    else put('ins', b[j++]);
  }
  while (i < a.length) put('del', a[i++]);
  while (j < b.length) put('ins', b[j++]);
  /* changes with only a space between them are one change: struck together, then set out together */
  const merged = [];
  for (let n = 0; n < out.length; n++) {
    if (out[n][0] === 't') { merged.push(out[n]); continue; }
    let del = '', ins = '';
    for (; n < out.length; n++) {
      const [k, t] = out[n];
      if (k === 'del') del += t;
      else if (k === 'ins') ins += t;
      else if (!t.trim() && n + 1 < out.length && out[n + 1][0] !== 't') { del += t; ins += t; }
      else { n--; break; }
    }
    if (del) merged.push(['del', del]);
    if (ins) merged.push(['ins', ins]);
  }
  /* a rewrite reads better struck whole and set out again than as a dozen small cuts */
  if (merged.filter(x => x[0] !== 't').length > 6) return [['del', from], ['ins', '\n' + to]];
  return merged;
}

function reviewPage(req, onStatus) {
  const A = JV_REVIEWS[req.review];
  const J = (cls) => (cls ? cls.split(/\s+/).filter(Boolean).map(c => 'jv-' + c).join(' ') : '');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = J(cls); if (text != null) n.textContent = text; return n; };
  const pct = (p) => `${Math.round(p * 100)}%`;
  const pane = el('div', '');
  pane.addEventListener('click', (e) => {
    if (R.ai && !R.ai.busy && !e.target.closest('.jv-airow, .jv-aiedit, .menu')) { R.ai = null; renderWorkspace(); }
  });
  pane.className = 'jv';
  const $ = (id) => pane.querySelector('#jv-' + CSS.escape(id));
  const ME = USER.name;

  const STATUS = {
    unacceptable: { label: 'Unacceptable', order: 0 },
    fallback: { label: 'Fallback', order: 2 },
    preferred: { label: 'Preferred', order: 3 },
    missing: { label: 'Missing', order: 4 },
    none: { label: 'Not in playbook', order: 5 },
  };
  /* the three positions wear the playbook's marks; the other two keep Jev's */
  const ICON = {
    preferred: PBV_MARK.preferred, fallback: PBV_MARK.fallback, unacceptable: PBV_MARK.walkaway,
    none: '<svg width="6" height="6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>',
    missing: '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };
  const ALL_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".6" fill="currentColor"/><circle cx="4" cy="12" r=".6" fill="currentColor"/><circle cx="4" cy="18" r=".6" fill="currentColor"/></svg>';
  const CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const CHEV = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
  const FILTERS = [
    [['all', 'All clauses']],
    [['unacceptable', 'Unacceptable'], ['fallback', 'Fallback'], ['preferred', 'Preferred']],
    [['missing', 'Missing'], ['none', 'Not in playbook']],
    [['changed', 'Their changes'], ['open', 'Not reviewed']],
  ];
  const icon = (s) => { const i = el('span', 'ic ' + s); i.innerHTML = ICON[s]; i.title = STATUS[s].label; return i; };
  const toast = (msg, action) => pbToast(msg, action);
  const segs = (list, ours) => {
    const f = document.createDocumentFragment();
    for (const [k, t] of list) {
      if (k === 'ins') f.append(el('ins', ours ? 'ours' : null, t));
      else if (k === 'del') f.append(el('del', ours ? 'ours' : null, t));
      else f.append(ours ? el('span', 'keep', t) : document.createTextNode(t));
    }
    return f;
  };

  /* ── state: the review, and the reviewer's work on it ── */
  const w = req.work || {};
  const R = { a: null, open: new Set(), choice: {}, applied: { ...(w.applied || {}) }, dismissed: new Set(), q: '', filter: 'all', focus: null,
    deep: {}, edits: JSON.parse(JSON.stringify(w.edits || {})), ai: null, mode: { ...(w.mode || {}) }, notes: JSON.parse(JSON.stringify(w.notes || {})), composing: {}, editingNote: null,
    tab: req.tab || 'playbook', chat: [], askContext: '', askDraft: '', askCite: null };
  /* what the pane knows beyond the playbook (review-plus-data.js): the run's setup, the
     counterparty, what their changes add up to, their comments; and the reviewer's own
     progress, sign-offs and stacked playbooks, kept with the request like the rest */
  const RP = (typeof RP_REVIEW !== 'undefined' && RP_REVIEW[req.review]) || {};
  /* whose paper and which side, read from the contract when the run has no setup of its own */
  const guessed = { side: /nda/i.test(A.playbook?.name || '') ? null : /supplier/i.test(A.playbook?.name || '') ? 'customer' : 'provider', paper: /their paper/i.test(A.name) ? 'theirs' : 'ours', approach: 'strict' };
  Object.assign(R, { setup: { ...guessed, ...(RP.setup || {}), ...(w.setup || {}) },
    reviewed: new Set(w.reviewed || []), signoff: { ...(w.signoff || {}) }, stack: [...(w.stack || [])], deal: null, setupOpen: false, signing: null });
  for (const [n, list] of Object.entries(RP.comments || {})) list.forEach((x, i) => {
    const id = `their-${n}-${i}`;
    if (!(R.notes[n] ||= []).some(m => m.id === id)) R.notes[n].unshift({ id, text: x.text, internal: false, by: x.by, org: x.org, when: x.when, theirs: true, draft: x.draft });
  });
  /* what you applied and noted is kept with the request */
  const persist = () => { req.work = { applied: R.applied, mode: R.mode, notes: R.notes, edits: R.edits, ...(R.setupSet || w.setup ? { setup: R.setup } : {}), reviewed: [...R.reviewed], signoff: R.signoff, stack: R.stack }; save(); };
  const rid = () => Math.random().toString(36).slice(2, 9);

  const all = () => [...R.a.clauses.filter(c => !c.quiet), ...R.a.missing];   // a round lists only what changed
  const sorted = (list) => [...list].sort((x, y) => (x.from ? 1 : 0) - (y.from ? 1 : 0) || STATUS[x.status].order - STATUS[y.status].order);
  const optionsFor = (c) => [...c.suggestions];

  // Filter dropdown: a button plus a popover menu (icons, counts, check on the current one).
  function filterMenu(k) {
    const wrap = el('div', 'fmenu');
    const count = (v) => (v === 'all' ? all().length : v === 'changed' ? all().filter(c => c.changed).length
      : v === 'open' ? all().filter(c => !isReviewed(c)).length : k[v] || 0);
    const label = FILTERS.flat().find(([v]) => v === R.filter)?.[1] || 'All clauses';
    const ic = (v) => {
      if (v === 'all') { const x = el('span', 'ic all'); x.innerHTML = ALL_ICON; return x; }
      if (v === 'changed' || v === 'open') { const x = el('span', 'ic all'); x.innerHTML = v === 'changed' ? RP_IC.changed : RP_IC.open; return x; }
      return icon(v);
    };
    const btn = el('button', 'fbtn' + (R.filter !== 'all' ? ' on' : ''));
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    const chev = el('span', 'fc'); chev.innerHTML = CHEV;
    btn.append(ic(R.filter), el('span', 'fv', label), chev);
    const menu = el('div', 'fpop');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    FILTERS.forEach((group) => {
      for (const [v, t] of group) {
        const n = count(v);
        const item = el('button', 'fitem' + (v === R.filter ? ' sel' : ''));
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', v === R.filter);
        item.disabled = !n && v !== 'all' && v !== R.filter;
        const ck = el('span', 'fck'); if (v === R.filter) ck.innerHTML = CHECK;
        item.append(ic(v), el('span', 'fl', t), el('span', 'fn', String(n)), ck);
        item.onclick = () => { close(); R.filter = v; renderWorkspace(); };
        menu.append(item);
      }
    });
    const items = () => [...menu.querySelectorAll('.jv-fitem:not(:disabled)')];
    const onDoc = (e) => { if (!wrap.contains(e.target)) close(); };
    const onKey = (e) => {
      const list = items(), i = list.indexOf(document.activeElement);
      if (e.key === 'Escape') { close(); btn.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
    };
    function open() {
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
      (menu.querySelector('.jv-fitem.jv-sel') || items()[0])?.focus();
      setTimeout(() => document.addEventListener('click', onDoc), 0);
      document.addEventListener('keydown', onKey);
    }
    function close() {
      menu.hidden = true; btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    }
    btn.onclick = () => (menu.hidden ? open() : close());
    btn.onkeydown = (e) => { if (e.key === 'ArrowDown' && menu.hidden) { e.preventDefault(); open(); } };
    wrap.append(btn, menu);
    return wrap;
  }

  function rangeFor(body, quote) {
    const nodes = [], walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let text = '';
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.parentElement.closest('del')) continue;
      nodes.push([n, text.length]); text += n.data;
    }
    const at = text.indexOf(quote);
    if (at < 0) return null;
    const locate = (i) => { for (let k = nodes.length - 1; k >= 0; k--) if (nodes[k][1] <= i) return [nodes[k][0], i - nodes[k][1]]; };
    const [sn, so] = locate(at), [en, eo] = locate(at + quote.length);
    const r = new Range();
    try { r.setStart(sn, Math.min(so, sn.length)); r.setEnd(en, Math.min(eo, en.length)); return r; } catch { return null; }
  }

  // Softly mark each open clause's offending sentence in the document preview.
  function markIssues() {
    if (!window.CSS?.highlights || typeof Highlight === 'undefined') return;
    const ranges = [];
    for (const c of R.a?.clauses || []) {
      const quote = R.cite?.key === String(c.n) ? R.cite.quote : c.their_text;
      if (!quote || !R.open.has(String(c.n)) || R.applied[c.n] != null) continue;
      const body = $('dc-' + c.n)?.querySelector('.jv-body');
      if (!body) continue;
      const nodes = [], walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      let text = '';
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (n.parentElement.closest('del')) continue;  // their deletions aren't part of the clause now
        nodes.push([n, text.length]); text += n.data;
      }
      const at = text.replace(/\s+/g, ' ').indexOf(quote.replace(/\s+/g, ' '));
      if (at < 0) continue;
      const end = at + quote.length;
      const locate = (i) => { for (let k = nodes.length - 1; k >= 0; k--) if (nodes[k][1] <= i) return [nodes[k][0], i - nodes[k][1]]; };
      const [sn, so] = locate(at), [en, eo] = locate(end);
      const r = new Range();
      try { r.setStart(sn, Math.min(so, sn.length)); r.setEnd(en, Math.min(eo, en.length)); ranges.push(r); } catch {}
    }
    if (R.askCite) {
      const body = $('dc-' + R.askCite.n)?.querySelector('.jv-body');
      const r = body && rangeFor(body, R.askCite.quote);
      if (r) ranges.push(r);
    }
    CSS.highlights.set('jv-issue', new Highlight(...ranges));
  }

  function renderWorkspace() {
    // Keep both scroll positions across re-renders.
    const KEEP = ['.jv-docpane', '.jv-plist', '.jv-askthread'];
    const keep = KEEP.map((q) => pane.querySelector(q)?.scrollTop || 0);
    pane.innerHTML = '';
    const ws = el('div', 'ws');
    ws.append(renderDoc(), renderPanel());
    pane.append(ws);
    KEEP.forEach((q, i) => { const n = pane.querySelector(q); if (n) n.scrollTop = keep[i]; });
    markIssues();
    persist();
  }

  /* ----- Document preview (left) ----- */
  function renderDoc() {
    const a = R.a;
    const dp = el('div', 'docpane');
    /* the bar is Clavia's: the way back, which request this is, and its status */
    const bar = el('div', 'docbar');
    const back = h('button', { class: 'mx-back', type: 'button', onclick: () => { persist(); if (req.back) req.back.run(); else { mxClose('requests'); go('requests'); } } },
      h('span', { class: 'mx-back-ar', html: PB_SVG.chev }), req.back?.label || 'Contracts');
    /* a round, opened from a request: its one action is writing our response from what was applied */
    const act = req.respond
      ? h('button', { class: 'rqg-act jv-respond', type: 'button', onclick: () => { persist(); req.respond(R.applied, R.notes); } }, req.answered ? `Open our response, v${req.answered}` : 'Create our response')
      : mxStatusBtn('req', req, (k) => {
        req.activity.push({ who: USER.name, what: 'moved this to ' + MX_ST.req[k].label, when: mxNow() }); save(); onStatus?.();
      });
    bar.append(back, h('span', { class: 'mx-req-id' }, req.id), el('span', 'name', req.title || a.name), el('span', 'grow'), act);
    dp.append(bar);
    const paper = el('div', 'paper');
    paper.append(el('h1', null, a.name));
    for (const c of a.clauses) paper.append(docClause(c));
    for (const m of a.missing) if (R.applied[m.n] != null) paper.append(docClause(m));
    if (Object.values(R.notes).some((l) => l.length)) paper.classList.add('jv-has-comments');
    dp.append(paper);
    return dp;
  }

  function docClause(c) {
    const key = String(c.n);
    const d = el('div', `dc s-${c.status}` + (R.focus === key ? ' focus' : '') + (c.status === 'missing' ? ' missing' : ''));
    d.id = 'jv-dc-' + c.n;
    d.append(el('h2', null, c.status === 'missing' ? `+ ${c.heading}` : c.heading));
    const body = el('div', 'body');
    const applied = R.applied[key];
    if (applied != null) {
      const m = R.mode[key] || {};
      if (m.tracked === false || m.accepted) {
        body.append(document.createTextNode(applied));  // applied cleanly, or their change accepted: just the text
      } else {
        // Their document as it stands, with our redline on top.
        const deepOpt = (R.deep[key]?.options || []).find((o) => o.text === applied);
        const opt = deepOpt || optionsFor(c).find((o) => o.text === applied) || roundOptions(c).find((o) => o.text === applied)
          || Object.values(R.edits[key] || {}).find((o) => o.text === applied);
        body.append(segs(opt ? opt.segments : [['ins', applied]], true));
      }
    } else {
      body.append(segs(c.segments));
    }
    d.append(body);
    const notes = R.notes[key] || [];
    if (notes.length) {
      // Word-style margin notes, level with the clause.
      const col = el('div', 'dnotes');
      col.onclick = (e) => e.stopPropagation();
      if (notes.some((n) => !n.internal)) col.classList.add('jv-has-shared');
      for (const n of notes) col.append(commentNote(key, n));
      d.append(col);
    }
    d.onclick = () => { if (!getSelection()?.toString().trim()) openRow(key, true); };
    return d;
  }

  /* ----- Review panel (right) ----- */
  function renderPanel() {
    const a = R.a;
    const p = el('div', 'panel');
    const head = el('div', 'phead');
    // The playbook name opens a bottom sheet for running another playbook.
    const sw = el('button', 'pbswitch');
    sw.title = 'Run a different playbook';
    const chev = el('span', 'chev');
    chev.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
    sw.append(el('span', 't', withWord(a.playbook.name)), chev);
    sw.onclick = () => openPlaybookSheet(p);
    /* the same playbook, read again: one quiet button at the far corner */
    const again = el('button', 'prerun');
    again.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>';
    again.dataset.tip = 'Re-run'; again.setAttribute('aria-label', 'Re-run');
    again.onclick = () => {
      const pb = pbList().find(x => x.id === a.playbook.id);
      renderProgress(`${a.name} with the ${withWord(a.playbook.name)}`, () => {
        Object.assign(R, { a: withStack(pb ? rerun(pb) : A), open: new Set(), choice: {}, dismissed: new Set(), q: '', filter: 'all', focus: null, tab: 'playbook' });
        R.deep = R.a.deep || {};
        renderWorkspace();
        toast(`Ran the ${withWord(a.playbook.name)} again`);
      });
    };
    const top = el('div', 'phead-top');
    /* how far through: reviewed means applied, accepted, dismissed, signed off or marked */
    const done = all().filter(isReviewed).length;
    const prog = el('span', 'prog', `${done} of ${all().length} reviewed`);
    const more = el('button', 'prerun pmore');
    more.innerHTML = RP_IC.dots; more.dataset.tip = 'More'; more.setAttribute('aria-label', 'More');
    more.onclick = (e) => { e.stopPropagation(); finishMenu(more); };
    top.append(sw, el('span', 'grow'), prog, again, more);
    head.append(top, contextLine());

    const k = a.counts, u = k.unacceptable || 0, f = k.fallback || 0, g = k.preferred || 0;
    const stack = el('div', 'stack');
    if (!u && !f && !g) stack.hidden = true;
    for (const [cls2, n, t] of [['seg-u', u, 'Unacceptable'], ['seg-f', f, 'Fallback'], ['seg-p', g, 'Preferred']]) {
      const seg = el('div', cls2, String(n));
      seg.style.flexGrow = Math.max(n, 0.6);
      seg.title = `${n} ${t}`;
      stack.append(seg);
    }
    head.append(stack);

    const search = el('label', 'search2');
    search.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>';
    const q = Object.assign(document.createElement('input'), { placeholder: 'Search', value: R.q, type: 'search' });
    q.oninput = () => { R.q = q.value; renderList(list); };
    search.append(q);
    const tools = el('div', 'tools2');
    tools.append(search, filterMenu(k));
    head.append(tools);

    let list = null;
    if (R.tab === 'ask') p.append(askView());
    else {
      p.append(head);
      if (R.setupOpen) p.append(setupCard());
      list = el('div', 'plist');
      list.addEventListener('scroll', () => head.classList.toggle('jv-scrolled', list.scrollTop > 2), { passive: true });
      p.append(list);
      renderList(list);
    }

    // Bottom tabs: the clause review, or questions about this document.
    const tabs = el('div', 'ptabs');
    const TAB_ICONS = {
      playbook: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 4v16"/><path d="M12.5 8.5h4M12.5 12h4M12.5 15.5h2.5"/></svg>',
      ask: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16.9A2.5 2.5 0 0 1 4 14.5z"/><path d="M8.5 9h7M8.5 12h4.5"/></svg>',
    };
    /* a page that opened from a request can add its own tab (Comments), which leads back there */
    if (req.extraTab) TAB_ICONS[req.extraTab.k] = req.extraTab.icon;
    for (const [t, label] of [['playbook', 'Playbook'], ['ask', 'Ask Clavia'], ...(req.extraTab ? [[req.extraTab.k, req.extraTab.label]] : [])]) {
      const b = el('button');
      /* Ask is Clavia, so it wears Clavia's mark */
      if (t === 'ask') b.append(quillEl('static', { cls: 'jv-tab-q' })); else b.innerHTML = TAB_ICONS[t];
      b.append(el('span', null, label));
      b.setAttribute('aria-selected', (R.tab || 'playbook') === t);
      b.onclick = () => { if (req.extraTab && t === req.extraTab.k) { req.extraTab.run(); return; } if ((R.tab || 'playbook') !== t) { R.tab = t; renderWorkspace(); } };
      tabs.append(b);
    }
    p.append(tabs);
    return p;
  }

  /* ---------- Ask: questions about the contract, and work on it ----------
     Three things can be said here. A question is answered from the
     contract's own words. "Flag the issues" has Clavia ask how hard to
     push, then stage a redline for every clause off its position — cards
     you apply or dismiss one by one, or all at once. And a selection can
     be redrafted. Whatever is applied goes into the contract as a tracked
     change, where you can see it. No model yet: the redlines are the
     review's own, and the flow around them is scripted. */
  /* files added to Ask go with the next thing said, then clear */
  const takeFiles = () => { const f = R.askFiles || []; R.askFiles = []; return f.length ? f : undefined; };
  const paintAsk = (how) => { if (how) R[how] = true; if (pane.isConnected && R.tab === 'ask') renderWorkspace(); };
  const bare = (hd) => hd.replace(/^\s*\d+(\.\d+)*\.?\s+/, '');
  const optsOf = (c) => {
    const list = [...(R.deep[String(c.n)]?.options || [])];
    if (!list.length) list.push(...optionsFor(c));
    return list.filter(o => o.text && o.segments);
  };
  /* one suggestion: the clause, the wordings on offer, and which is showing */
  const itemOf = (c, prefer) => {
    const opts = optsOf(c);
    if (!opts.length) return null;
    const want = prefer === 'fallback' ? /^fallback$/ : /^(starting|preferred)$/;
    const i = opts.findIndex(o => want.test(o.key));
    return { key: String(c.n), title: bare(c.heading), opts, choice: i < 0 ? 0 : i, open: false, dismissed: false };
  };
  const stateOf = (it) => R.applied[it.key] != null ? 'applied' : it.dismissed ? 'dismissed' : 'pending';
  const pendingIn = (groups) => groups.flatMap(g => g.items).filter(it => stateOf(it) === 'pending');
  const jumpTo = (key) => {
    const dc = $('dc-' + key);
    if (!dc) return;
    for (const x of pane.querySelectorAll('.jv-dc.jv-focus')) x.classList.remove('jv-focus');
    dc.classList.add('jv-focus');
    dc.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  const applyItems = (items) => {
    for (const it of items) { R.applied[it.key] = it.opts[it.choice].text; R.mode[it.key] = { tracked: true }; }
    R.focus = items[0].key;
    renderWorkspace();
    jumpTo(items[0].key);
    if (items.length > 1) toast(`Applied ${items.length} changes`, { label: 'Undo', run: () => {
      for (const it of items) { delete R.applied[it.key]; delete R.mode[it.key]; }
      renderWorkspace();
    } });
  };

  /* ── Edit with AI ─────────────────────────────────────────────
     A wording on offer can be changed by saying what to change. The new
     wording replaces the one showing, redlined against their text again.
     No model is called here: a handful of plain instructions are worked
     out by rule, and anything else is declined rather than guessed. */
  const NUM_W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
    'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const numWords = (n) => n < 20 ? NUM_W[n] : n < 100 ? TENS_W[Math.floor(n / 10)] + (n % 10 ? '-' + NUM_W[n % 10] : '')
    : n < 1000 && n % 100 === 0 ? NUM_W[n / 100] + ' hundred' : String(n);
  const sentencesOf = (t) => t.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [t];
  const tidyText = (t) => t.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').replace(/,\s*\./g, '.').trim();
  function aiRewrite(text, ask) {
    const q = ask.trim().replace(/[.\s]+$/, '');
    const quoted = (x) => x.trim().replace(/^["“'‘]|["”'’]$/g, '');
    const rx = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    /* take something out */
    let m = /^(?:please )?(?:remove|delete|drop|cut|strike|take out)\s+(.+)$/i.exec(q);
    if (m) {
      const ss = sentencesOf(text);
      if (/\blast sentence\b/i.test(m[1])) return ss.length > 1 ? tidyText(ss.slice(0, -1).join('')) : null;
      const whole = /\bsentence\b|\bpart\b|\bbit\b/i.test(m[1]);
      const what = quoted(m[1].replace(/^(?:the |any )?(?:sentence|part|bit|reference|wording|words?)\s+(?:about|on|that says|saying|to)\s+/i, '').replace(/^(?:the|any)\s+/i, ''));
      const at = text.toLowerCase().indexOf(what.toLowerCase());
      if (at >= 0 && !whole) return tidyText(text.slice(0, at) + text.slice(at + what.length));
      const words = what.toLowerCase().split(/\W+/).filter(x => x.length > 3);
      const keep = ss.filter(x => !(words.length && words.every(wd => x.toLowerCase().includes(wd))));
      return keep.length && keep.length < ss.length ? tidyText(keep.join('')) : null;
    }
    /* one phrase for another */
    m = /^(?:please )?(?:change|replace|swap)\s+(.+?)\s+(?:to|with|for)\s+(.+)$/i.exec(q);
    if (m) {
      const from = quoted(m[1]), to = quoted(m[2]);
      const hit = new RegExp(rx(from), 'i').exec(text);
      if (hit) return tidyText(text.slice(0, hit.index) + to + text.slice(hit.index + hit[0].length));
    }
    /* a number moves, and its spelt-out form moves with it */
    const nums = [...q.matchAll(/(\d+(?:\.\d+)?)\s*(%|percent|business days?|days?|weeks?|months?|years?|hours?|times?)?/gi)];
    if (nums.length) {
      const to = nums[nums.length - 1][1], unit = (nums[nums.length - 1][2] || nums[0][2] || '').toLowerCase().replace(/s$/, '');
      let from = nums.length > 1 ? nums[0][1] : null;
      if (!from) {
        const u = unit === '%' || unit === 'percent' ? '(\\d+(?:\\.\\d+)?)\\s*(?:%|percent)' : unit ? `(\\d+(?:\\.\\d+)?)\\)?\\s*(?:business |calendar |working )?${rx(unit.replace(/^business /, ''))}` : null;
        from = (u && new RegExp(u, 'i').exec(text))?.[1] || /\d+(?:\.\d+)?/.exec(text)?.[0];
      }
      if (from && from !== to && new RegExp(`\\b${rx(from)}\\b`).test(text)) {
        const spelt = new RegExp(`[A-Za-z-]+((?: percent)? \\()${rx(from)}(%?\\))`);
        const next = spelt.test(text) && /^\d+$/.test(to)
          ? text.replace(spelt, (_, a, b) => `${numWords(+to)}${a}${to}${b}`)
          : text.replace(new RegExp(`\\b${rx(from)}\\b`), to);
        return next !== text ? next : null;
      }
    }
    /* a sentence more */
    m = /^(?:please )?(?:add|append|include)(?: a sentence)?(?: that| saying| to say)?[:\s]+(.+)$/i.exec(q);
    if (m && m[1].split(/\s+/).length > 2) {
      const add = quoted(m[1]);
      return `${text.trim()} ${add[0].toUpperCase()}${add.slice(1)}${/[.!?]$/.test(add) ? '' : '.'}`;
    }
    /* less of it */
    if (/\b(short|shorter|shorten|concise|tighten|tighter|trim|simpler|simplify|brief)\b/i.test(q)) {
      const ss = sentencesOf(text);
      return ss.length > 1 ? tidyText(ss.slice(0, -1).join('')) : null;
    }
    return null;
  }
  /* the wordings on offer, with any that have been edited standing in for the original */
  const edited = (key, opts) => opts.map(o => R.edits[key]?.[o.key] ? { ...o, ...R.edits[key][o.key] } : o);
  const aiOn = (key) => R.ai && R.ai.key === key ? R.ai : null;
  function aiButton(key) {
    const b = el('button', 'aiedit');
    b.append(quillEl('static', { cls: 'jv-ai-q' }), el('span', null, 'Edit with AI'));
    b.onclick = () => { R.ai = { key, draft: '' }; renderWorkspace(); };
    return b;
  }
  /* the foot of the card while a change is being asked for: one line to
     write in, then the wording is rewritten in place */
  /* Asking for a change opens "Edit with AI" into a pill to write in,
     in the foot where it stood, with Apply still beside it. Send rewrites
     the wording above; Escape or a click anywhere else closes the pill. */
  function aiRow(key, c, sel, apply) {
    const st = aiOn(key);
    const row = el('div', 'airow');
    const pill = el('div', 'aipill' + (st.busy ? ' busy' : '') + (st.miss ? ' miss' : ''));
    if (st.miss) st.miss = false;
    if (st.busy) {
      pill.append(quillEl('work', { cls: 'jv-ai-q' }), el('span', 'aipill-w', 'Rewriting'));
      row.append(pill, apply);
      return row;
    }
    const inp = Object.assign(document.createElement('input'), { type: 'text', value: st.draft || '', placeholder: 'What should change?' });
    inp.setAttribute('aria-label', 'What should change?');
    const send = el('button', 'aipill-send');
    send.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>';
    send.setAttribute('aria-label', 'Send'); send.dataset.tip = 'Send';
    send.disabled = !inp.value.trim();
    inp.oninput = () => { st.draft = inp.value; send.disabled = !inp.value.trim(); };
    const shut = () => { R.ai = null; renderWorkspace(); };
    const go = () => {
      const ask = inp.value.trim();
      if (!ask) return;
      const next = aiRewrite(sel.text, ask);
      st.busy = true; renderWorkspace();
      setTimeout(() => {
        if (R.ai !== st) return;
        if (!next || next === sel.text) { st.busy = false; st.miss = true; renderWorkspace(); return; }  // the pill shakes, and says nothing
        const before = R.edits[key]?.[sel.key];
        (R.edits[key] ||= {})[sel.key] = { text: next, segments: redlineOf(c.text || '', next), edited: true };
        R.ai = null; R.fresh = key;
        renderWorkspace();
        toast('Wording updated', { label: 'Undo', run: () => {
          if (before) R.edits[key][sel.key] = before; else delete R.edits[key][sel.key];
          renderWorkspace();
        } });
      }, 1100);
    };
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); go(); }
      if (e.key === 'Escape') { e.stopPropagation(); shut(); }
    };
    send.onclick = go;
    pill.append(quillEl('static', { cls: 'jv-ai-q' }), inp, send);
    row.append(pill, apply);
    requestAnimationFrame(() => { inp.focus({ preventScroll: true }); inp.setSelectionRange(inp.value.length, inp.value.length); });
    return row;
  }
  /* the redline of a card: it lands softly when it has just been rewritten */
  const freshBody = (key, body) => {
    if (R.fresh === key) { body.classList.add('jv-fresh'); R.fresh = null; }
    if (aiOn(key)?.busy) body.classList.add('jv-rewriting');
    return body;
  };

  /* ── choosing a position ──────────────────────────────────────
     One control wherever a wording is on offer: the position's mark and
     name on a soft row, opening the app's own menu. */
  const POS_MARK = { starting: 'preferred', preferred: 'preferred', fallback: 'fallback', fallback2: 'fallback' };
  const posMark = (o) => POS_MARK[o.key] ? PBV_MARK[POS_MARK[o.key]] : '';
  function posPick(opts, idx, onPick, { compact = false, head = false } = {}) {
    const b = el('button', 'pospick' + (compact ? ' compact' : '') + (head ? ' head' : ''));
    b.type = 'button';
    b.setAttribute('aria-haspopup', 'menu');
    const mk = posMark(opts[idx]);
    if (mk) { const m = el('span', 'pospick-m'); m.innerHTML = mk; b.append(m); }
    const cv = el('span', 'pospick-c'); cv.innerHTML = CHEV;
    b.append(el('span', 'pospick-t', opts[idx].label), cv);
    b.onclick = (e) => {
      e.stopPropagation();
      if (b.classList.contains('jv-on')) return closeMenu();
      menu(b, opts.map((o, i) => ({ html: posMark(o) || undefined, label: o.label, tick: i === idx, run: () => { if (i !== idx) onPick(i); } })));
      /* the list hangs from the row at the row's own width */
      const r = b.getBoundingClientRect();
      /* in a heading it is a small thing at the right edge, and its list hangs from that edge */
      if (compact) openMenu.style.left = Math.max(12, r.right - openMenu.offsetWidth) + 'px';
      else { openMenu.style.minWidth = r.width + 'px'; openMenu.style.left = r.left + 'px'; }
      b.classList.add('jv-on');
      const seen = new MutationObserver(() => { if (!openMenu || !openMenu.isConnected) { b.classList.remove('jv-on'); seen.disconnect(); } });
      seen.observe(document.body, { childList: true });
    };
    return b;
  }

  const TICK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const CROSS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const SMALLCHEV = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';

  /* a place in the contract you can go to from the chat */
  const refChip = (c) => {
    const b = el('button', 'aref');
    b.append(el('span', null, `${clauseRef(c)} ${bare(c.heading)}`.replace(/^(§[\d.]+) \1/, '$1')));
    const ar = el('span', 'aref-ar'); ar.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 16 16 8M9 8h7v7"/></svg>';
    b.append(ar);
    b.dataset.tip = 'Show in Contract';
    b.onclick = () => jumpTo(String(c.n));
    return b;
  };

  function suggestionCard(it) {
    const st = stateOf(it);
    if (st !== 'pending') {
      /* settled: one line, and a way back */
      const row = el('div', 'sg ' + (st === 'applied' ? 'done' : 'off'));
      const t = el('button', 'sg-t', it.title);
      t.onclick = () => jumpTo(it.key);
      if (st === 'applied') { const ok = el('span', 'sg-ok'); ok.innerHTML = TICK; row.append(ok); }
      row.append(t, el('span', 'sg-state', st === 'applied' ? 'Applied' : 'Dismissed'), el('span', 'grow'));
      const undo = el('button', 'viewlink', 'Undo');
      undo.onclick = () => { if (st === 'applied') { delete R.applied[it.key]; delete R.mode[it.key]; } else it.dismissed = false; renderWorkspace(); };
      row.append(undo);
      return row;
    }
    const opt = it.opts[it.choice];
    const card = el('div', 'scard sg');
    const hd = el('div', 'sg-h');
    const t = el('button', 'sg-t', it.title);
    t.dataset.tip = 'Show in Contract';
    t.onclick = () => jumpTo(it.key);
    hd.append(t);
    card.append(hd);
    /* the position to ask for sits over the wording it produces */
    if (it.opts.length > 1) card.append(posPick(it.opts, it.choice, (i) => { it.choice = i; renderWorkspace(); }));
    const body = el('div', 'sbody rl');
    body.append(segs(opt.segments, true));
    card.append(body);
    const foot = el('div', 'sfoot');
    const deep = R.deep[it.key];
    if (deep?.summary) {
      if (it.open) {
        const r = el('div', 'sg-reason');
        r.append(el('p', null, deep.summary));
        for (const pt of deep.reasoning || []) if (!/^The term at issue/.test(pt.text)) r.append(el('p', null, pt.text));
        card.append(r);
      }
      const why = el('button', 'sg-why' + (it.open ? ' open' : ''));
      const cv = el('span', 'sg-why-c'); cv.innerHTML = SMALLCHEV;
      why.append(cv, el('span', null, 'Reasoning'));
      why.onclick = () => { it.open = !it.open; renderWorkspace(); };
      foot.append(why);
    }
    /* the decision is always in sight, in words */
    const acts = el('div', 'acts2');
    const no = el('button', 'btn ghost', 'Dismiss');
    no.onclick = () => { it.dismissed = true; renderWorkspace(); };
    const yes = el('button', 'btn primary', 'Apply');
    yes.onclick = () => applyItems([it]);
    acts.append(no, yes);
    foot.append(el('span', 'grow'), acts);
    card.append(foot);
    return card;
  }

  function runEl(m) {
    const box = el('div', 'amsg jev arun');
    for (const s of m.steps) { const line = el('div', 'astep', s); box.append(line); }
    if (m.working) {
      const w = el('div', 'awork');
      w.append(quillEl('work', { cls: 'jv-awork-q' }), el('span', null, m.working));
      box.append(w);
    }
    /* how many there are, and one button for the lot */
    const total = (m.groups || []).reduce((n, g) => n + g.items.length, 0), left = pendingIn(m.groups || []);
    if (total > 1) {
      const top = el('div', 'sg-top');
      top.append(el('b', null, `${total} suggestions`), el('span', 'grow'));
      if (left.length) {
        const all = el('button', 'btn line', 'Apply all');
        all.onclick = () => applyItems(left);
        top.append(all);
      }
      box.append(top);
    }
    for (const g of m.groups || []) {
      const wrap = el('div', 'sgroup');
      for (const it of g.items) wrap.append(suggestionCard(it));
      box.append(wrap);
    }
    /* a skill's answer: one line per finding, each pointing at its clause, then what it means */
    if (m.note && !m.lines?.length) {
      const p = el('p', 'atext');
      for (const part of m.note) p.append(typeof part === 'string' ? document.createTextNode(part) : refChip(part.ref));
      box.append(p);
    }
    if (m.lines?.length) {
      const ul = el('ul', 'alines');
      for (const line of m.lines) {
        const li = el('li');
        for (const part of line) li.append(typeof part === 'string' ? document.createTextNode(part) : part.ref ? refChip(part.ref) : el('b', null, part.b));
        ul.append(li);
      }
      box.append(ul);
      if (m.note) box.append(el('p', 'atext', m.note.filter(x => typeof x === 'string').join('')));
    }
    if (m.acts?.length) {
      const row = el('div', 'aacts');
      for (const a of m.acts) { const b = el('button', 'btn line', a.label); b.onclick = a.run; row.append(b); }
      box.append(row);
    }
    return box;
  }

  /* the question a run is waiting on, docked over the box */
  function questionEl(m) {
    const qn = m.question;
    const card = el('div', 'aq');
    const top = el('div', 'aq-top');
    const x = el('button', 'aq-x'); x.innerHTML = CROSS; x.setAttribute('aria-label', 'Skip'); x.dataset.tip = 'Skip';
    x.onclick = () => qn.answer(null, null);
    top.append(el('b', null, qn.title), x);
    card.append(top);
    qn.options.forEach((o, i) => {
      const b = el('button', 'aq-opt');
      b.append(el('span', 'aq-n', String(i + 1)), el('span', 'aq-l', o.label));
      if (i === 0) { const k = el('span', 'aq-key'); k.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 6v6a3 3 0 0 1-3 3H6"/><path d="m9.5 11.5-3.5 3.5 3.5 3.5"/></svg>'; b.append(k); }
      b.onclick = () => qn.answer(o.k, o.label);
      card.append(b);
    });
    const other = el('label', 'aq-opt aq-other');
    const pen = el('span', 'aq-n'); pen.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
    const input = Object.assign(document.createElement('input'), { placeholder: 'Something else', type: 'text' });
    input.className = 'jv-aq-in';
    input.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && input.value.trim()) qn.answer(qn.options[0].k, input.value.trim()); if (e.key === 'Escape') input.blur(); };
    other.append(pen, input);
    card.append(other);
    const foot = el('div', 'aq-foot');
    const skip = el('button', 'btn ghost', 'Skip');
    skip.onclick = () => qn.answer(null, null);
    foot.append(skip);
    card.append(foot);
    return card;
  }
  /* 1, 2, 3 answer it; Enter takes the first; Escape skips — unless you are typing */
  const onAskKey = (e) => {
    if (!pane.isConnected) return document.removeEventListener('keydown', onAskKey);
    const m = R.tab === 'ask' && R.chat.find(x => x.question);
    if (!m || e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = e.target.closest?.('input, textarea') && (e.target.value || e.target.classList.contains('jv-aq-in'));
    if (typing) return;
    const qn = m.question, i = +e.key - 1;
    if (qn.options[i]) { e.preventDefault(); qn.answer(qn.options[i].k, qn.options[i].label); }
    else if (e.key === 'Enter') { e.preventDefault(); qn.answer(qn.options[0].k, qn.options[0].label); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); qn.answer(null, null); }
  };
  document.addEventListener('keydown', onAskKey);

  function askView() {
    const wrap = el('div', 'askview');
    const thread = el('div', 'askthread');
    if (!R.chat.length) {
      /* before anything is asked: whose answers these are, in Clavia's own hand */
      const hero = el('div', 'askhero');
      hero.append(quillEl('greet', { cls: 'jv-askquill', then: 'idle' }), el('h2', null, 'Ask Clavia'),
        el('p', null, 'Ask about this contract, or type / for a skill.'));
      thread.append(hero);
    } else {
      /* once a chat is under way the name moves up into a slim header */
      const head = el('div', 'askhead');
      const fresh = el('button', 'askhead-new');
      fresh.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
      fresh.dataset.tip = 'New Chat'; fresh.setAttribute('aria-label', 'New Chat');
      fresh.onclick = () => { R.chat = []; R.askContext = ''; persist(); renderWorkspace(); };
      head.append(quillEl('static', { cls: 'jv-askhead-q' }), el('h2', null, 'Ask Clavia'), el('span', 'grow'), fresh);
      thread.addEventListener('scroll', () => head.classList.toggle('jv-scrolled', thread.scrollTop > 2), { passive: true });
      requestAnimationFrame(() => head.classList.toggle('jv-scrolled', thread.scrollTop > 2));
      wrap.append(head);
    }
    for (const m of R.chat) {
      if (m.role === 'you') {
        const you = el('div', 'amsg you');
        if (m.context) you.append(el('div', 'actx', `“${m.context.length > 120 ? m.context.slice(0, 120) + '…' : m.context}”`));
        if (m.files?.length) you.append(fileChips(m.files));
        if (m.text) you.append(el('div', 'abubble', m.text));
        thread.append(you);
      } else if (m.kind === 'run') {
        thread.append(runEl(m));
      } else {
        const jev = el('div', 'amsg jev');
        if (m.pending) {
          const wk = el('div', 'awork');
          wk.append(quillEl('work', { cls: 'jv-awork-q' }), el('span', null, 'Reading the contract'));
          jev.append(wk); thread.append(jev); continue;
        }
        jev.append(el('p', 'atext', m.answer));
        for (const c of m.citations || []) {
          const q = el('button', 'aquote');
          q.append(el('span', null, `“${c.text}”`));
          if (c.n != null) q.append(el('span', 'asec', clauseRef(c)));
          q.title = 'Show in document';
          q.onclick = () => showCitation(c);
          jev.append(q);
        }
        thread.append(jev);
      }
    }
    wrap.append(thread);

    const box = el('div', 'askbox');
    const waiting = R.chat.find(m => m.question);
    if (waiting) box.append(questionEl(waiting));
    /* a selection being asked about rides above the box; the whole contract needs no label */
    if (R.askContext) {
      const chip = el('div', 'askchip sel');
      chip.append(el('span', null, `“${R.askContext.length > 70 ? R.askContext.slice(0, 70) + '…' : R.askContext}”`));
      const x = el('button', null, '×');
      x.setAttribute('aria-label', 'Ask about the whole document instead');
      x.onclick = () => { R.askContext = ''; renderWorkspace(); };
      chip.append(x);
      box.append(chip);
    }
    /* "/" offers the skills: a short list over the box, filtered as you type */
    const slash = /^\/(\S*)$/.exec(R.askDraft || '');
    if (slash) {
      const q = slash[1].toLowerCase();
      const hits = RP_SKILLS.filter(x => !q || x.label.toLowerCase().includes(q));
      const sl = el('div', 'slash');
      sl.append(el('div', 'slash-h', 'Skills'));
      hits.forEach((x, i) => {
        const b = el('button', 'slash-it' + (i === 0 ? ' on' : ''));
        b.append(el('span', 'slash-l', x.label), el('span', 'slash-s', x.say));
        b.onmousedown = (e) => { e.preventDefault(); runSkill(x); };
        sl.append(b);
      });
      if (!hits.length) sl.append(el('div', 'slash-none', 'No skill matches.'));
      box.append(sl);
    }
    if ((R.askFiles || []).length) box.append(fileChips(R.askFiles, (i) => { R.askFiles.splice(i, 1); R.focusAsk = true; renderWorkspace(); }));
    const ta = Object.assign(document.createElement('textarea'), { rows: 1, placeholder: 'Ask, or type / for skills', value: R.askDraft || '' });
    const send = el('button', 'send');
    send.setAttribute('aria-label', 'Send');
    send.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; };
    ta.oninput = () => {
      const was = /^\/\S*$/.test(R.askDraft || ''), now = /^\/\S*$/.test(ta.value);
      R.askDraft = ta.value; send.disabled = !ta.value.trim() && !hasFiles(); grow();
      if (was || now) { R.focusAsk = true; renderWorkspace(); }
    };
    ta.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const sl = /^\/(\S*)$/.exec(ta.value);
        if (sl) { const hit = RP_SKILLS.find(x => !sl[1] || x.label.toLowerCase().includes(sl[1].toLowerCase())); if (hit) runSkill(hit); return; }
        if (ta.value.trim() || hasFiles()) sendAsk(ta.value);
      }
      if (e.key === 'Escape' && /^\//.test(ta.value)) { e.stopPropagation(); R.askDraft = ''; R.focusAsk = true; renderWorkspace(); }
    };
    const hasFiles = () => (R.askFiles || []).length > 0;
    send.disabled = !ta.value.trim() && !hasFiles();
    send.onclick = () => sendAsk(ta.value);
    const row = el('div', 'askrow');
    row.append(attachBtn(), ta, send);
    box.append(row);
    wrap.append(box);
    requestAnimationFrame(() => {
      /* something new was said: go to it. Otherwise stay where the reader is. */
      if (R.askStick) thread.scrollTop = thread.scrollHeight;
      else if (R.askSeek) { const last = [...thread.querySelectorAll('.jv-arun')].pop(); if (last) thread.scrollTop = last.offsetTop - 12; }
      R.askStick = R.askSeek = false;
      grow();
      if (R.focusAsk) { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); R.focusAsk = false; }
    });
    return wrap;
  }

  function clauseRef(c) {
    const num = String(c.heading).match(/(?:^|Section\s*|Article\s*)(\d+(\.\d+)*)/i)?.[1];
    return num ? `§${num}` : c.heading;
  }

  function showCitation(c) {
    if (c.n == null) return;
    R.askCite = { n: String(c.n), quote: c.text };
    $('dc-' + c.n)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    markIssues();
  }

  /* ── flag the issues ──────────────────────────────────────────
     Read, ask the one thing only you can decide, then stage a redline for
     each clause that is off its position. */
  function runFlag(text) {
    const m = { role: 'jev', kind: 'run', steps: [], working: 'Reading the contract', groups: null };
    R.chat.push({ role: 'you', text, files: takeFiles() }, m);
    R.askDraft = ''; R.askContext = '';
    paintAsk('askStick');
    setTimeout(() => {
      m.steps.push(`Read ${R.a.clauses.length} clauses`); m.working = null;
      m.question = { title: 'How hard should I push?', options: [
        { k: 'start', label: 'Ask for our starting positions' },
        { k: 'fallback', label: 'Settle at our fallbacks' },
        { k: 'red', label: 'Only what we cannot accept' },
      ], answer: (k, label) => finishFlag(m, k || 'start', label) };
      paintAsk('askStick');
    }, 1100);
  }
  function finishFlag(m, k, label) {
    m.question = null;
    m.steps.push(label ? `Asked how hard to push · ${label}` : 'Skipped the question');
    m.working = `Checking each clause against the ${withWord(R.a.playbook.name)}`;
    paintAsk('askStick');
    setTimeout(() => {
      m.working = null;
      const un = R.a.clauses.filter(c => c.status === 'unacceptable'), fb = R.a.clauses.filter(c => c.status === 'fallback');
      /* one flat list, the clauses we cannot accept first */
      const items = un.map(c => itemOf(c, k === 'fallback' ? 'fallback' : 'start')).filter(Boolean);
      if (k === 'start') items.push(...fb.map(c => itemOf(c, 'start')).filter(Boolean));
      m.groups = items.length ? [{ items }] : [];
      const n = items.length;
      m.note = !n ? ['Nothing in this contract needs changing against the playbook.']
        : [k !== 'start' && fb.length ? `${mxPlural(fb.length, 'clause')} already ${fb.length === 1 ? 'sits' : 'sit'} on a fallback, so I left ${fb.length === 1 ? 'it' : 'them'} alone. ` : '',
          'Anything you apply goes into the contract as a tracked change.'];
      paintAsk('askSeek');
    }, 1500);
  }

  /* ── redraft a passage ────────────────────────────────────────
     The selection (or a clause named in the ask) is read, and the
     playbook's wording for it is staged the same way. */
  function runRedraft(text, context) {
    const norm = (t) => t.replace(/\s+/g, ' ').trim();
    const low = text.toLowerCase();
    const c = context
      ? R.a.clauses.find(x => norm(x.text).includes(norm(context).slice(0, 60)) || norm(context).includes(norm(x.text).slice(0, 60)))
      : R.a.clauses.find(x => x.topic && low.includes(x.topic.toLowerCase())) || R.a.clauses.find(x => low.includes(bare(x.heading).toLowerCase()));
    const m = { role: 'jev', kind: 'run', steps: [], working: context ? 'Reading the selected text' : 'Finding the clause', groups: null };
    R.chat.push({ role: 'you', text, context, files: takeFiles() }, m);
    R.askDraft = ''; R.askContext = '';
    paintAsk('askStick');
    setTimeout(() => {
      m.steps.push(context ? 'Read the selected text' : 'Read the contract');
      if (!c) {
        m.working = null;
        m.note = ['Select the passage in the contract first, or name the clause, and I will redraft it against the playbook.'];
        return paintAsk('askStick');
      }
      m.working = 'Working out what needs revising';
      paintAsk('askStick');
      setTimeout(() => {
        m.working = null;
        const it = itemOf(c, 'start');
        if (!it) {
          m.note = [{ ref: c }, c.status === 'preferred' ? ' already sits on our starting position, so there is nothing to redraft against the playbook.'
            : ' is not covered by this playbook, so there is no position to redraft it towards.'];
        } else {
          m.groups = [{ items: [it] }];
          m.note = ['I’ve suggested an edit to ', { ref: c }, it.opts.length > 1
            ? `. Pick the wording — ${it.opts.map(o => o.label.toLowerCase()).join(' or ')} — and apply it; it goes into the contract as a tracked change.`
            : '. Apply it and it goes into the contract as a tracked change.'];
        }
        paintAsk('askStick');
      }, 1200);
    }, 900);
  }

  /* What was said decides what happens: work on the contract, or an answer
     from it. No model here: the answer is the passage of the contract whose
     words most overlap the question's (or the selection's clause), quoted. */
  function sendAsk(text) {
    const question = text.trim();
    if (!question && !(R.askFiles || []).length) return;
    if (!question) {
      const files = takeFiles();
      R.chat.push({ role: 'you', text: '', files });
      const m = { role: 'jev', kind: 'run', steps: [], working: files.length > 1 ? `Reading ${files.length} files` : `Reading ${files[0].name}`, groups: null };
      R.chat.push(m); R.askDraft = '';
      paintAsk('askStick');
      setTimeout(() => {
        m.working = null;
        m.steps.push(files.length > 1 ? `Read ${files.length} files` : `Read ${files[0].name}`);
        m.note = [`${files.length > 1 ? 'They’re' : 'It’s'} in this conversation now, beside ${R.a.name}. Ask me to compare ${files.length > 1 ? 'them' : 'it'} with the contract, or about anything in ${files.length > 1 ? 'them' : 'it'}.`];
        paintAsk('askSeek');
      }, 1100);
      return;
    }
    const context = R.askContext;
    const low = question.toLowerCase();
    if (/\b(redraft|rewrite|re-?word|rephrase|tighten|improve|clean (this|it) up|fix (this|it))\b/.test(low) || (context && /\bhelp\b/.test(low))) return runRedraft(question, context);
    if (!context && /(\bflag\b|\bissues?\b|deviat|\breview (this|the|it)\b|\bcheck (this|the|it)\b|\bproblems?\b|\brisks?\b|red ?flags?|mark ?up|what (should|do) (we|i) (push|change)|against (the|our) playbook)/.test(low)) return runFlag(question);
    const sent = takeFiles();
    R.chat.push({ role: 'you', text: question, context, files: sent });
    const reply = { role: 'jev', pending: true };
    R.chat.push(reply);
    R.askDraft = ''; R.askContext = '';
    paintAsk('askStick');
    setTimeout(() => {
      const STOP = new Set('what does the contract say about can either party is are a an of to in for and or on with this that it we they their our any be do how when which who'.split(' '));
      const words = (t) => t.toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 2 && !STOP.has(x));
      const qw = words(question + ' ' + context);
      const norm = (t) => t.replace(/\s+/g, ' ').trim();
      let best = null, score = 0;
      for (const c of R.a.clauses) {
        if (context && norm(c.text).includes(norm(context).slice(0, 80))) { best = { c, s: c.text }; score = 99; break; }
        for (const s of c.text.split(/(?<=[.;])\s+/)) {
          const sw = new Set(words(s + ' ' + c.heading + ' ' + (c.topic || '')));
          const n = qw.filter(x => sw.has(x) || [...sw].some(y => y.startsWith(x.slice(0, 5)) && x.length > 4)).length;
          if (n > score) { score = n; best = { c, s }; }
        }
      }
      /* a file sent with the question is said to have been read, and what it is for */
      const read = sent?.length ? `I’ve read ${sent.length > 1 ? `the ${sent.length} files` : sent[0].name}. ` : '';
      Object.assign(reply, { pending: false },
        best ? { answer: read + 'Here’s what this contract says:', citations: [{ n: best.c.n, heading: best.c.heading, text: norm(best.s) }] }
          : { answer: read ? read + 'Name a clause and I’ll set it beside the same clause in this contract.' : 'I couldn’t find anything in this contract about that.', citations: [] });
      if (reply.citations[0]) showCitation(reply.citations[0]);
      paintAsk('askStick');
    }, 700);
  }

  // Select text in the contract, then ask about it or have it redrafted.
  let askBtn = null;
  const onSelect = () => {
    if (!pane.isConnected) { askBtn?.remove(); return document.removeEventListener('mouseup', onSelect); }
    setTimeout(() => {
      askBtn?.remove(); askBtn = null;
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 3) return;
      const node = sel.anchorNode?.parentElement;
      if (!node || !pane.contains(node) || !node.closest('.jv-paper')) return;
      const r = sel.getRangeAt(0).getBoundingClientRect();
      askBtn = el('div', 'askfloat');
      askBtn.style.left = `${Math.round(r.left + r.width / 2)}px`;
      askBtn.style.top = `${Math.round(r.top - 8)}px`;
      askBtn.onmousedown = (e) => e.preventDefault();
      const done = () => { window.getSelection()?.removeAllRanges(); askBtn.remove(); askBtn = null; };
      const ask = el('button', null, 'Ask');
      ask.onclick = () => { R.askContext = text; R.tab = 'ask'; R.focusAsk = true; done(); renderWorkspace(); };
      const redraft = el('button', null, 'Redraft');
      redraft.onclick = () => { R.tab = 'ask'; done(); runRedraft('Redraft this', text); };
      askBtn.append(ask, redraft);
      document.body.append(askBtn);
    }, 0);
  };
  document.addEventListener('mouseup', onSelect);

  const withWord = (n) => (/playbook$/i.test(n) ? n : `${n} Playbook`);

  /* ── running a different playbook ─────────────────────────────
     Jev read the contract again against the playbook you picked. There
     is no reader here, so the stand-in is honest about what it can do:
     a clause both playbooks have keeps the reading it already has, a
     clause only the old one had becomes "not in playbook", and what the
     new one expects and the contract lacks is listed as missing. */
  function rerun(pb) {
    if (pb.id === A.playbook.id) return A;
    const rules = new Map(pb.clauses.map(r => [r.topic.trim().toLowerCase(), r]));
    const seen = new Set();
    const clauses = A.clauses.map(c => {
      const rule = c.topic && rules.get(c.topic.trim().toLowerCase());
      if (rule) { seen.add(rule); return c; }
      return c.status === 'none' ? c : { ...c, status: 'none', topic: 'Not covered by the playbook',
        summary: 'This playbook has no clause for this.', why: '', issue: '', their_text: '', suggestions: [] };
    });
    const missing = pb.clauses.filter(r => !seen.has(r) && r.topic?.trim()).map(r => ({
      n: 'm-' + r.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'), heading: r.topic, text: '', original: '', segments: [], changed: false,
      topic: r.topic, status: 'missing',
      summary: `The playbook expects ${/^[aeiou]/i.test(r.topic) ? 'an' : 'a'} ${r.topic.toLowerCase()} clause and this document has none.`,
      need: r.preferred, concede: (r.fallbacks || []).map(f => f.text).filter(Boolean)[0] || '', suggestions: [] }));
    const counts = {};
    for (const c of [...clauses, ...missing]) counts[c.status] = (counts[c.status] || 0) + 1;
    const deep = Object.fromEntries(Object.entries(A.deep || {}).filter(([n]) => clauses.find(c => String(c.n) === n)?.status !== 'none'));
    return { ...A, playbook: { id: pb.id, name: pb.name }, clauses, missing, counts, deep, missing_checked: true, standIn: true,
      starters: ['Can either party terminate for convenience?'] };
  }

  // The loading card, while a playbook is run.
  function renderProgress(label, done) {
    pane.innerHTML = '';
    const wrap = el('div', 'progress2');
    const card = el('div', 'pcard');
    const top = el('div', 'pdoc');
    const docIc = el('span', 'pdocic');
    docIc.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="3.5" width="13" height="17" rx="2"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/></svg>';
    const t = el('div', 'pt');
    t.append(el('div', 'eyebrow', 'Reviewing'), el('b', null, label));
    top.append(docIc, t);
    const bar = el('div', 'pbar');
    bar.append(el('div', 'pfill'));
    const steps = el('ul', 'steps2');
    const ICONS = {
      done: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
      on: '<span class="jv-spin"></span>', todo: '',
    };
    const items = ['Reading clauses and tracked changes', 'Picking the playbook', 'Checking each clause against the playbook'].map((n) => {
      const li = el('li');
      li.append(el('span', 'st'), el('span', null, n));
      steps.append(li);
      return li;
    });
    const setStep = (k) => items.forEach((li, i) => {
      const st = i < k ? 'done' : i === k ? 'on' : 'todo';
      li.className = st === 'todo' ? '' : 'jv-' + st;
      li.querySelector('.jv-st').innerHTML = ICONS[st];
    });
    setStep(0);
    card.append(top, bar, steps);
    wrap.append(card);
    pane.append(wrap);
    let k = 0;
    const timer = setInterval(() => {
      if (!pane.contains(steps)) return clearInterval(timer);
      if (k >= items.length - 1) { clearInterval(timer); return done(); }
      setStep(++k);
    }, 520);
  }

  // Bottom sheet: search the playbooks and run one against this document.
  function openPlaybookSheet(panel) {
    const a = R.a;
    panel.querySelector('.jv-sheet-wrap')?.remove();
    const wrap = el('div', 'sheet-wrap');
    const backdrop = el('div', 'sheet-backdrop');
    const sheet = el('div', 'sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Run a playbook');
    const grip = el('div', 'sheet-grip');
    const top = el('div', 'sheet-top');
    const x = el('button', 'sheet-x');
    x.setAttribute('aria-label', 'Close');
    x.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    top.append(el('b', null, 'Run a playbook'), x);
    const search = el('label', 'search2');
    search.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>';
    const q = Object.assign(document.createElement('input'), { placeholder: 'Search', type: 'search' });
    search.append(q);
    const list = el('div', 'sheet-list');
    sheet.append(grip, top, search, list);
    wrap.append(backdrop, sheet);
    panel.append(wrap);
    sheet.getBoundingClientRect();  // commit the off-screen start position so the slide always runs
    requestAnimationFrame(() => wrap.classList.add('jv-open'));

    const close = () => {
      wrap.classList.remove('jv-open');
      removeEventListener('keydown', onKey, true);
      setTimeout(() => wrap.remove(), 380);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    addEventListener('keydown', onKey, true);
    backdrop.onclick = close;
    x.onclick = close;

    const pbs = pbList();
    /* the playbooks this contract has been read against: the one it came with, and any run since */
    const runs = () => req.runs || [A.playbook.id];
    const draw = () => {
      list.innerHTML = '';
      const term = q.value.trim().toLowerCase();
      const shown = pbs.filter((pb) => !term || `${pb.name} ${pb.description}`.toLowerCase().includes(term));
      if (!shown.length) { list.append(el('div', 'empty-note', 'No playbooks match.')); return; }
      for (const pb of shown) {
        const cur = pb.id === a.playbook.id;
        const row = el('div', 'sheet-row' + (cur ? ' current' : ''));
        const t = el('div', 't');
        /* the one in use says so in a capsule beside its name, and can be run again */
        const name = el('div', 'tn');
        name.append(el('b', null, withWord(pb.name || 'Untitled playbook')));
        if (cur) name.append(el('span', 'curcap', 'Current'));
        /* a playbook already run on this contract shows what it found, in
           place of what it is for */
        const ranBefore = !cur && runs().includes(pb.id);
        if (cur || ranBefore) {
          const k = (cur ? a : rerun(pb)).counts || {};
          const line = el('div', 'runct');
          for (const [st, label] of [['unacceptable', 'Not acceptable'], ['fallback', 'Fallback'], ['preferred', 'Starting position']]) {
            const one = el('span', 'runct-n ' + st);
            one.append(el('i'), String(k[st] || 0));
            one.dataset.tip = label;
            line.append(one);
          }
          t.append(name, line);
        } else t.append(name, el('span', null, pb.description || `${pb.clauses.length} clauses`));
        row.append(el('span', 'doc'), t);
        /* three states: the one in use can be run again; one that has been
           run on this contract before opens straight onto that reading; the
           rest have yet to be run */
        const run = el('button', 'btn line run');
        run.innerHTML = cur
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg><span>Re-run</span>'
          : ranBefore
          ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg><span>View</span>'
          : '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z"/></svg><span>Run</span>';
        const show = () => {
          req.playbook = pb.id; req.ran = pb.id; req.updated = mxNow();
          if (!runs().includes(pb.id)) req.runs = [...runs(), pb.id];
          Object.assign(R, { a: withStack(rerun(pb)), open: new Set(), choice: {}, dismissed: new Set(), q: '', filter: 'all', focus: null, tab: 'playbook' });
          R.deep = R.a.deep || {};
          renderWorkspace();
        };
        run.onclick = () => {
          close();
          /* a reading that already exists is shown; only a run takes time */
          if (ranBefore) return show();
          renderProgress(`${a.name} with the ${withWord(pb.name)}`, () => {
            show();
            if (cur) toast(`Ran the ${withWord(pb.name)} again`);
          });
        };
        row.append(run);
        list.append(row);
      }
    };
    draw(); q.oninput = draw;
    // Focus only after the slide, and never let the browser scroll to reach it.
    sheet.addEventListener('transitionend', () => q.focus({ preventScroll: true }), { once: true });
  }

  function matches(c) {
    const f = R.filter;
    if (f === 'changed') { if (!c.changed) return false; }
    else if (f === 'open') { if (isReviewed(c)) return false; }
    else if (f !== 'all' && c.status !== f) return false;
    if (R.q) {
      const hay = `${c.heading} ${c.topic} ${c.text}`.toLowerCase();
      if (!hay.includes(R.q.toLowerCase())) return false;
    }
    return true;
  }

  function renderList(list) {
    list.innerHTML = '';
    /* the playbook run covers nothing in this contract: say so, and offer the right one */
    if (all().length && !all().some(c => c.status !== 'none')) { list.append(unmatchedState()); return; }
    const items = sorted(all()).filter(matches);
    if (!items.length) { list.append(filteredState()); return; }
    let lastGroup = null;
    const MISSING = 'Missing from this document';
    // Only speak up when the check was skipped; if nothing is missing, say nothing.
    const showMissingEmpty = !R.a.missing_checked && !R.a.missing.length && !R.q && R.filter === 'all';
    const missingNote = () => {
      list.append(el('div', 'group', MISSING));
      list.append(el('div', 'empty-note', 'Not checked, because it isn’t clear this is the right playbook.'));
    };
    let missingShown = false;
    if (R.filter === 'all' && !R.q) dealLines(list);
    for (const c of items) {
      if (showMissingEmpty && c.status === 'none' && !missingShown) { missingNote(); missingShown = true; lastGroup = MISSING; }
      const g = c.from ? `From the ${withWord(c.from)}` : c.status === 'missing' ? MISSING : c.status === 'none' ? 'Not covered by this playbook' : null;
      if (g && g !== lastGroup) list.append(el('div', 'group', g));
      lastGroup = g;
      list.append(panelItem(c));
    }
    if (showMissingEmpty && !missingShown) missingNote();
  }

  function panelItem(c) {
    const key = String(c.n);
    const open = R.open.has(key);
    const item = el('div', 'pi' + (open ? ' open' : '') + (R.applied[key] != null ? ' applied' : ''));
    item.id = 'jv-pi-' + key;
    const row = el('button', 'row2');
    const hd = el('span', 'h', c.heading.replace(/^\s*\d+(\.\d+)*\.?\s+/, ''));
    row.append(icon(c.status), hd);
    /* a sign-off rides after the clause's name, in words */
    const so = R.signoff[key];
    if (so) row.append(el('span', 'rowso ' + soState(key, so), soState(key, so) === 'approved' ? `${so.to.split(' ')[0]} approved` : soState(key, so) === 'stale' ? 'Ask again' : `With ${so.to.split(' ')[0]}`));
    if (isReviewed(c) && !so) { const ok = el('span', 'rv'); ok.innerHTML = TICK; ok.dataset.tip = 'Reviewed'; row.append(ok); }
    if (R.notes[key]?.length) {
      const nm = el('span', 'nmark');
      nm.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H6.5A2.5 2.5 0 0 1 4 13.5z"/></svg>';
      nm.title = `${R.notes[key].length} note${R.notes[key].length > 1 ? 's' : ''}`;
      row.append(nm);
    }
    const chev = el('span', 'chev');
    chev.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m9 6 6 6-6 6"/></svg>';
    row.append(chev);
    row.onclick = () => openRow(key, false);
    item.append(row);
    if (open) item.append(detail(c));
    return item;
  }

  function openRow(key, fromDoc) {
    if (R.tab !== 'playbook') R.tab = 'playbook';
    if (R.open.has(key) && !fromDoc) R.open.delete(key); else R.open.add(key);
    R.focus = key;
    renderWorkspace();
    const target = fromDoc ? $('pi-' + key) : $('dc-' + key);
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (fromDoc) $('dc-' + key)?.classList.add('jv-focus');
  }

  function detail(c) {
    const key = String(c.n);
    return R.deep[key] && !R.deep[key].error && ['unacceptable', 'fallback'].includes(c.status)
      ? deepDetail(c, R.deep[key]) : plainDetail(c);
  }

  function plainDetail(c) {
    const key = String(c.n);
    const d = el('div', 'pdetail');
    if (c.status === 'unacceptable' && (c.issue || c.their_text)) {
      // One paragraph: the most important problem, then where it is.
      const para = el('p', 'sum brief');
      if (c.issue) para.append(el('b', null, c.issue.replace(/\.?$/, '. ')));
      else para.append(document.createTextNode(c.summary + ' '));
      if (c.their_text) {
        const num = c.heading.match(/(?:^|Section\s*|Article\s*)(\d+(\.\d+)*)/i)?.[1];
        para.append(document.createTextNode('The problem is the highlighted sentence in '));
        const jump = el('button', 'jump', num ? `§${num}` : 'the clause');
        jump.title = 'Show in document';
        jump.onclick = (e) => { e.stopPropagation(); $('dc-' + key)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
        para.append(jump, document.createTextNode('.'));
      }
      d.append(para);
    } else if (c.status === 'missing') {
      d.append(el('div', 'sum', c.summary));
      if (c.need) {
        const facts = el('dl', 'facts');
        facts.append(el('dt', null, 'We need'));
        const dd = el('dd', null, c.need);
        if (c.concede) dd.append(el('span', 'concede', `Can concede to: ${c.concede}`));
        facts.append(dd);
        d.append(facts);
      }
    } else {
      // Finding plus the playbook's position, as one paragraph.
      const para = el('p', 'sum brief', c.summary + ' ');
      if (c.why) {
        const wv = el('span', 'pbtext', c.why);
        wv.title = 'From the playbook';
        para.append(wv);
      }
      d.append(para);
    }
    d.append(...clauseExtras(c));
    if (!withTheirs(c, c.suggestions).length || R.dismissed.has(key)) {
      if (R.dismissed.has(key)) {
        const undo = el('button', 'link', 'Show suggestion again');
        undo.style.fontSize = '12px'; undo.style.marginTop = '10px';
        undo.onclick = () => { R.dismissed.delete(key); renderWorkspace(); };
        d.append(undo);
      }
      /* nothing to change: say so with one word, and offer the playbook what it lacks */
      const links = el('div', 'dlinks');
      if (c.status !== 'missing') {
        const mark = el('button', 'viewlink', R.reviewed.has(key) ? 'Reviewed' : 'Mark reviewed');
        if (R.reviewed.has(key)) mark.prepend(Object.assign(el('span', 'vl-ok'), { innerHTML: TICK }));
        mark.onclick = () => { R.reviewed.has(key) ? R.reviewed.delete(key) : R.reviewed.add(key); renderWorkspace(); };
        links.append(mark);
      }
      if (c.status === 'none') {
        const add = el('button', 'viewlink', 'Add to playbook');
        add.onclick = () => propose(c, 'rule', c.text);
        links.append(add);
      }
      if (links.childElementCount) d.append(links);
      return d;
    }

    const opts = edited(key, withTheirs(c, optionsFor(c)));
    const idx = Math.min(R.choice[key] ?? defaultIdx(c, opts), opts.length - 1);
    const sel = opts[idx];
    // One card: the redline on top, a footer row with the wording picker and the actions.
    const card = el('div', 'scard');
    /* the position is the card's own heading: one sheet, three bands */
    if (opts.length > 1) card.append(posPick(opts, idx, (i) => { R.choice[key] = i; renderWorkspace(); }, { head: true }));
    const foot = el('div', 'sfoot');
    const body = freshBody(key, el('div', 'sbody rl'));
    body.append(segs(sel.segments, true));
    card.append(body);
    /* asking for a change takes the foot's place until it is sent or put away */
    if (aiOn(key) && R.applied[key] !== sel.text) {
      card.append(aiRow(key, c, sel, applyBtn(key, c, sel)));
      d.append(card);
      return d;
    }
    if (R.signing === key) { card.append(signoffBox(key, c, sel)); d.append(card); return d; }
    foot.append(R.applied[key] === sel.text ? el('span', 'grow') : aiButton(key), el('span', 'grow'));
    if (sel.note || sel.check) {
      const n = el('div', 'note2');
      if (sel.note) n.append(document.createTextNode(sel.note + ' '));
      if (sel.check) {
        const ok = sel.check.position !== 'Unacceptable';
        n.append(el('span', ok ? 'ok' : 'bad', `Check: ${sel.check.position} (${pct(sel.check.confidence)})`));
      }
      card.append(n);
    }
    const acts = el('div', 'acts2');
    const applied = R.applied[key] === sel.text;
    const dismiss = el('button', 'btn ghost', 'Undo');
    dismiss.onclick = () => { delete R.applied[key]; delete R.mode[key]; renderWorkspace(); };
    if (applied) { acts.append(dismiss, Object.assign(el('button', 'btn primary', sel.key === 'theirs' ? 'Accepted' : 'Applied'), { disabled: true })); }
    else acts.append(askOwner(key, c), applyBtn(key, c, sel));
    foot.insertBefore(notRight(key, c), foot.firstChild?.nextSibling || null);
    foot.append(acts);
    card.append(foot);
    d.append(card);
    return d;
  }

  // Analysed clause: Reasoning, the playbook clause, and the suggestion card.
  function deepDetail(c, res) {
    const key = String(c.n);
    const d = el('div', 'pdetail');

    // Reasoning: a short paragraph, then 2–3 points citing the words they rely on.
    if (res.summary) d.append(el('p', 'rsum', res.summary));
    const ul = el('ul', 'reasons');
    let cite = 0;
    for (const pt of res.reasoning) {
      const li = el('li', null, pt.text);
      if (pt.quote) {
        const n = ++cite;
        const b = el('button', 'cite', String(n));
        b.title = `“${pt.quote}”`;
        b.onclick = () => { R.cite = { key, quote: pt.quote }; $('dc-' + key)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); markIssues(); };
        li.append(' ', b);
      }
      ul.append(li);
    }
    d.append(ul);
    d.append(...clauseExtras(c));

    /* "Their position" card removed (17 Oct): the clause is highlighted in the contract already */


    /* the two positions we can stand on, and nothing else */
    const opts = edited(key, withTheirs(c, [...res.options]));
    if (!opts.length || R.dismissed.has(key)) {
      if (R.dismissed.has(key)) {
        const links = el('div', 'dlinks');
        const undo = el('button', 'viewlink', 'Show suggestion again');
        undo.onclick = () => { R.dismissed.delete(key); renderWorkspace(); };
        links.append(undo);
        d.append(links);
      }
      return d;
    }
    const idx = Math.min(R.choice[key] ?? defaultIdx(c, opts), opts.length - 1);
    const sel = opts[idx];
    if (R.applied[key] === sel.text) { d.append(appliedCard(key, sel, c, opts)); return d; }
    /* the card is the change itself, with nothing said over it */
    const card = el('div', 'scard');
    /* the position is the card's own heading: one sheet, three bands */
    if (opts.length > 1) card.append(posPick(opts, idx, (i) => { R.choice[key] = i; renderWorkspace(); }, { head: true }));
    const body = freshBody(key, el('div', 'sbody rl'));
    body.append(segs(sel.segments, true));
    card.append(body);
    const cm = R.composing[key];
    if (cm && cm.apply != null) {
      card.append(composerBox(key));  // "Apply with comment": the comment, then apply
      d.append(card);
      return d;
    }
    /* asking for a change takes the foot's place until it is sent or put away */
    if (aiOn(key)) {
      card.append(aiRow(key, c, sel, applyBtn(key, c, sel)));
      d.append(card);
      return d;
    }
    if (R.signing === key) { card.append(signoffBox(key, c, sel)); d.append(card); return d; }
    const foot = el('div', 'sfoot');
    foot.append(aiButton(key), notRight(key, c), el('span', 'grow'), askOwner(key, c), applyBtn(key, c, sel));
    card.append(foot);
    d.append(card);
    return d;
  }

  // An extra redline option on a clause they edited: undo their edit.
  function roundOptions(c) {
    if (!(R.a.mode === 'redline' && c.changed && c.original && c.original.trim() !== c.text.trim())) return [];
    const seg = (c.suggestions.find((o) => o.key === 'original') || {}).segments || [['del', c.text], ['ins', '\n' + c.original]];
    return [{ key: 'original', label: 'Restore our text', summary: 'Undoes their edit.', text: c.original, segments: seg }];
  }

  const LOCK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const SHARE = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h13M12 6l6 6-6 6"/></svg>';

  // Internal (only your team sees it) or For them (goes into the Word file as a comment).
  function visToggle(get, set) {
    const seg = el('div', 'vis');
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', 'Who sees this note');
    for (const [internal, label, ic, tip] of [[true, 'Internal', LOCK, 'Only your team sees this'], [false, 'For them', SHARE, 'Goes to the other side as a Word comment']]) {
      const b = el('button', 'vopt');
      b.innerHTML = ic;
      b.append(el('span', null, label));
      b.title = tip;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', get() === internal);
      b.onclick = (e) => { e.preventDefault(); set(internal); seg.querySelectorAll('.jv-vopt').forEach((x, i) => x.setAttribute('aria-checked', (i === 0) === internal)); };
      seg.append(b);
    }
    return seg;
  }

  // Note composer. With cm.apply set, saving also applies the redline ("Apply with comment").
  function composerBox(key) {
    const cm = R.composing[key];
    const box = el('div', 'cbox' + (cm.apply == null ? ' standalone' : ''));
    const ta = Object.assign(document.createElement('textarea'), { rows: 2, value: cm.draft || '' });
    const ph = () => (cm.reply ? `Reply to ${cm.reply}…` : cm.internal ? 'Note for your team…' : 'Comment for the other side…');
    ta.placeholder = ph();
    /* the box starts empty; a wording on offer is one click away */
    const c0 = all().find(x => String(x.n) === key);
    const offer = cm.suggest || (!cm.internal && ruleOf(c0)?.comment);
    const chips = el('div', 'cchips');
    if (offer) {
      const chip = el('button', 'cchip', cm.suggest ? 'Use Clavia’s reply' : 'Use the playbook’s comment');
      chip.onclick = (e) => { e.preventDefault(); ta.value = cm.draft = offer; chips.remove(); ta.focus(); ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
      chips.append(chip);
    }
    ta.oninput = () => { cm.draft = ta.value; chips.hidden = !!ta.value; };
    chips.hidden = !!ta.value;
    const row = el('div', 'cbar');
    row.append(visToggle(() => cm.internal, (v) => { cm.internal = v; ta.placeholder = ph(); }));
    const acts = el('div', 'acts2');
    const cancel = el('button', 'btn ghost', 'Cancel');
    cancel.onclick = () => { delete R.composing[key]; renderWorkspace(); };
    const ok = el('button', 'btn primary', cm.apply != null ? 'Apply' : 'Save');
    ok.onclick = () => {
      const text = (cm.draft || '').trim();
      if (cm.apply == null && !text) { ta.focus(); return; }
      if (cm.apply != null) { R.applied[key] = cm.apply; R.mode[key] = { tracked: cm.tracked }; }
      if (text) (R.notes[key] ||= []).push({ id: rid(), text, internal: cm.internal, by: ME, at: new Date().toISOString(), ...(cm.reply ? { replyTo: cm.reply } : {}) });
      if (cm.reply) R.reviewed.add(key);
      delete R.composing[key];
      renderWorkspace();
    };
    ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ok.click(); if (e.key === 'Escape') { e.stopPropagation(); cancel.click(); } };
    acts.append(cancel, ok);
    row.append(acts);
    box.append(ta, ...(offer ? [chips] : []), row);
    requestAnimationFrame(() => ta.focus({ preventScroll: true }));
    return box;
  }

  // Margin note with Edit / Delete, in place.
  function commentNote(key, n) {
    const note = el('div', 'dcomment' + (n.internal ? ' internal' : ''));
    const head = el('div', 'dch');
    const who = el('span', 'who');
    who.append(el('b', null, n.by === ME ? 'You' : n.by));
    if (n.theirs) { who.append(el('span', 'vbadge theirs', n.org)); note.classList.add('jv-theirs'); head.append(who); note.append(head, el('span', 'dctext', n.text)); return note; }
    const badge = el('span', 'vbadge');
    badge.innerHTML = n.internal ? LOCK : SHARE;
    badge.append(el('span', null, n.internal ? 'Internal' : 'For them'));
    badge.title = n.internal ? 'Only your team sees this' : 'Goes to the other side as a Word comment';
    who.append(badge);
    head.append(who);
    const list = () => R.notes[key] || [];
    if (R.editingNote !== n.id) {
      const tools = el('span', 'dctools');
      const edit = el('button', null);
      edit.title = 'Edit'; edit.setAttribute('aria-label', 'Edit note');
      edit.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>';
      edit.onclick = () => { R.editingNote = n.id; renderWorkspace(); };
      const del = el('button', null);
      del.title = 'Delete'; del.setAttribute('aria-label', 'Delete note');
      del.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
      del.onclick = () => {
        const i = list().indexOf(n);
        R.notes[key] = list().filter((x) => x !== n);
        renderWorkspace();
        toast('Note deleted', { label: 'Undo', run: () => { (R.notes[key] ||= []).splice(i, 0, n); renderWorkspace(); } });
      };
      tools.append(edit, del);
      head.append(tools);
      note.append(head, el('span', 'dctext', n.text));
    } else {
      const draft = { internal: n.internal };
      const ta = Object.assign(document.createElement('textarea'), { rows: 3, value: n.text });
      const acts = el('div', 'dcacts');
      const cancel = el('button', 'btn ghost', 'Cancel');
      cancel.onclick = () => { R.editingNote = null; renderWorkspace(); };
      const saveB = el('button', 'btn primary', 'Save');
      saveB.onclick = () => {
        const text = ta.value.trim();
        if (text) Object.assign(n, { text, internal: draft.internal });
        else R.notes[key] = list().filter((x) => x !== n);
        R.editingNote = null;
        renderWorkspace();
      };
      ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveB.click(); if (e.key === 'Escape') { e.stopPropagation(); cancel.click(); } };
      acts.append(visToggle(() => draft.internal, (v) => { draft.internal = v; }), el('span', 'grow'), cancel, saveB);
      note.append(head, ta, acts);
      requestAnimationFrame(() => { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); });
    }
    return note;
  }

  // After Apply: a compact card. The redline now lives in the document, so it isn't repeated here.
  function appliedCard(key, sel, c, opts) {
    const m = R.mode[key] || {};
    const card = el('div', 'scard applied-card');
    const top = el('div', 'acard-top');
    top.append(el('b', null, sel.key === 'theirs' ? 'Accepted their change' : sel.label));
    if (sel.summary) top.append(el('p', null, sel.summary));
    /* you chose something other than what the run would: that is evidence for the playbook */
    if (c && opts && opts[defaultIdx(c, opts)]?.key !== sel.key && sel.key !== 'original') {
      const pr = el('button', 'viewlink acard-prop', isProposed(c, sel.text) ? 'Proposed to the playbook' : 'Make this the playbook’s answer?');
      pr.disabled = isProposed(c, sel.text);
      pr.onclick = () => propose(c, sel.key === 'theirs' ? 'accept' : 'fallback', sel.text);
      top.append(pr);
    }
    card.append(top);
    if (R.composing[key] && !R.composing[key].standalone) {
      card.append(composerBox(key));
      return card;
    }
    const foot = el('div', 'sfoot');
    const state = el('span', 'applied');
    state.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
    state.append(document.createTextNode(m.accepted ? 'Accepted' : m.tracked === false ? 'Applied · no tracking' : 'Applied'));
    state.title = m.tracked === false ? 'Applied without tracking' : 'Applied as a tracked change';
    foot.append(state);
    const acts = el('div', 'acts2');
    const add = el('button', 'btn ghost ic-btn');
    add.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H6.5A2.5 2.5 0 0 1 4 13.5z"/><path d="M12 7.5v5M9.5 10h5"/></svg>';
    add.append(document.createTextNode('Add comment'));
    add.onclick = () => { R.composing[key] = { draft: '', internal: false }; renderWorkspace(); };
    acts.append(add);
    const undo = el('button', 'btn ghost ic-btn');
    undo.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
    undo.append(document.createTextNode('Undo'));
    undo.onclick = () => { delete R.applied[key]; delete R.mode[key]; delete R.composing[key]; renderWorkspace(); };
    acts.append(undo);
    foot.append(acts);
    card.append(foot);
    return card;
  }

  // Split "Apply" button: the main part applies as a tracked change; the arrow offers the variants.
  function applyMenu(key, text) {
    const wrap = el('div', 'splitbtn');
    const apply = (tracked, comment) => {
      if (R.ai?.key === key) R.ai = null;
      if (comment) { R.composing[key] = { draft: '', internal: false, apply: text, tracked }; renderWorkspace(); return; }
      R.applied[key] = text; R.mode[key] = { tracked }; renderWorkspace();
    };
    const main = el('button', 'btn primary sb-main', 'Apply');
    main.title = 'Apply as tracked change';
    main.onclick = () => apply(true, false);
    const more = el('button', 'btn primary sb-more');
    more.setAttribute('aria-label', 'More apply options');
    more.setAttribute('aria-haspopup', 'menu');
    more.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
    const menu = el('div', 'fpop amenu');
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    const items = [
      ['Apply as tracked change', true, false],
      ['Apply without tracking', false, false],
      ['Apply with comment', true, true],
    ];
    items.forEach(([label, tracked, comment]) => {
      const it = el('button', 'fitem', label);
      it.setAttribute('role', 'menuitem');
      it.onclick = () => { close(); apply(tracked, comment); };
      menu.append(it);
    });
    const onDoc = (e) => { if (!wrap.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    function close() { menu.hidden = true; document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); }
    more.onclick = () => {
      if (!menu.hidden) return close();
      menu.hidden = false;
      setTimeout(() => document.addEventListener('click', onDoc), 0);
      document.addEventListener('keydown', onKey);
    };
    wrap.append(main, more, menu);
    return wrap;
  }

  // The playbook's clause, in a bottom sheet over the panel: its three
  // positions, which of them this contract's clause is on, and under the
  // two we can stand on, the response that gets the clause there — applied
  // to the contract in one click, and shown where it lands.
  function openRuleSheet(panel, c) {
    const topic = c.topic, key = String(c.n);
    /* the playbook as it is now in Playbooks, or as it was when the review ran; topics are
       matched loosely ("Data Protection" is the playbook's "Data protection and security") */
    const same = (x) => { const a = (x || '').toLowerCase(), b = (topic || bare(c.heading)).toLowerCase(); return a === b || a.startsWith(b) || b.startsWith(a) || a.split(/\W+/)[0] === b.split(/\W+/)[0]; };
    const live = pbFind(R.a.playbook.id)?.clauses.find((r) => same(r.topic));
    const rule = live ? { topic: live.topic, preferred: live.preferred, walkaway: live.walkaway,
        fallback: (live.fallbacks || []).map(f => f.text).filter(Boolean).join('\n\n') || live.fallback }
      : (R.a.rules || []).find((r) => same(r.topic));
    if (!rule) return toast('This playbook has no clause for this.');
    /* the redline for each position: from the analysis, or the playbook's own wording */
    const opts = [...(R.deep[key]?.options || []), ...optionsFor(c)];
    const responseFor = (st) => opts.find(o => st === 'preferred' ? /^(starting|preferred)$/.test(o.key) : o.key === 'fallback');

    panel.querySelector('.jv-sheet-wrap')?.remove();
    const wrap = el('div', 'sheet-wrap');
    const backdrop = el('div', 'sheet-backdrop');
    const sheet = el('div', 'sheet rulesheet');
    const top = el('div', 'sheet-top');
    const x = el('button', 'sheet-x');
    x.setAttribute('aria-label', 'Close');
    x.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    const tb = el('div', 'sheet-tt');
    tb.append(el('b', null, rule.topic), el('span', null, `${withWord(R.a.playbook.name)}${pubOf() ? ' · ' + pubOf() : ''}`));
    top.append(tb, x);
    const list = el('div', 'sheet-list');
    const close = () => { wrap.classList.remove('jv-open'); removeEventListener('keydown', onKey, true); setTimeout(() => wrap.remove(), 380); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };

    const draw = () => {
      list.innerHTML = '';
      const why = ruleOf(c)?.why;
      if (why) list.append(Object.assign(el('p', 'rwhy'), { textContent: why }));
      for (const [st, label, k] of [['preferred', 'Starting position', 'preferred'],
        ['unacceptable', 'Not acceptable', 'walkaway'], ['fallback', 'Fallback', 'fallback']]) {
        if (!rule[k]) continue;
        const card = el('div', 'rcard');
        const hd = el('div', 'rch');
        hd.append(icon(st), el('span', null, label));
        /* where their draft stands now */
        if (c.status === st && R.applied[key] == null) hd.append(el('span', 'rhere', 'Their draft is here'));
        card.append(hd, el('p', null, rule[k]));
        const opt = st === 'unacceptable' ? null : responseFor(st);
        if (opt) {
          const applied = R.applied[key] === opt.text;
          const res = el('div', 'rres' + (applied ? ' applied' : ''));
          /* the same card as a suggestion in the panel: the redline, and its
             Apply in the foot of the same surface */
          const sc = el('div', 'scard');
          const body = el('div', 'sbody rl');
          body.append(segs(opt.segments, true));
          sc.append(body);
          const foot = el('div', 'sfoot rres-foot');
          if (applied) {
            const state = el('span', 'applied');
            state.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
            state.append(document.createTextNode('Applied'));
            const undo = el('button', 'btn ghost', 'Undo');
            undo.onclick = () => { delete R.applied[key]; delete R.mode[key]; renderBehind(); draw(); };
            foot.append(state, el('span', 'grow'), undo);
          } else {
            const apply = el('button', 'btn primary', 'Apply');
            apply.title = 'Apply as a tracked change, and show it in the contract';
            apply.onclick = () => {
              R.applied[key] = opt.text; R.mode[key] = { tracked: true };
              R.open.add(key); R.focus = key; R.tab = 'playbook';
              close();
              renderWorkspace();
              /* one click: it is in the contract, and that is where you are looking */
              $('dc-' + key)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
              toast(`Applied: ${label}`, { label: 'Undo', run: () => { delete R.applied[key]; delete R.mode[key]; renderWorkspace(); } });
            };
            foot.append(el('span', 'grow'), apply);
          }
          sc.append(foot);
          res.append(sc);
          card.append(res);
        }
        list.append(card);
      }
    };
    /* the contract and list behind the sheet follow an undo, without closing the sheet */
    const renderBehind = () => {
      const dc = $('dc-' + key);
      if (dc) dc.replaceWith(docClause(c));
      persist();
    };
    draw();
    sheet.append(el('div', 'sheet-grip'), top, list);
    wrap.append(backdrop, sheet);
    panel.append(wrap);
    sheet.getBoundingClientRect();
    requestAnimationFrame(() => wrap.classList.add('jv-open'));
    addEventListener('keydown', onKey, true);
    backdrop.onclick = close; x.onclick = close;
  }

  /* ==================================================================
     The pane, grown into a working add-in (17 Oct): how the run is set
     up, how far through you are, the deal as a whole, a fuller clause
     card, sign-off, their comments, skills, and finishing. Built on the
     pane's own parts — the same cards, sheets, menus and toasts.
  ================================================================== */
  const RP_IC = {
    dots: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/></svg>',
    changed: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
    open: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/></svg>',
    book: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.3C10.5 4.8 8.2 4.3 4.5 4.5v12.3c3.7-.2 6 .3 7.5 1.8 1.5-1.5 3.8-2 7.5-1.8V4.5c-3.7-.2-6 .3-7.5 1.8zM12 6.3v12.3"/></svg>',
    bench: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 19V11M10 19V6M15 19v-9M20 19V14"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 21 19.5H3z"/><path d="M12 10v4M12 16.8v.2"/></svg>',
    law: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></svg>',
    expo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.6-3.3 8-8 9-4.7-1-8-4.4-8-9V6z"/><path d="M12 8.5v4M12 15.3v.2"/></svg>',
    hist: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4h4"/><path d="M12 8v4.3l2.8 1.7"/></svg>',
    thumb: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14V4.5M7 14l3.4 6.2c1 .2 2-.6 2-1.7V15h4.9a2 2 0 0 0 2-2.3l-1.1-6.5A2 2 0 0 0 16.2 4.5H7M7 14H4.5V4.5H7"/></svg>',
    dot: '<svg width="8" height="8"><circle cx="4" cy="4" r="3.2" fill="currentColor"/></svg>',
  };
  /* the rule notes belong to one playbook: they are only shown when that playbook was run */
  const ruleOf = (c) => (c && typeof RP_RULE !== 'undefined' && R.a?.playbook?.id === RP_RULE_FOR && RP_RULE[bare(c.heading)]) || null;
  const curText = (c) => R.applied[String(c.n)] ?? c.text ?? '';
  const first = (n) => (n || '').split(' ')[0];
  const nowT = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const nextV = () => (RP.version ? 'v' + (parseInt(RP.version.slice(1), 10) + 1) : 'a new version');
  const ownerOf = (c) => RP_OWNER?.[c.escalate] || null;

  /* reviewed: applied, accepted, dismissed, signed off, replied to, or marked */
  function soState(key, so) {
    if (!so || so.state === 'waiting') return 'waiting';
    return R.applied[key] != null && R.applied[key] !== so.text ? 'stale' : 'approved';
  }
  function isReviewed(c) {
    const key = String(c.n);
    return R.reviewed.has(key) || R.applied[key] != null || R.dismissed.has(key) || (R.signoff[key] && soState(key, R.signoff[key]) === 'approved');
  }

  /* their change, when it sits inside the playbook, is a wording on offer like ours */
  function withTheirs(c, opts) {
    const list = [...opts];
    if (c.changed && c.text && ['fallback', 'preferred'].includes(c.status) && !list.some(o => o.key === 'theirs'))
      list.push({ key: 'theirs', label: 'Accept their change', summary: 'Their wording sits inside the playbook.', text: c.text, segments: [['t', c.text]] });
    return list;
  }
  /* which wording the card opens on follows the run: Strict asks for our start, Deal-closing settles */
  function defaultIdx(c, opts) {
    let i = -1;
    if (R.setup.approach === 'closing') {
      if (c.status === 'fallback') i = opts.findIndex(o => o.key === 'theirs');
      if (i < 0) i = opts.findIndex(o => o.key === 'fallback');
    }
    if (i < 0) i = opts.findIndex(o => /^(starting|preferred)$/.test(o.key));
    return i < 0 ? 0 : i;
  }
  const optsFull = (c) => withTheirs(c, edited(String(c.n), R.deep[String(c.n)]?.options?.length ? [...R.deep[String(c.n)].options] : optionsFor(c)));
  const applyOpt = (key, o) => { R.applied[key] = o.text; R.mode[key] = o.key === 'theirs' ? { tracked: false, accepted: true } : { tracked: true }; };

  /* ── the run: which playbook, which version, and how it was set up ── */
  const pubOf = () => {
    const pb = pbFind(R.a.playbook.id);
    if (!pb) return '';
    if (typeof pbEnsureVersions === 'function') pbEnsureVersions(pb);
    const info = pbPubInfo(pb);
    if (pb.status === 'archived') return `Archived · v${pb.versions.length}`;
    return info.state === 'off' ? `Draft v${pb.versions.length} · test run` : `v${(pb.published ?? pb.versions.length - 1) + 1} · Published`;
  };
  const SETUP_W = {
    side: { provider: 'We’re the provider', customer: 'We’re the customer' },
    paper: { ours: 'Our paper', theirs: 'Their paper' },
    approach: { strict: 'Strict', closing: 'Deal-closing' },
  };
  function contextLine() {
    const b = el('button', 'ctx' + (R.setupOpen ? ' on' : ''));
    const parts = [pubOf(), SETUP_W.paper[R.setup.paper], SETUP_W.side[R.setup.side], SETUP_W.approach[R.setup.approach]];
    if (R.stack.length) parts.push(`+ ${R.stack.length} ${R.stack.length === 1 ? 'playbook' : 'playbooks'}`);
    b.append(el('span', 'ctx-t', parts.filter(Boolean).join(' · ')));
    const cv = el('span', 'ctx-c'); cv.innerHTML = CHEV; b.append(cv);
    b.dataset.tip = 'How This Review Was Run';
    b.onclick = () => { R.setupOpen = !R.setupOpen; renderWorkspace(); };
    return b;
  }
  const baseReview = () => { const pb = req.ran && pbFind(req.ran); return pb ? rerun(pb) : A; };
  function withStack(a) {
    const items = R.stack.flatMap(id => (RP.stack?.[id] || []).map(x => ({ text: '', original: '', segments: [], suggestions: [], changed: false, ...x, from: pbFind(id)?.name || id })));
    if (!items.length) return a;
    const missing = [...a.missing.filter(m => !m.from), ...items];
    const counts = {};
    for (const c of [...a.clauses, ...missing]) counts[c.status] = (counts[c.status] || 0) + 1;
    return { ...a, missing, counts };
  }
  function setupCard(draft = { ...R.setup, stack: [...R.stack] }) {
    const card = el('div', 'setup');
    const repaint = () => card.replaceWith(setupCard(draft));
    const row = (label, ...body) => { const r = el('div', 'su-row'); r.append(el('span', 'su-k', label), Object.assign(el('div', 'su-v'), {}), ); r.lastChild.append(...body); return r; };
    const seg = (k, opts) => {
      const s = el('div', 'seg2');
      for (const [v, t] of opts) {
        const b = el('button', 'seg2-b', t);
        b.setAttribute('aria-pressed', String(draft[k] === v));
        b.onclick = () => { draft[k] = v; repaint(); };
        s.append(b);
      }
      return s;
    };
    /* the playbooks: the one it came with, and up to two more stacked on it */
    const pbs = el('div', 'su-pbs');
    pbs.append(el('div', 'su-pb', withWord(R.a.playbook.name)));
    for (const id of draft.stack) {
      const one = el('div', 'su-pb');
      one.append(el('span', null, withWord(pbFind(id)?.name || id)));
      const x = el('button', 'su-x'); x.innerHTML = CROSS; x.dataset.tip = 'Remove'; x.setAttribute('aria-label', 'Remove');
      x.onclick = () => { draft.stack = draft.stack.filter(y => y !== id); repaint(); };
      one.append(x); pbs.append(one);
    }
    if (draft.stack.length < 2) {
      const add = el('button', 'viewlink su-add', 'Add a playbook');
      add.onclick = (e) => {
        e.stopPropagation();
        menu(add, pbList().filter(pb => pb.id !== R.a.playbook.id && !draft.stack.includes(pb.id))
          .map(pb => ({ label: withWord(pb.name || 'Untitled playbook'), run: () => { draft.stack.push(pb.id); repaint(); } })));
      };
      pbs.append(add);
    }
    const appr = el('div', 'su-appr');
    for (const [v, t, say] of [['strict', 'Strict', 'Ask for our starting positions. Fallbacks are flagged.'],
      ['closing', 'Deal-closing', 'Accept what sits inside a fallback. Push back only on what is outside it.']]) {
      const b = el('button', 'su-opt');
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(draft.approach === v));
      b.append(el('span', 'su-radio'), el('span', 'su-ot', t), el('span', 'su-os', say));
      b.onclick = () => { draft.approach = v; repaint(); };
      appr.append(b);
    }
    const deal = el('span', 'su-deal', [draft.value, draft.region].filter(Boolean).join(' · ') || 'Not set');
    if (draft.value) deal.append(el('span', 'su-from', `From ${req.id}`));
    card.append(
      row('Playbooks', pbs),
      row('We are', seg('side', [['provider', 'Provider'], ['customer', 'Customer']])),
      row('Paper', seg('paper', [['ours', 'Ours'], ['theirs', 'Theirs']])),
      row('Approach', appr),
      row('Deal', deal));
    const foot = el('div', 'su-foot');
    const cancel = el('button', 'btn ghost', 'Cancel');
    cancel.onclick = () => { R.setupOpen = false; renderWorkspace(); };
    const go = el('button', 'btn primary', 'Re-run');
    go.onclick = () => {
      R.setupOpen = false;
      const { stack, ...setup } = draft;
      const label = `${R.a.name} with the ${withWord(R.a.playbook.name)}${stack.length ? ' and ' + stack.map(id => withWord(pbFind(id)?.name || id)).join(', ') : ''}`;
      renderProgress(label, () => {
        R.setup = setup; R.setupSet = true; R.stack = stack; R.choice = {};
        R.a = withStack(baseReview()); R.deep = R.a.deep || {};
        renderWorkspace();
        const none = stack.filter(id => !(RP.stack?.[id] || []).length);
        toast(none.length ? `Nothing in this contract falls under the ${withWord(pbFind(none[0])?.name || none[0])}` : `Ran it again · ${SETUP_W.approach[setup.approach]}`);
      });
    };
    foot.append(el('span', 'grow'), cancel, go);
    card.append(foot);
    return card;
  }

  /* ── the deal as a whole: what their changes add up to, and who they are ── */
  function dealLines(list) {
    if (!RP.exposure && !RP.counterparty) return;
    const wrap = el('div', 'deal');
    const clause = (n) => R.a.clauses.find(c => c.n === n);
    const pkgOf = (k) => k === 'exposure'
      ? RP.exposure.moves.map(m => ({ c: clause(m.n), key: m.key })).filter(x => x.c)
      : R.a.clauses.filter(c => c.changed && ['fallback', 'unacceptable'].includes(c.status)).map(c => ({ c, key: c.status === 'fallback' ? 'theirs' : 'fallback' }));
    const moveOpt = (x) => optsFull(x.c).find(o => o.key === x.key);
    const isOn = (k) => pkgOf(k).every(x => R.applied[String(x.c.n)] === moveOpt(x)?.text);
    const line = (k, ic, text, act) => {
      const r = el('div', 'dl' + (R.deal === k ? ' open' : ''));
      const i = el('span', 'dl-ic ' + k); i.innerHTML = ic;
      const b = el('button', 'dl-act', isOn(k) ? 'Applied' : act);
      b.onclick = () => { R.deal = R.deal === k ? null : k; renderWorkspace(); };
      r.append(i, el('span', 'dl-t', text), b);
      wrap.append(r);
      if (R.deal === k) wrap.append(pkgCard(k));
    };
    function pkgCard(k) {
      const moves = pkgOf(k);
      const card = el('div', 'scard pkg');
      card.append(el('p', 'pkg-say', k === 'exposure' ? RP.exposure.detail : RP.counterparty.close));
      const ul = el('ul', 'pkg-moves');
      for (const x of moves) {
        const o = moveOpt(x);
        const li = el('li');
        li.append(icon(x.c.status), refChip(x.c), el('span', 'pkg-to', o ? (o.key === 'theirs' ? 'Accept their change' : o.label) : '—'));
        ul.append(li);
      }
      card.append(ul);
      if (k === 'close') {
        const acc = moves.filter(x => x.key === 'theirs').length;
        card.append(el('p', 'pkg-fc', `Accept ${acc}, counter ${moves.length - acc}. Expected: 1 turn instead of ${RP.counterparty.turns}.`));
      }
      const foot = el('div', 'sfoot');
      foot.append(el('span', 'grow'));
      if (isOn(k)) {
        const undo = el('button', 'btn ghost', 'Undo');
        undo.onclick = () => { for (const x of moves) { delete R.applied[String(x.c.n)]; delete R.mode[String(x.c.n)]; } renderWorkspace(); };
        foot.append(undo);
      } else {
        const go = el('button', 'btn primary', k === 'exposure' ? 'Apply package' : 'Apply all');
        go.onclick = () => {
          const before = moves.map(x => [String(x.c.n), R.applied[String(x.c.n)], R.mode[String(x.c.n)]]);
          for (const x of moves) { const o = moveOpt(x); if (o) applyOpt(String(x.c.n), o); }
          renderWorkspace();
          toast(`Applied ${moves.length} changes as one counter`, { label: 'Undo', run: () => {
            for (const [key, t, m] of before) { if (t == null) { delete R.applied[key]; delete R.mode[key]; } else { R.applied[key] = t; R.mode[key] = m; } }
            renderWorkspace();
          } });
        };
        foot.append(go);
      }
      card.append(foot);
      return card;
    }
    if (RP.exposure) line('exposure', RP_IC.expo, RP.exposure.line, 'Counter as a package');
    if (RP.counterparty) line('close', RP_IC.hist, RP.counterparty.line, 'Close in one turn');
    list.append(wrap);
  }

  /* ── the clause card's own facts: sign-off, their comments, why, our deals, how sure ── */
  function clauseExtras(c) {
    const key = String(c.n), out = [];
    const so = R.signoff[key];
    if (so) {
      const st = soState(key, so);
      const l = el('div', 'soline ' + st);
      const m = el('span', 'so-m'); m.innerHTML = st === 'approved' ? TICK : RP_IC.dot;
      l.append(m);
      if (st === 'waiting') l.append(el('span', null, `With ${so.to} for sign-off · sent ${so.at}`));
      else if (st === 'approved') l.append(el('span', null, `${so.to} approved ${so.label.toLowerCase()} · ${so.doneAt}`));
      else {
        l.append(el('span', null, `${first(so.to)} approved different wording. `));
        const again = el('button', 'viewlink', 'Ask again');
        again.onclick = () => { R.signing = key; renderWorkspace(); };
        l.append(again);
      }
      out.push(l);
      if (st !== 'waiting' && so.reply) out.push(el('p', 'so-reply', `“${so.reply}”`));
    }
    /* their comments in the Word file, answered here */
    for (const n of (R.notes[key] || []).filter(x => x.theirs)) {
      const card = el('div', 'their');
      const hd = el('div', 'their-h');
      hd.append(el('b', null, n.by), el('span', null, `${n.org} · ${n.when}`));
      card.append(hd, el('p', 'their-t', n.text));
      const mine = (R.notes[key] || []).filter(x => x.replyTo === n.by);
      for (const r of mine) { const re = el('div', 'their-r'); re.append(el('b', null, 'You'), el('span', null, r.text)); card.append(re); }
      if (R.composing[key]?.reply === n.by) card.append(composerBox(key));
      else if (!mine.length) {
        const rp = el('button', 'viewlink', 'Reply');
        rp.onclick = () => { R.composing[key] = { draft: '', internal: false, reply: n.by, suggest: n.draft }; renderWorkspace(); };
        card.append(rp);
      }
      out.push(card);
    }
    if (c.status === 'missing' && c.from) return out;
    const rule = ruleOf(c);
    const meta = el('div', 'rmeta');
    const mrow = (ic, cls, ...body) => { const r = el('div', 'rm ' + cls); const i = el('span', 'rm-ic'); i.innerHTML = ic; r.append(i); const t = el('span', 'rm-t'); t.append(...body); r.append(t); meta.append(r); };
    const link = (t, run) => { const b = el('button', 'rm-link', t); b.onclick = (e) => { e.stopPropagation(); run(); }; return b; };
    if (c.status !== 'none') mrow(RP_IC.book, 'rm-why', rule?.why ? document.createTextNode(rule.why + ' ') : '', link('View in playbook', () => openRuleSheet(pane.querySelector('.jv-panel'), c)));
    if (rule?.bench) mrow(RP_IC.bench, 'rm-bench', document.createTextNode(rule.bench.line + ' '), link('See deals', () => benchSheet(c)));
    if (rule?.tested && rule.tested[0] / rule.tested[1] < 0.8)
      mrow(RP_IC.check, 'rm-weak', document.createTextNode(`Check this one: Clavia matched your lawyers on ${rule.tested[0]} of ${rule.tested[1]} past contracts for this rule.`));
    if (rule?.law) mrow(RP_IC.law, 'rm-law', document.createTextNode(rule.law.text + ' · '), link(rule.law.id, () => { persist(); mxOpen('horizon', rule.law.id); }));
    if (meta.childElementCount) out.push(meta);
    return out;
  }

  /* the bottom sheet the pane already uses, for anything that is a list */
  function bottomSheet(title, sub, fill) {
    const panel = pane.querySelector('.jv-panel');
    panel.querySelector('.jv-sheet-wrap')?.remove();
    const wrap = el('div', 'sheet-wrap'), backdrop = el('div', 'sheet-backdrop'), sheet = el('div', 'sheet rulesheet');
    const top = el('div', 'sheet-top'), x = el('button', 'sheet-x');
    x.setAttribute('aria-label', 'Close');
    x.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    const tb = el('div', 'sheet-tt'); tb.append(el('b', null, title), el('span', null, sub));
    top.append(tb, x);
    const list = el('div', 'sheet-list');
    fill(list);
    const close = () => { wrap.classList.remove('jv-open'); removeEventListener('keydown', onKey, true); setTimeout(() => wrap.remove(), 380); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    sheet.append(el('div', 'sheet-grip'), top, list);
    wrap.append(backdrop, sheet); panel.append(wrap);
    sheet.getBoundingClientRect();
    requestAnimationFrame(() => wrap.classList.add('jv-open'));
    addEventListener('keydown', onKey, true);
    backdrop.onclick = close; x.onclick = close;
  }
  function benchSheet(c) {
    const b = ruleOf(c).bench;
    bottomSheet('Our deals', `${bare(c.heading)} · signed MSAs over £1M`, (list) => {
      list.append(Object.assign(el('p', 'rwhy'), { textContent: b.line }));
      const t = el('div', 'bench');
      for (const d of RP_DEALS) {
        const r = el('div', 'bench-r');
        r.append(el('b', null, d.name), el('span', 'bench-m', `${d.when} · ${d.value}`), el('span', 'bench-v', d[b.field]));
        t.append(r);
      }
      list.append(t);
    });
  }

  /* ── the card's foot: accept their wording, ask the owner, say it's wrong ── */
  function applyBtn(key, c, sel) {
    if (sel.key !== 'theirs') return applyMenu(key, sel.text);
    const b = el('button', 'btn primary', 'Accept');

    b.onclick = () => { if (R.ai?.key === key) R.ai = null; applyOpt(key, sel); renderWorkspace(); };
    return b;
  }
  function askOwner(key, c) {
    const to = ownerOf(c);
    const so = R.signoff[key];
    if (!to || c.status !== 'unacceptable' || (so && soState(key, so) !== 'stale')) return '';
    const b = el('button', 'btn ghost', `Ask ${first(to)}`);
    b.dataset.tip = `Send to ${to} for Sign-off`;
    b.onclick = () => { R.signing = key; renderWorkspace(); };
    return b;
  }
  function signoffBox(key, c, sel) {
    const to = ownerOf(c);
    const box = el('div', 'sobox');
    const hd = el('div', 'so-h');
    hd.append(faceEl(to, 'so-face'), el('b', null, to), el('span', null, c.escalate));
    box.append(hd);
    const facts = el('dl', 'so-facts');
    /* what they asked for is what they added, said in plain case */
    const added = (c.segments || []).filter(([k]) => k === 'ins').map(([, t]) => t.trim().replace(/^[,;\s]+/, '')).filter(Boolean).join('; ');
    const plain = (t) => t === t.toUpperCase() ? t.toLowerCase().replace(/^\w/, x => x.toUpperCase()).replace(/\bsection (\d+) \(([^)]+)\)/gi, (m, n, x) => `Section ${n} (${x.replace(/\b\w/g, y => y.toUpperCase())})`) : t;
    const theirAsk = RP.asks?.[c.n] || c.issue || (added ? plain(added) : '') || (R.deep[key]?.reasoning || []).find(p => p.quote)?.quote || c.text;
    facts.append(el('dt', null, 'They ask'), el('dd', null, theirAsk.length > 180 ? theirAsk.slice(0, 178) + '…' : theirAsk),
      el('dt', null, 'We’d offer'), el('dd', null, sel.key === 'theirs' ? 'Accept their change' : sel.label),
      el('dt', null, 'Clavia'), el('dd', null, (R.deep[key]?.summary || c.summary || '').split(/(?<=\.)\s/)[0]));
    box.append(facts);
    const ta = Object.assign(document.createElement('textarea'), { rows: 1, placeholder: `Add a note for ${first(to)}` });
    box.append(ta);
    const acts = el('div', 'acts2');
    const cancel = el('button', 'btn ghost', 'Cancel');
    cancel.onclick = () => { R.signing = null; renderWorkspace(); };
    const send = el('button', 'btn primary', 'Send for sign-off');
    send.onclick = () => {
      const so = { to, role: c.escalate, text: sel.text, label: sel.key === 'theirs' ? 'their change' : sel.label, at: nowT(), state: 'waiting', note: ta.value.trim() };
      R.signoff[key] = so; R.signing = null;
      renderWorkspace();
      toast(`Sent to ${to} in Teams`);
      /* scripted: the owner answers a few seconds later */
      setTimeout(() => {
        if (R.signoff[key] !== so) return;
        Object.assign(so, { state: 'approved', doneAt: nowT(), reply: `Fine to go to ${so.label.toLowerCase()}. Nothing beyond it without me.` });
        persist();
        if (pane.isConnected) renderWorkspace();
        toast(`${first(to)} approved · ${bare(c.heading)}`);
      }, 6000);
    };
    acts.append(cancel, send);
    const row = el('div', 'so-foot'); row.append(el('span', 'grow'), acts);
    box.append(row);
    requestAnimationFrame(() => ta.focus({ preventScroll: true }));
    return box;
  }
  function notRight(key, c) {
    const b = el('button', 'nr');
    b.innerHTML = RP_IC.thumb; b.dataset.tip = 'Not Right?'; b.setAttribute('aria-label', 'Not right?');
    b.onclick = (e) => {
      e.stopPropagation();
      menu(b, ['Wrong position', 'Wrong clause', 'Too aggressive', 'Not aggressive enough'].map(r => ({ label: r, run: () => {
        (state.pbFeedback ||= []).push({ review: req.review, clause: key, topic: bare(c.heading), reason: r, by: ME, at: new Date().toISOString() });
        save();
        toast(`Noted. ${pbFind(R.a.playbook.id)?.owner || 'The playbook owner'} sees it when they next look at this rule.`);
      } })));
    };
    return b;
  }

  /* a change for the playbook, proposed from the review that showed it was needed */
  const isProposed = (c, text) => (state.pbProposals || []).some(p => p.pb === R.a.playbook.id && p.text === text);
  function propose(c, kind, text) {
    const pb = pbFind(R.a.playbook.id);
    (state.pbProposals ||= []).push({ id: rid(), pb: R.a.playbook.id, topic: c.topic || bare(c.heading), heading: bare(c.heading), kind, text, from: req.id, counterparty: RP.counterparty?.name || req.counterparty, by: ME, at: new Date().toISOString() });
    save(); renderWorkspace();
    toast(`Proposed to ${pb?.owner || 'the owner'} for the ${withWord(R.a.playbook.name)}`, { label: 'Undo', run: () => { state.pbProposals.pop(); save(); renderWorkspace(); } });
  }

  /* ── finishing: everything at once, the issues list, a note to the requester, a new version ── */
  function issuesRows() {
    return all().filter(c => c.status !== 'preferred' && c.status !== 'none').map(c => {
      const key = String(c.n), opts = c.status === 'missing' ? [] : optsFull(c);
      const ours = R.applied[key] ?? opts[defaultIdx(c, opts)]?.text ?? c.need ?? '';
      return { c, point: bare(c.heading), status: STATUS[c.status].label, theirs: c.status === 'missing' ? 'Not in the contract' : c.text, ours,
        state: R.mode[key]?.accepted ? 'Accepted' : R.applied[key] != null ? 'Countered' : R.signoff[key] ? (soState(key, R.signoff[key]) === 'waiting' ? `With ${first(R.signoff[key].to)}` : `${first(R.signoff[key].to)} approved`) : 'Open' };
    });
  }
  function downloadIssues() {
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const rows = issuesRows().map(r => `<tr><td><b>${esc(r.point)}</b><br><span style="color:#6B6862">${esc(r.status)}</span></td><td>${esc(r.ours)}</td><td>${esc(r.theirs)}</td><td>${esc(r.state)}</td></tr>`).join('');
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:Calibri,Arial;font-size:10.5pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #D8D3CC;padding:6px 8px;vertical-align:top;text-align:left}th{background:#F4F2EF}</style></head><body>`
      + `<h2>${esc(R.a.name)} — issues list</h2><p>Reviewed against the ${esc(withWord(R.a.playbook.name))} (${esc(pubOf())}) · ${esc(SETUP_W.approach[R.setup.approach])} · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>`
      + `<table><tr><th>Point</th><th>Our position</th><th>Their position</th><th>Where it stands</th></tr>${rows}</table></body></html>`;
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([html], { type: 'application/msword' })), download: `${R.a.name} – Issues list.doc` });
    document.body.append(a); a.click(); a.remove();
    toast('Issues list downloaded');
  }
  function summaryLines() {
    const cs = all();
    const accepted = cs.filter(c => R.mode[String(c.n)]?.accepted).length;
    const countered = cs.filter(c => R.applied[String(c.n)] != null && !R.mode[String(c.n)]?.accepted).length;
    const waiting = cs.filter(c => R.signoff[String(c.n)] && soState(String(c.n), R.signoff[String(c.n)]) === 'waiting');
    const open = cs.filter(c => !isReviewed(c)).length;
    const who = RP.counterparty?.name || req.counterparty || 'They';
    const lines = [`${who} sent ${RP.version || 'their version'} with ${cs.filter(c => c.changed).length} changes to our ${R.a.playbook.name.replace(/ agreement$/i, '')} terms.`];
    const did = [accepted && `accepted ${accepted} that sit inside our playbook`, countered && `countered ${countered} with our positions`].filter(Boolean);
    lines.push(did.length ? `We’ve ${did.join(' and ')}.` : 'Nothing is accepted or countered yet.');
    if (RP.exposure && R.applied['9'] != null) lines.push('The one that matters: their changes left us uncapped for a data breach. Our counter puts it back under a separate cap of two times the annual fees.');
    if (waiting.length) lines.push(`${waiting.length === 1 ? 'One point is' : `${waiting.length} points are`} with ${[...new Set(waiting.map(c => R.signoff[String(c.n)].to))].join(' and ')} for sign-off.`);
    lines.push(open ? `${open} still to review; we’ll send our response once they’re settled.` : `We can send our response today.`);
    return lines;
  }
  function summaryDialog() {
    const to = req.requester || 'the requester';
    const dim = h('div', { class: 'pb-dim', onclick: (e) => { if (e.target === dim) close(); } });
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const close = () => { document.removeEventListener('keydown', onKey); dim.classList.add('is-closing'); setTimeout(() => dim.remove(), 150); };
    const lines = summaryLines();
    const body = h('div', { class: 'jv-sum-body' }, ...lines.map(t => h('p', {}, t)));
    dim.append(h('div', { class: 'pb-dlg jv-sum', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Summary for ${to}` },
      h('header', { class: 'pb-dlg-head' }, h('h2', { class: 'pb-dlg-t' }, `Summary for ${to}`),
        h('button', { class: 'pb-icon-btn', type: 'button', 'aria-label': 'Close', 'data-tip': 'Close', html: CROSS, onclick: close })),
      h('div', { class: 'jv-sum-to' }, h('span', {}, 'To'), faceEl(to, 'jv-sum-face'), h('b', {}, to), h('span', { class: 'jv-sum-sub' }, `Re: ${req.title || R.a.name}`)),
      body,
      h('footer', { class: 'jv-sum-foot' },
        h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => { navigator.clipboard?.writeText(lines.join('\n\n')); toast('Copied'); } }, 'Copy'),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => { close(); toast(`Opened in Outlook as a draft to ${to}`); } }, 'Open in Outlook'))));
    document.body.append(dim);
    document.addEventListener('keydown', onKey);
  }
  function finishMenu(btn) {
    const pend = all().filter(c => ['unacceptable', 'fallback'].includes(c.status) && R.applied[String(c.n)] == null && !R.dismissed.has(String(c.n)) && optsFull(c).length);
    const changes = Object.keys(R.applied).length;
    menu(btn, [
      { label: pend.length ? `Apply all suggestions (${pend.length})` : 'Apply all suggestions', run: () => {
        if (!pend.length) return toast('Nothing left to apply');
        const before = pend.map(c => String(c.n));
        for (const c of pend) { const o = optsFull(c); applyOpt(String(c.n), o[defaultIdx(c, o)]); }
        renderWorkspace();
        toast(`Applied ${pend.length} changes`, { label: 'Undo', run: () => { for (const k of before) { delete R.applied[k]; delete R.mode[k]; } renderWorkspace(); } });
      } },
      { label: 'Mark all reviewed', run: () => { const was = new Set(R.reviewed); all().forEach(c => R.reviewed.add(String(c.n))); renderWorkspace(); toast('All marked reviewed', { label: 'Undo', run: () => { R.reviewed = was; renderWorkspace(); } }); } },
      { rule: true },
      { label: 'Download issues list', run: downloadIssues },
      { label: `Summary for ${req.requester || 'the requester'}`, run: summaryDialog },
      req.respond ? null : { label: `Save as ${nextV()}`, run: () => {
        (req.activity ||= []).push({ who: ME, what: `saved our redline as ${nextV()} (${changes} ${changes === 1 ? 'change' : 'changes'})`, when: mxNow() }); save();
        toast(`Saved as ${nextV()} on ${req.id}`);
      } },
    ]);
  }

  /* ── files into Ask: from this computer, or a connected source ── */
  const FILE_IC = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h8l4.5 4.5v12a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 6 3.5z"/><path d="M13.5 3.5V9h5"/></svg>';
  function attachBtn() {
    const input = Object.assign(document.createElement('input'), { type: 'file', multiple: true, hidden: true,
      accept: '.docx,.doc,.pdf,.txt,.md,.rtf,.odt,.xlsx' });
    const addFiles = (list) => { (R.askFiles ||= []).push(...list); R.focusAsk = true; renderWorkspace(); };
    input.onchange = () => { addFiles([...input.files].map(f => ({ name: f.name }))); input.value = ''; };
    const b = el('button', 'askplus');
    b.type = 'button';
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    b.dataset.tip = 'Add Files'; b.setAttribute('aria-label', 'Add files');
    b.onclick = (e) => {
      e.stopPropagation();
      menu(b, [
        { label: 'Upload from your computer', html: PB_UPLOAD, run: () => input.click() },
        { rule: true },
        ...Object.entries(PB_SOURCES).map(([id, src]) => ({ label: src.name, html: pbBrand(id),
          run: () => sourcePicker(id, (names) => addFiles(names.map(n => ({ name: n, src: id })))) })),
      ]);
    };
    const wrap = el('span', 'askplus-w');
    wrap.append(b, input);
    return wrap;
  }
  function fileChips(files, onRemove) {
    const row = el('div', 'afiles');
    files.forEach((f, i) => {
      const chip = el('span', 'afile');
      const ic = el('span', 'afile-ic'); ic.innerHTML = f.src ? pbBrand(f.src, 14) : FILE_IC;
      chip.append(ic, el('span', 'afile-n', f.name));
      if (onRemove) {
        const x = el('button', 'afile-x'); x.innerHTML = CROSS; x.dataset.tip = 'Remove'; x.setAttribute('aria-label', 'Remove ' + f.name);
        x.onclick = (e) => { e.stopPropagation(); onRemove(i); };
        chip.append(x);
      }
      row.append(chip);
    });
    return row;
  }

  /* ── empty states: a dotted placeholder, what happened in a line, and what to do ── */
  const PH_IC = {
    book: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.3C10.5 4.8 8.2 4.3 4.5 4.5v12.3c3.7-.2 6 .3 7.5 1.8 1.5-1.5 3.8-2 7.5-1.8V4.5c-3.7-.2-6 .3-7.5 1.8zM12 6.3v12.3"/></svg>',
    filter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16l-6.2 7.2v5.6l-3.6 1.7v-7.3z"/></svg>',
  };
  function placeholder(ic, title, say, acts) {
    const box = el('div', 'ph');
    const i = el('span', 'ph-ic'); i.innerHTML = PH_IC[ic];
    box.append(i, el('b', 'ph-t', title), el('p', 'ph-d', say));
    const row = el('div', 'ph-acts');
    for (const [label, run] of acts) { const b = el('button', 'tert', label); b.type = 'button'; b.onclick = run; row.append(b); }
    box.append(row);
    return box;
  }
  /* the playbook whose clauses best fit this contract's, other than the one just run */
  function bestPlaybook() {
    const heads = new Set(A.clauses.map(c => (c.topic || bare(c.heading)).toLowerCase().split(/\W+/)[0]));
    let best = null, score = 0;
    for (const pb of pbList()) {
      if (pb.id === R.a.playbook.id || pb.status === 'archived') continue;
      const n = (pb.clauses || []).filter(r => heads.has((r.topic || '').toLowerCase().split(/\W+/)[0])).length;
      if (n > score) { best = pb; score = n; }
    }
    return best;
  }
  function runPlaybook(pb) {
    renderProgress(`${R.a.name} with the ${withWord(pb.name)}`, () => {
      req.playbook = pb.id; req.ran = pb.id;
      Object.assign(R, { a: withStack(rerun(pb)), open: new Set(), choice: {}, dismissed: new Set(), q: '', filter: 'all', focus: null, tab: 'playbook' });
      R.deep = R.a.deep || {};
      renderWorkspace();
    });
  }
  function unmatchedState() {
    const pb = bestPlaybook();
    const kind = pb ? pb.name.replace(/ playbook$/i, '') : '';
    const short = pb ? pb.name.replace(/ (agreement|addendum|playbook)$/i, '') : '';
    return placeholder('book', 'This playbook doesn’t cover this contract',
      'No clause here matches this playbook. Pick one made for this type of contract.',
      [['Choose another playbook', () => openPlaybookSheet(pane.querySelector('.jv-panel'))]]);
  }
  function filteredState() {
    const label = FILTERS.flat().find(([v]) => v === R.filter)?.[1] || 'All clauses';
    const n = all().length;
    const SAY = {
      unacceptable: 'No clause in this contract crosses a line the playbook won’t accept.',
      fallback: 'No clause in this contract sits on a fallback.',
      preferred: 'No clause in this contract is on the starting position.',
      missing: 'Every clause the playbook expects is in this contract.',
      none: 'Every clause in this contract is covered by the playbook.',
      changed: 'No clause has changed since the last version.',
      open: 'Every clause in this contract is reviewed.',
    };
    const showAll = ['Show all clauses', () => { R.filter = 'all'; R.q = ''; renderWorkspace(); }];
    if (R.q) return placeholder('filter', `Nothing matches “${R.q.trim()}”`,
      `${R.filter !== 'all' ? `Searched ${label.toLowerCase()} only. ` : ''}Search covers clause names and text.`,
      [['Clear search', () => { R.q = ''; renderWorkspace(); }], ...(R.filter !== 'all' ? [showAll] : [])]);
    return placeholder('filter', R.filter === 'missing' ? 'Nothing is missing' : R.filter === 'open' ? 'Everything is reviewed' : `No ${label.toLowerCase()} clauses`,
      SAY[R.filter] || 'No clause fits this filter.', [showAll]);
  }

  /* ── skills in Ask: "/" and a name; each answers from this contract ── */
  function runSkill(x) {
    const m = { role: 'jev', kind: 'run', steps: [], working: x.k === 'terms' ? 'Reading the definitions' : 'Reading the contract', groups: null };
    R.chat.push({ role: 'you', text: '/' + x.label, files: takeFiles() }, m);
    R.askDraft = ''; R.askContext = '';
    paintAsk('askStick');
    setTimeout(() => {
      const cs = R.a.clauses;
      m.working = null;
      if (x.k === 'changes') {
        const ch = cs.filter(c => c.changed);
        m.steps.push(`Compared ${RP.version || 'their version'} with our last version`);
        m.lines = ch.map(c => [{ ref: c }, ' ', RP.asks?.[c.n] || ((R.deep[String(c.n)]?.summary || c.summary || '').split(/(?<=\.)\s/)[0]) || STATUS[c.status].label + '.']);
        m.note = [ch.length ? `${ch.length} of ${cs.length} clauses changed; the rest is as we sent it.` : 'They changed nothing.'];
      } else if (x.k === 'terms') {
        const defs = [], defC = cs.find(c => /“[^”]+”\s+means/.test(curText(c)));
        for (const c of cs) for (const mm of curText(c).matchAll(/“([^”]+)”\s+means/g)) defs.push(mm[1]);
        const heads = new Set(cs.map(c => bare(c.heading)));
        const STOP = /^(Either|Neither|Each|Except|This|The|If|Provider|Customer|Section|Subscription and)\b/;
        const used = new Map();
        for (const c of cs) for (const mm of curText(c).matchAll(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)+\b/g)) {
          const t = mm[0];
          if (STOP.test(t) || heads.has(t) || defs.includes(t)) continue;
          if (!used.has(t)) used.set(t, []);
          if (!used.get(t).includes(c)) used.get(t).push(c);
        }
        const unused = defs.filter(d => !cs.some(c => c !== defC && curText(c).includes(d)));
        const refs = [];
        for (const c of cs) for (const mm of curText(c).matchAll(/Section (\d+)(?: \(([^)]+)\))?/gi)) {
          const tgt = cs.find(y => String(y.heading).startsWith(mm[1] + '.'));
          refs.push({ c, ok: tgt && (!mm[2] || bare(tgt.heading).toLowerCase() === mm[2].toLowerCase()), text: mm[0] });
        }
        m.steps.push(`Read ${defs.length} definitions and ${refs.length} cross-references`);
        m.lines = [];
        if (defC) m.lines.push(['Defined in ', { ref: defC }, `: ${defs.join(', ')}.`]);
        for (const [t, where] of [...used.entries()].slice(0, 6)) m.lines.push([{ b: t }, ' is used but never defined, in ', ...where.slice(0, 2).flatMap((c, i) => i ? [' and ', { ref: c }] : [{ ref: c }]), '.']);
        for (const t of unused) m.lines.push([{ b: t }, ' is defined but never used.']);
        const bad = refs.filter(r => !r.ok);
        m.lines.push(bad.length ? ['Broken cross-reference: ', { b: bad[0].text }, ' in ', { ref: bad[0].c }, '.'] : [`All ${refs.length} cross-references point to the right clause.`]);
        m.note = [used.size ? 'Worth defining these in §1 before we send our response.' : 'Definitions are in order.'];
      } else if (x.k === 'obligations') {
        const out = [];
        /* a duty is a party that will, must or shall do something, by a time */
        const DUE = /(\(\d+\)|\b\d+)\s*(business )?(days?|hours?|months?)|without undue delay|in advance/i;
        for (const c of cs) for (const sx of curText(c).split(/(?<=[.;])\s+/)) {
          const m2 = /\b(Provider|Customer|Either party|Each party)\s+(will|must|shall)\s+([^.;]+)/i.exec(sx);
          if (m2 && DUE.test(m2[3])) out.push([{ b: m2[1][0].toUpperCase() + m2[1].slice(1) }, ` ${m2[2]} ${m2[3].trim()} `, { ref: c }]);
          else if (/\bpayable within\b/i.test(sx) && DUE.test(sx)) out.push([{ b: 'Customer' }, ` pays ${sx.match(/payable (within [^.;]+)/i)[1].trim()} `, { ref: c }]);
        }
        m.steps.push(`Read ${cs.length} clauses as they stand now`);
        m.lines = out;
        m.note = [out.length ? `${out.length} obligations with a deadline.` : 'No obligations with a deadline.'];
      } else {
        const rows = issuesRows();
        m.steps.push(`Checked ${all().length} clauses against the ${withWord(R.a.playbook.name)}`);
        m.lines = rows.map(r => [{ ref: r.c }, ` ${r.status} · ${r.state}`]);
        m.note = [`${rows.length} points. Download it as a Word table to send.`];
        m.acts = [{ label: 'Download issues list', run: downloadIssues }];
      }
      paintAsk('askSeek');
    }, 1000);
  }

  /* a reload opens on the playbook that was last run */
  const ran = req.ran && pbFind(req.ran);
  /* Clavia's own additions to the saved review, folded in once */
  const extra = typeof JV_REVIEW_EXTRA !== 'undefined' && JV_REVIEW_EXTRA[req.review];
  if (extra && !A.extraDone) {
    A.extraDone = true;
    for (const [n, list] of Object.entries(extra)) {
      const deep = A.deep?.[n], c = A.clauses.find(x => String(x.n) === n);
      if (!deep || !c) continue;
      for (const add of list) {
        const have = deep.options.find(o => o.key === add.key);
        if (have) Object.assign(have, add.text ? { ...add, segments: redlineOf(c.text || '', add.text) } : add);
        else deep.options.push({ summary: '', ...add, segments: redlineOf(c.text || '', add.text) });
      }
    }
  }
  R.a = withStack(ran ? rerun(ran) : A);
  R.deep = R.a.deep || {};
  /* a state of the pane by its address, to send to someone: ?review=unmatched runs a playbook
     that covers none of the contract; ?review=filtered opens on a filter with nothing in it */
  const SHOW = reviewPage.shown ? null : new URLSearchParams(location.search).get('review');
  if (SHOW) reviewPage.shown = true;
  if (SHOW === 'unmatched') {
    const other = pbList().find(pb => /nda/i.test(pb.name)) || pbList().find(pb => pb.id !== A.playbook.id);
    if (other) {
      const clauses = A.clauses.map(c => ({ ...c, status: 'none', topic: 'Not covered by the playbook', summary: 'This playbook has no clause for this.', why: '', issue: '', their_text: '', suggestions: [] }));
      R.a = { ...A, playbook: { id: other.id, name: other.name }, clauses, missing: [], counts: { none: clauses.length }, deep: {}, missing_checked: false, standIn: true };
      R.deep = {};
    }
  } else if (SHOW === 'filtered') R.filter = 'missing';
  renderWorkspace();
  return pane;
}
