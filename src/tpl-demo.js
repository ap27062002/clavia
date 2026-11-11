/* ------------------------------------------------------------------
   A template made from a precedent, as a link — the whole thing, with
   nothing to answer.

   #templates/new/precedent — Create New Template with the ask written
   and the signed agreement handed over, then the conversion start to
   finish: it reads the document, says what it did, and opens the
   template beside its conversation. Nothing is asked along the way.
   Every kind of information becomes a placeholder, in square brackets.
   The conversation keeps one address, #chat/tpl-ses-tpl-niwas-nda, so a
   reload or a shared link lands back on it with the file on the first
   message.

   This is the flow to show. The conversation that asks which kinds of
   information to take out, and how to mark them, is what somebody gets
   when they hand a document over themselves; that is untouched.
------------------------------------------------------------------ */

const TPL_DEMO = {
  id: 'tpl-niwas-nda',
  file: 'Niwas_Mutual_NDA_executed.docx',
  text: 'Turn this into a template we can reuse.',
  /* what the questions would have been answered with: every kind of
     information, marked in square brackets */
  set: { kinds: null, blanks: 'square' },
};

/* the create page with the ask written and the file on it, which sends
   itself a moment later */
function tplDemoStart() {
  const d = mxData();
  const i = d.templates.findIndex(t => t.id === TPL_DEMO.id);
  if (i >= 0) { d.templates.splice(i, 1); save(); }
  MX.templates.open = 'new';
  MX.templates.demo = { text: TPL_DEMO.text, files: [TPL_DEMO.file], go: 1600 };
  if (state.view === 'templates') view.replaceChildren(templatesView());
  go('templates');
}

/* what the conversation says once it has read the document, in place of
   the two questions */
function tplDemoSaid(t) {
  const n = t.fields.length;
  return {
    role: 'bot', cites: null, artifact: mxTplArtId(t),
    answer: `Read ${TPL_DEMO.file} and made ${t.name} from it. Its sections are the document's `
      + `sections and the wording is untouched; ${mxPlural(n, 'term')} that belonged to that deal `
      + '— the parties, the dates, the amounts — are placeholders now, in square brackets.\n\n'
      + 'It is a draft: read it before you publish it. Tell me what to add, cut or word '
      + 'differently and I will change it as a new version.',
    steps: [
      { source: 'internal', query: `Read ${TPL_DEMO.file}`,
        rows: [{ title: TPL_DEMO.file, meta: 'precedent' }] },
      { source: 'template', query: `Drafted ${mxPlural(mxTplSecs(t), 'section')}`,
        count: mxPlural(n, 'blank') },
    ],
    suggest: mxTplSuggest(t),
  };
}

/* the template as the conversion leaves it, built again when the link to
   its conversation is opened somewhere it was never made */
function tplDemoMake() {
  const clean = TPL_DEMO.file.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ')
    .replace(/\s*\b(signed|executed)\b\s*$/i, '').trim();
  const t = newTemplate(templateFrom(TPL_DEMO.file, clean), false, false);
  t.id = TPL_DEMO.id;
  t.sourceFile = TPL_DEMO.file;
  mxTplConvert(t, TPL_DEMO.file, TPL_DEMO.set);
  return t;
}

function tplDemoSession() {
  const t = mxTemplate(TPL_DEMO.id) || tplDemoMake();
  if (thread?.id === 'tpl-ses-' + t.id) return true;
  mxTplEditInChat(t, [
    { role: 'user', text: TPL_DEMO.text, files: [{ name: TPL_DEMO.file }] },
    tplDemoSaid(t),
  ]);
  return true;
}

(() => {
  const prev = openByHash;
  openByHash = function (hash) {
    if (hash === 'templates/new/precedent') { tplDemoStart(); return true; }
    return prev(hash);
  };
  const prevSes = mxTplSessionRoute;
  mxTplSessionRoute = function (id) {
    if (id === 'tpl-ses-' + TPL_DEMO.id) return tplDemoSession();
    return prevSes(id);
  };
  /* On a demo run the conversion asks nothing: it takes every kind in
     square brackets, says what it did, and opens the template. Everywhere
     else the questions stand. */
  const prevAsk = mxTplAskBlanks;
  mxTplAskBlanks = function (t, name, text) {
    if (!MX.templates.demo) return prevAsk(t, name, text);
    MX.templates.demo = null;
    t.id = TPL_DEMO.id;
    mxTplConvert(t, name, TPL_DEMO.set);
    queueMicrotask(() => {
      const m = tplDemoSaid(t);
      say('bot', m.answer, { ...m, text: m.answer, thinking: false });
      paintThread();
      queueMicrotask(() => openArtifact(mxTplArtifact(t)));
    });
    return [{ role: 'user', text: text || TPL_DEMO.text, files: [{ name }] }];
  };
  /* boot may already have routed the address it was opened at */
  const first = (() => { try { return new URL(performance.getEntriesByType('navigation')[0]?.name || location.href).hash.slice(1); } catch { return ''; } })();
  if (first === 'templates/new/precedent' || first === 'chat/tpl-ses-' + TPL_DEMO.id) openByHash(first);
})();
