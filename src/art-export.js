/* ── Export, with the changes Word can answer ─────────────────
   The artifact header has always listed Word and PDF under Download, and
   clicking either only said the download was coming. This gives those two
   rows a writer, and adds the third thing people want from a redline: it
   put on the request it belongs to, so Legal finds it where they are
   already looking rather than in somebody's downloads folder.

   Word's own HTML dialect is what makes the tracked changes real. When
   Word saves a tracked document as a web page it writes each revision as
   <span class=msoIns><ins cite=… datetime=…>, and it reads that straight
   back into the reviewing pane as a change you can Accept or Reject.
   mxTplToWord already delivers a Word file this way — BOM, msword blob,
   a link clicked and revoked — it just writes plain filled text. This
   writes the revisions, from the ins/del that docRedline already put on
   the blocks, so nothing new had to be invented to carry them. */

/* this file may not touch the shared stylesheets, so it brings its own
   once. Tokens with a fallback, because the dialog has to look right
   even where the token has not been defined yet. Written with the raw
   DOM rather than h(), so this file can sit anywhere in the load order
   instead of only after app.js. */
(() => {
  if (document.getElementById('ax-css')) return;
  const el = document.createElement('style');
  el.id = 'ax-css';
  el.textContent = `
.ax-opts { display: flex; flex-direction: column; gap: 8px; }
.ax-opt { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; padding: 0 14px;
  border: 1px solid var(--line, #E8E4DF); border-radius: 12px; background: var(--surface, #FCFCFB);
  font: inherit; text-align: left; cursor: pointer;
  transition: border-color 160ms var(--ease, ease), box-shadow 160ms var(--ease, ease); }
.ax-opt:hover { border-color: var(--text-faint, #9A968E); }
.ax-opt[aria-checked="true"] { border-color: var(--rail-bg, #1A1A18); box-shadow: inset 0 0 0 1px var(--rail-bg, #1A1A18); }
.ax-opt .mx-tile { flex: none; }
.ax-opt-t { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; line-height: 1.35; }
.ax-opt-n { font-size: 14px; font-weight: 500; color: var(--text, #141413); }
.ax-opt-s { font-size: 12px; color: var(--text-faint, #9A968E); }
.ax-dot { flex: none; width: 15px; height: 15px; border-radius: 50%;
  border: 1.25px solid var(--line-strong, #D8D3CC); background: var(--surface, #FCFCFB); }
.ax-opt[aria-checked="true"] .ax-dot, .ax-req[aria-checked="true"] .ax-dot {
  border-color: var(--rail-bg, #1A1A18);
  box-shadow: inset 0 0 0 3.5px var(--surface, #FCFCFB), inset 0 0 0 8px var(--rail-bg, #1A1A18); }
.ax-note { margin: 0; font-size: 12px; line-height: 1.5; color: var(--text-faint, #9A968E); }
/* the shared .mx-rqf-f sets display:flex, which outranks the browser's
   own [hidden] rule — so the half of the dialog that is not in play has
   to be told to go away in a voice loud enough to be heard */
.ax-dlg .mx-rqf-f[hidden], .ax-dlg .ax-note[hidden] { display: none; }
.ax-search { position: relative; display: flex; align-items: center; }
.ax-search-ic { position: absolute; left: 12px; display: grid; color: var(--text-faint, #9A968E); pointer-events: none; }
.ax-search .mx-rqf-in { padding-left: 36px; }
.ax-reqs { display: flex; flex-direction: column; max-height: 216px; overflow-y: auto;
  border: 1px solid var(--line, #E8E4DF); border-radius: 12px; }
.ax-req { display: flex; align-items: center; gap: 10px; min-height: 46px; padding: 0 12px;
  border: 0; background: none; font: inherit; text-align: left; cursor: pointer; }
.ax-req + .ax-req { border-top: 1px solid var(--line, #F0EDE8); }
.ax-req:hover, .ax-req[aria-checked="true"] { background: var(--tint, #F7F5F2); }
.ax-req-id { flex: none; font-size: 12px; font-weight: 500; color: var(--text-soft, #6B6762); font-variant-numeric: tabular-nums; }
.ax-req-t { flex: 1; min-width: 0; font-size: 13px; color: var(--text, #141413);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ax-req-sug { flex: none; display: inline-flex; align-items: center; height: 19px; padding: 0 7px;
  border-radius: 5px; background: var(--tint, #F3F1ED); font-size: 11px; color: var(--text-soft, #6B6762); }
.ax-req .mx-st { flex: none; }
.ax-empty { margin: 0; padding: 15px 14px; font-size: 13px; color: var(--text-faint, #9A968E); }
/* off to the side at full page size: a frame sized 1px prints one blank
   sheet, and visibility:hidden prints nothing at all */
.ax-print { position: fixed; left: -10000px; top: 0; width: 210mm; height: 297mm; border: 0; }
`;
  document.head.append(el);
})();

const axEsc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const AX_IC = (p, w = 16) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" `
  + `stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const AX_X = AX_IC('<path d="M6 6l12 12M18 6 6 18"/>', 14);
const AX_SEARCH = AX_IC('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>', 15);
const AX_TAGMARK = AX_IC('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4.8'
  + 'a2 2 0 0 1 2-2H12a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8Z"/><circle cx="7.7" cy="7.7" r="1.3"/>', 18);

/* ── reading the document ─────────────────────────────────────
   A doc artifact's blocks are { t, v } where v is html, and a tracked
   change is an <ins>/<del> inside it. Word wants runs, not markup, so
   each block is walked once and comes back as a list of runs that each
   know what they are and who proposed them. */

/* whoever is on the version being exported. docRedline stamps its
   versions 'Assistant', which is Clavia to everyone outside this code;
   anything else is the person who made the edit. */
function axAuthor(a) {
  const by = (typeof versionOf === 'function' && versionOf(a)?.by) || '';
  if (/assistant|clavia/i.test(by)) return 'Clavia';
  return /^you$/i.test(by) || !by ? (typeof USER !== 'undefined' ? USER.name : 'You') : by;
}

const AX_BLOCK_T = new Set(['p', 'h1', 'h2', 'quote']);

function axBlocks(a, mode) {
  const blocks = (typeof bodyOf === 'function' ? bodyOf(a, 'blocks') : a.blocks) || [];
  const author = axAuthor(a);
  const out = [];
  for (const b of blocks) {
    if (!b || typeof b.v !== 'string') continue;
    const t = AX_BLOCK_T.has(b.t) ? b.t : 'p';
    const host = document.createElement('div');
    host.innerHTML = b.v;
    const runs = [];
    const walk = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      if (!n.data) continue;
      const pe = n.parentElement;
      const del = pe.closest('del'), ins = pe.closest('ins');
      /* a clean copy is the document as the changes propose it: struck
         words are gone, inserted words are simply the text */
      if (del && mode === 'clean') continue;
      runs.push({
        text: n.data,
        kind: mode === 'clean' ? 'n' : del ? 'del' : ins ? 'ins' : 'n',
        author: (del || ins) ? author : null,
        b: !!pe.closest('b, strong'), i: !!pe.closest('i, em'), u: !!pe.closest('u'),
      });
    }
    if (runs.some(r => r.text.trim())) out.push({ t, runs });
  }
  return out;
}

/* does this document carry a proposal at all, or is it just text */
function axHasChanges(a) {
  const blocks = (typeof bodyOf === 'function' ? bodyOf(a, 'blocks') : a.blocks) || [];
  return blocks.some(b => typeof b?.v === 'string' && /<(ins|del)\b/i.test(b.v));
}

/* ── comments ─────────────────────────────────────────────────
   Notes made on the canvas collect on a.comments as { where, text, by,
   at }, where `where` is the heading the note sits under. Word's own
   HTML comment markup (msocomanchor plus an mso-element:comment-list)
   is a dialect I cannot verify round-trips, and when it does not the
   text disappears with it — so these travel as a numbered Comments
   section at the end, which never loses a word and reads the same in
   Word, Pages and Google Docs. The number is dropped beside the
   heading it was made against.

   review.js splits its margin notes into ours and theirs; a doc
   artifact has no such flag yet, so anything explicitly marked
   internal stays behind and the rest travels. */
function axComments(a) {
  return (a.comments || [])
    .filter(c => c && c.text && !c.internal && c.side !== 'internal')
    .map((c, i) => ({ n: i + 1, where: c.where || '', text: c.text,
      by: c.by || (typeof USER !== 'undefined' ? USER.name : 'You'), at: c.at || '' }));
}
/* `where` is trimmed to 46 characters with an ellipsis when it was
   captured, so headings are matched on the part that survived */
const axWhereKey = (s) => String(s || '').replace(/\s+/g, ' ').replace(/[…]+$/, '').trim().toLowerCase();

/* ── the body, written once for both formats ──────────────────
   Word gets the mso revision markup; the print sheet gets plain
   ins/del, which the browser already strikes and underlines. */

const AX_TAGS = { h1: 'h1', h2: 'h2', quote: 'p', p: 'p' };

function axRun(r, stamp, word) {
  let t = axEsc(r.text);
  if (r.b) t = `<b>${t}</b>`;
  if (r.i) t = `<i>${t}</i>`;
  if (r.u) t = `<u>${t}</u>`;
  if (r.kind === 'n') return t;
  /* Word takes the reviewer's name off cite, which is why it is a
     mailto and why the spaces in it are encoded */
  const who = `mailto:${encodeURIComponent(r.author || 'Clavia')}`;
  if (!word) return `<${r.kind}>${t}</${r.kind}>`;
  return r.kind === 'ins'
    ? `<span class=msoIns><ins cite="${who}" datetime="${stamp}">${t}</ins></span>`
    : `<span class=msoDel><del cite="${who}" datetime="${stamp}">${t}</del></span>`;
}

function axBody(a, mode, word) {
  const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const blocks = axBlocks(a, mode);
  const notes = mode === 'clean' ? [] : axComments(a);
  /* heading → the numbers of the notes made under it */
  const marks = new Map();
  for (const note of notes) {
    const k = axWhereKey(note.where);
    if (k.length < 3) continue;
    if (!marks.has(k)) marks.set(k, []);
    marks.get(k).push(note.n);
  }
  let out = '';
  /* the document's own title, when the blocks do not already open with one */
  if (!blocks.some(b => b.t === 'h1')) out += `<h1>${axEsc(a.name || 'Document')}</h1>`;
  for (const b of blocks) {
    let inner = b.runs.map(r => axRun(r, stamp, word)).join('');
    if (b.t === 'h1' || b.t === 'h2') {
      const plain = axWhereKey(b.runs.map(r => r.text).join(''));
      for (const [k, ns] of marks) {
        if (plain.startsWith(k)) inner += ns.map(n => `<sup>[${n}]</sup>`).join('');
      }
    }
    const tag = AX_TAGS[b.t];
    out += `<${tag}${b.t === 'quote' ? ' class=axq' : ''}>${inner}</${tag}>`;
  }
  if (notes.length) {
    out += '<h2>Comments</h2>';
    for (const note of notes) {
      out += `<p class=axc><b>[${note.n}]</b>&nbsp;`
        + (note.where ? `<i>${axEsc(note.where)}</i> — ` : '')
        + `${axEsc(note.text)}<br><span class=axcby>${axEsc(note.by)}`
        + `${note.at ? ' · ' + axEsc(note.at) : ''}</span></p>`;
    }
  }
  return out;
}

/* the page itself, borrowed from mxTplToWord's legal layout so a
   redline out of a conversation sits on the same paper as a template
   export. Colours are written as plain hex here and not as var(): Word
   drops a declaration it cannot parse, fallback and all, and a redline
   that loses its colour is worse than one that ignores a token. */
const AX_PAGE = `@page{size:21cm 29.7cm;margin:2.54cm}`
  + `body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.5;text-align:justify}`
  + `h1{font-size:12pt;font-weight:bold;text-align:center;text-transform:uppercase;margin:0 0 22pt}`
  + `h2{font-size:11pt;font-weight:bold;margin:16pt 0 8pt;text-align:left}`
  + `p{margin:0 0 8pt}p.axq{margin:0 0 10pt 1cm;font-style:italic}`
  + `p.axc{text-align:left}span.axcby{font-size:9pt;color:#6B6762}`
  + `sup{font-size:8pt;font-weight:bold;color:#6B6762}`
  + `ins{color:#2E7D4F;text-decoration:underline}del{color:#B4483C;text-decoration:line-through}`
  + `span.msoIns{color:#2E7D4F;text-decoration:underline}`
  + `span.msoDel{color:#B4483C;text-decoration:line-through}`;

/* ── Word ─────────────────────────────────────────────────────
   <w:TrackRevisions/> in the head means the file opens with tracking
   already on, so the next edit anyone makes is tracked too — which is
   the point of sending a redline rather than a document. */
function axWordHtml(a, mode) {
  const title = a.name || 'Document';
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" `
    + `xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`
    + `<head><meta charset="utf-8"><meta name=ProgId content=Word.Document>`
    + `<title>${axEsc(title)}</title>`
    + `<!--[if gte mso 9]><xml><o:DocumentProperties><o:Author>${axEsc(axAuthor(a))}</o:Author>`
    + `</o:DocumentProperties></xml><![endif]-->`
    + `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom>`
    + (mode === 'clean' ? '' : '<w:TrackRevisions/>')
    + `<w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->`
    + `<style>${AX_PAGE}</style></head><body lang=EN-GB>${axBody(a, mode, true)}</body></html>`;
}

const axSafe = (s) => String(s || 'Document').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
const axExportName = (a, mode, ext) => axSafe(a.name)
  + (mode === 'tracked' && axHasChanges(a) ? ' - Clavia redline' : '')
  + (mode === 'clean' ? ' (clean)' : '') + '.' + ext;

const axWordBlob = (a, mode) =>
  new Blob(['﻿' + axWordHtml(a, mode)], { type: 'application/msword' });

function axWord(a, mode) {
  const file = axExportName(a, mode, 'doc');
  const link = h('a', { href: URL.createObjectURL(axWordBlob(a, mode)), download: file });
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  axSay(mode === 'clean'
    ? `“${file}” is downloading — a clean copy, no changes marked.`
    : `“${file}” is downloading. Open it in Word to accept or reject the changes.`);
}

/* ── PDF ──────────────────────────────────────────────────────
   Nothing in this app prints and no PDF library is bundled, and pulling
   one off a CDN to lay out text the browser can already lay out would be
   the wrong trade. The blocks go into a frame of their own with print
   CSS and that frame prints itself, so Save as PDF writes the file and
   the strike-through and underline survive because they are real CSS
   rather than something drawn. */
function axPdf(a, mode) {
  const name = axExportName(a, mode, '').replace(/\.$/, '');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${axEsc(name)}</title>`
    + `<style>${AX_PAGE}body{margin:0}@media print{body{margin:0}}</style></head>`
    + `<body>${axBody(a, mode, false)}</body></html>`;
  const frame = h('iframe', { class: 'ax-print', title: name, 'aria-hidden': 'true' });
  document.body.append(frame);
  const doc = frame.contentDocument;
  doc.open(); doc.write(html); doc.close();
  const gone = () => frame.remove();
  frame.contentWindow.addEventListener('afterprint', gone);
  /* the frame has to have laid out before it can paginate itself */
  setTimeout(() => {
    try { frame.contentWindow.focus(); frame.contentWindow.print(); }
    catch { gone(); axSay('This browser would not open the print dialog.'); }
  }, 80);
  setTimeout(gone, 60000);
  axSay('Choose “Save as PDF” in the print dialog — the file name is already set.');
}

/* ── tagging it to a request ──────────────────────────────────
   The bytes are kept in the same browser file store that an uploaded
   document uses, so the request's own Download and Open in Word serve
   exactly what was exported rather than re-deriving it; the blocks go
   with the version too, so the request's preview can read it without
   opening the file. */
async function axTag(a, r, mode) {
  const file = axExportName(a, mode, 'doc');
  const blob = axWordBlob(a, mode);
  const name = mode === 'clean' ? 'Clavia clean copy'
    : axHasChanges(a) ? 'Clavia redline' : 'From Clavia';
  const v = { name, by: USER.name, when: mxNow(), file,
    mime: 'application/msword', size: blob.size, blocks: axPlainBlocks(a, mode) };
  try { const fid = pbUid('file'); await mxBlobs.put(fid, blob); v.fid = fid; } catch { /* the preview still works without the bytes */ }
  const d = mxAddVersion(r, v);
  (r.activity ||= []).push({ who: USER.name, ev: 'version',
    what: `added ${file} from Clavia`, when: mxNow(),
    ref: { doc: d.id, v: d.versions.length } });
  save();
  pbToast(`Tagged to ${r.id} · v${d.versions.length} of ${d.title}`,
    { label: `Open ${r.id}`, run: () => {
      if (typeof closeArtifact === 'function') closeArtifact();
      mxOpen('intake', r.id);
    } });
}

/* what a request's own preview reads: the blocks as they are, except
   that a clean copy has already settled its changes */
function axPlainBlocks(a, mode) {
  const blocks = (typeof bodyOf === 'function' ? bodyOf(a, 'blocks') : a.blocks) || [];
  if (mode !== 'clean') return blocks.map(b => ({ ...b }));
  return blocks.map(b => {
    if (typeof b.v !== 'string') return { ...b };
    const host = document.createElement('div');
    host.innerHTML = b.v;
    host.querySelectorAll('del').forEach(el => el.remove());
    host.querySelectorAll('ins').forEach(el => el.replaceWith(document.createTextNode(el.textContent)));
    return { ...b, v: host.innerHTML };
  });
}

/* pbToast carries an action and the composer's toast does not, so the
   one that is there is the one used */
const axSay = (msg, act) => typeof pbToast === 'function' ? pbToast(msg, act)
  : typeof toast === 'function' ? toast(msg) : undefined;

/* ── which request this probably belongs to ───────────────────
   Read off the seeded requests rather than guessed at: a request whose
   counterparty is named in the artifact is the one being offered first.
   One word is enough — "Kestrel Freight" against "Kestrel Renewal". */
function axSuggested(a) {
  const hay = `${a.name || ''} ${a.sub || ''}`.toLowerCase();
  const out = new Set();
  for (const r of (typeof mxData === 'function' ? mxData().requests || [] : [])) {
    const word = String(r.counterparty || '').split(/\s+/)[0].toLowerCase();
    if (word.length > 2 && hay.includes(word)) out.add(r.id);
  }
  return out;
}

/* ── the dialog ───────────────────────────────────────────────
   Three things you can do with the document in front of you, what to
   include, and one button that says exactly what it will do. */
function axDialog(a, fmt0) {
  let fmt = fmt0 === 'pdf' ? 'pdf' : 'docx';
  let mode = 'tracked', reqId = null;
  const tracked = axHasChanges(a);
  const notes = axComments(a);
  const sug = axSuggested(a);
  const noun = (typeof NOUN !== 'undefined' && NOUN[a.kind]) || 'document';
  const says = (k) => (typeof DEST !== 'undefined' && DEST[k]?.does(noun)) || '';

  const rows = (q) => {
    q = String(q || '').trim().toLowerCase();
    return (typeof mxData === 'function' ? mxData().requests || [] : [])
      .filter(r => !q || `${r.id} ${r.title} ${r.counterparty || ''}`.toLowerCase().includes(q))
      .map(r => ({ r, suggested: sug.has(r.id) }))
      .sort((x, y) => (y.suggested ? 1 : 0) - (x.suggested ? 1 : 0));
  };
  reqId = rows('').find(x => x.suggested)?.r.id || null;

  const dim = h('div', { class: 'pb-dim mx-rqf-dim', onclick: (e) => { if (e.target === dim) close(); } });
  const back = document.activeElement;
  const close = () => {
    dim.classList.add('is-closing');
    setTimeout(() => dim.remove(), 150);
    removeEventListener('keydown', onKey, true);
    if (back?.isConnected) back.focus();
  };

  const opts = h('div', { class: 'ax-opts', role: 'radiogroup', 'aria-label': 'Export as' });
  const seg = h('div', { class: 'rqu-seg', role: 'radiogroup', 'aria-label': 'Include' });
  const note = h('p', { class: 'ax-note' });
  const cmtNote = h('p', { class: 'ax-note' });
  const fileWrap = h('div', { class: 'mx-rqf-f' },
    h('span', { class: 'mx-rqf-l' }, 'Include'), seg, note, cmtNote);
  const search = h('input', { class: 'mx-rqf-in', type: 'search', autocomplete: 'off',
    placeholder: 'Search requests', 'aria-label': 'Search requests', oninput: () => paintReqs() });
  const list = h('div', { class: 'ax-reqs', role: 'radiogroup', 'aria-label': 'Requests' });
  const tagWrap = h('div', { class: 'mx-rqf-f' },
    h('span', { class: 'mx-rqf-l' }, 'Which request'),
    h('div', { class: 'ax-search' }, h('span', { class: 'ax-search-ic', html: AX_SEARCH }), search),
    list,
    h('p', { class: 'ax-note' }, 'The file is added to the request as a new document, where Legal can download it or open it in Word.'));
  const go = h('button', { class: 'pb-btn pb-btn--primary', type: 'button', onclick: () => run() });

  const optRow = (key, mark, name, sub) => h('button', {
    class: 'ax-opt', type: 'button', role: 'radio', 'data-fmt': key,
    'aria-checked': String(fmt === key), onclick: () => { fmt = key; paint(); },
  }, mark,
    h('span', { class: 'ax-opt-t' },
      h('span', { class: 'ax-opt-n' }, name),
      h('span', { class: 'ax-opt-s' }, sub)),
    h('span', { class: 'ax-dot' }));

  const paintOpts = () => opts.replaceChildren(
    optRow('docx', mxTile('file', 'doc'), 'Word document', says('docx')),
    optRow('pdf', mxTile('file', 'pdf'), 'PDF', says('pdf')),
    optRow('tag', h('span', { class: 'mx-tile mx-tile--req', 'aria-hidden': 'true', html: AX_TAGMARK }),
      'Tag to a request', `Puts the ${noun} on an Intake request`));

  const paintSeg = () => seg.replaceChildren(...[['tracked', 'Tracked changes'], ['clean', 'Clean copy']]
    .map(([k, label]) => h('button', {
      class: 'rqu-seg-b' + (mode === k ? ' is-on' : ''), type: 'button', role: 'radio',
      'aria-checked': String(mode === k), onclick: () => { mode = k; paint(); },
    }, label)));

  const paintReqs = () => {
    const found = rows(search.value);
    /* searching past the request you had picked un-picks it, so the
       footer has to be repainted with the list and not only with the
       format — otherwise the button still offers to tag a request that
       is no longer on screen */
    if (reqId && !found.some(x => x.r.id === reqId)) reqId = null;
    if (!found.length) {
      list.replaceChildren(h('p', { class: 'ax-empty' }, 'No requests match.'));
      return paintGo();
    }
    list.replaceChildren(...found.map(({ r, suggested }) => h('button', {
      class: 'ax-req', type: 'button', role: 'radio', 'aria-checked': String(r.id === reqId),
      onclick: () => { reqId = r.id; paintReqs(); },
    },
      h('span', { class: 'ax-req-id' }, r.id),
      h('span', { class: 'ax-req-t' }, r.title),
      suggested ? h('span', { class: 'ax-req-sug' }, 'Suggested')
        : (typeof MX_ST !== 'undefined' && MX_ST.req[r.status] ? mxStatus('req', r.status) : null),
      h('span', { class: 'ax-dot' }))));
    paintGo();
  };

  const paintGo = () => {
    go.textContent = fmt === 'docx' ? 'Download .doc'
      : fmt === 'pdf' ? 'Download PDF'
      : reqId ? `Tag to ${reqId}` : 'Choose a request';
    go.disabled = fmt === 'tag' && !reqId;
  };

  const paint = () => {
    paintOpts(); paintSeg();
    fileWrap.hidden = fmt === 'tag';
    tagWrap.hidden = fmt !== 'tag';
    /* what Include actually means, said in the words of the format in
       front of you — and the limit said rather than left to be found */
    note.textContent = mode === 'clean'
      ? 'Open changes are applied as proposed; deleted text is left out.'
      : fmt === 'pdf'
      ? 'Deletions are struck through and insertions underlined, as on screen.'
      : tracked
      ? `Changes open in Word as tracked revisions by ${axAuthor(a)}, ready to accept or reject. Word for Mac too; Pages and Google Docs show them as coloured text instead.`
      : 'Nothing is marked up on this document yet, so it exports as it reads. The file opens with tracking on, so edits from here are tracked.';
    cmtNote.hidden = !(notes.length && mode !== 'clean');
    cmtNote.textContent = notes.length
      ? `${notes.length === 1 ? 'The comment travels' : `All ${notes.length} comments travel`} as a numbered Comments section at the end, keyed to the headings they were made on.`
      : '';
    if (fmt === 'tag') paintReqs();
    paintGo();
  };

  const run = async () => {
    if (fmt === 'tag') {
      const r = (typeof mxData === 'function' ? mxData().requests || [] : []).find(x => x.id === reqId);
      if (!r) return;
      close();
      await axTag(a, r, mode);
      return;
    }
    close();
    if (fmt === 'pdf') axPdf(a, mode); else axWord(a, mode);
  };

  const dlg = h('div', { class: 'pb-dlg mx-rqf ax-dlg', role: 'dialog', 'aria-modal': 'true',
    'aria-label': tracked ? 'Export redline' : 'Export document' },
    h('header', { class: 'mx-rqf-head' },
      h('h2', { class: 'pb-dlg-t' }, tracked ? 'Export redline' : 'Export document'),
      h('button', { class: 'pbv-icon mx-rqf-x', type: 'button', 'aria-label': 'Close',
        onclick: close, html: AX_X })),
    h('div', { class: 'mx-rqf-body' }, opts, fileWrap, tagWrap),
    h('footer', { class: 'mx-rqf-foot' },
      h('button', { class: 'pb-btn', type: 'button', onclick: close }, 'Cancel'), go));

  /* Escape closes, Tab stays inside, and the key is caught before
     anything behind the dialog also acts on it */
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); return close(); }
    if (e.key !== 'Tab') return;
    const f = [...dlg.querySelectorAll('button:not([disabled]), input')].filter(x => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };

  dim.append(dlg);
  paint();
  document.body.append(dim);
  addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => dlg.querySelector(`.ax-opt[data-fmt="${fmt}"]`)?.focus());
}

/* ── the one thing artifacts.js calls ─────────────────────────
   True means the click has been taken. Only a document's two Download
   rows are claimed — decks, spreadsheets, pages, mail and every Open in
   row fall straight through to the toast they have today, because
   nothing here can write them. */
function artExport(a, key, verb) {
  if (!a || a.kind !== 'doc' || verb !== 'download') return false;
  if (key !== 'docx' && key !== 'pdf') return false;
  if (typeof mxData !== 'function' || typeof mxTile !== 'function') return false;
  axDialog(a, key === 'pdf' ? 'pdf' : 'docx');
  return true;
}
