/* ── My actionables ───────────────────────────────────────────
   One list of where I am tagged and what has been asked of me. Clavia
   already has that list — it is the Do List (app.js), and it is further
   along than the brief: every row says why it is there, carries the rows
   it was built from, and ends in one action. Building a second list beside
   it would be building the same page twice and asking a GC to open both.

   What the Do List does not have is Clavia's own work on it. Its eleven
   seeded items are all outside systems — Gmail, Slack, Outlook, Drive,
   SharePoint, Salesforce — and none of them is read from the app the
   person is already standing in. So a comment in a contract that tags you
   by name, and a request that has your name in the attorney field, appear
   nowhere on the one list that claims to be everything on you.

   This file closes that. It reads the fixtures the rest of the app reads —
   MX_WCOMMENTS through mxWComments(), the intake list through mxIntake(),
   Horizon's updates through hzData() — and pushes what it finds into
   DO_ITEMS in the shape the Do List already renders. No new view, no new
   module, no new artifact kind, no CSS: every row it produces is an
   existing .do-row, and styles.css is untouched.

   It also gives the closing action somewhere to land. The Do List's CTA
   ticks the row off; for a comment-derived row that is not enough, because
   the thread it came from is still sitting unanswered in the Comments pane.
   Pressing Post reply here makes the same mutation the Comments pane makes
   (push onto the thread, status → replied) and offers it back.
------------------------------------------------------------------ */

/* Three sources, each switchable, because which of them belongs on a
   person's list is a product question and not a code one. */
const CV_FX = { comments: true, requests: true, horizon: true };

/* The Do List is session state, so deriving twice would double every row.
   This also makes the file safe to load twice. */
let CV_BUILT = false;

/* ── when things are ─────────────────────────────────────────── */

const cvDay0 = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const cvDaysTo = (iso) => Math.round((cvDay0(iso) - cvDay0(Date.now())) / 864e5);
const cvDaysAgo = (iso) => -cvDaysTo(iso);

/* A date said the way somebody would say it out loud, which is what the
   row has room for. Past a week it stops being a feeling and becomes a
   date, because "in nine days" is not something anyone plans against. */
const cvDate = (iso) => typeof pbWhen === 'function' ? pbWhen(iso)
  : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const cvDueSay = (iso) => {
  const n = cvDaysTo(iso);
  return n < -1 ? `${-n} days overdue`
    : n === -1 ? 'a day overdue'
    : n === 0 ? 'today'
    : n === 1 ? 'tomorrow'
    : n < 7 ? `in ${n} days`
    : cvDate(iso);
};

const cvAgoSay = (n) =>
  n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;

/* The two timing fields the Do List reads: due for the hot/warm cases it
   colours, age for everything else. doWhen() and doDue() do the rest. */
function cvTiming(iso) {
  const n = cvDaysTo(iso);
  if (n === 0) return { due: 'today', urgent: true };
  if (n === 1) return { due: 'tomorrow', urgent: true };
  if (n < 0) return { due: null, age: cvDueSay(iso), urgent: true };
  return { due: null, age: `due ${cvDueSay(iso)}` };
}

const cvFirst = (name) => String(name || '').split(/\s+/)[0];

/* ── where a comment sits ────────────────────────────────────── */

/* The same shorthand the request's own comments pane uses — "MSA 8 · v4" —
   rebuilt here because wcTag and wcWhere live inside the request view and
   are not reachable from outside it. Kept identical on purpose: a person
   who has seen one of these in the Comments pane should recognise it here
   rather than have to work it out again. */
function cvTag(doc) {
  const src = doc?.source || '';
  return /msa/.test(src) ? 'MSA'
    : src === 'dpa' ? 'DPA'
    : /nda/.test(src) ? 'NDA'
    : /order/.test(src) ? 'Order Form'
    : doc ? String(doc.title).replace(/^.*?—\s*/, '').replace(/\.\w+$/, '')
    : 'the document';
}
const cvClause = (c) => String(c.clause || '').replace(/^\d+\.\s*/, '');
const cvWhere = (c, doc) =>
  `${cvTag(doc)} ${(/^(\d+)\./.exec(c.clause) || [])[1] || cvClause(c)} · v${c.v}`;

/* ── the replies ─────────────────────────────────────────────────
   WRITTEN HERE, NOT SEEDED. Every comment in MX_WCOMMENTS that is open on
   Roger carries draft: null, so there is no drafted reply anywhere in the
   fixtures to post. These five are mine, keyed on the comment's own words
   so they survive the request ids being generated at runtime. They are
   written as a GC answers a counsel — a decision, and the one condition
   on it — and each one only says things the fixture itself establishes.
   A comment with no entry here still appears on the list; its action opens
   the thread instead of posting into it. */
const CV_REPLIES = {
  'Are you comfortable with a £3m aggregate cap for data breaches? Fiona will push for per claim.':
    'Yes to £3m, but in the aggregate only. Per claim is outside what we sign — if Fiona pushes for '
    + 'it, hold the aggregate and bring it back to me before anything moves.',

  'Brightwell may come back asking for Scots law. Can you own the answer on this one?':
    'I will. England and Wales stays in this draft. If they come back asking for Scots law the answer '
    + 'is yes — it is UK law, and we took it on Northwind — but put it to me first so the change is '
    + 'recorded on this thread rather than only in the document.',

  'Their 60-day subprocessor notice: we only add one or two a year. I think we can live with it.':
    'Agreed, take the 60 days. At one or two additions a year it costs us nothing. Keep the objection '
    + 'right exactly as drafted — that is the part I would not give away for a longer notice period.',

  'Layla wants DIFC law and the DIFC Courts. It is common law, in English, and a DIFC judgment is enforced onshore in Dubai far more easily than an English one. I would accept, but the playbook says UK law only, so it needs your sign-off.':
    'Signed off — take DIFC law and the DIFC Courts. Your reasoning is the right one: common law, in '
    + 'English, and enforceable onshore. Record it in the review as an exception on this NDA, not as a '
    + 'new playbook position, because the next one will be argued on its own facts.',

  'Priya moved the end date from 12 months to 31 December 2027 so it covers next year’s tender round. The Reseller Agreement runs 24 months, so this sits inside it, and it still ends early if that does. OK with you?':
    'Yes. 31 December 2027 is fine while it sits inside the Reseller Agreement and ends when that ends. '
    + 'Check paragraph 5 still says so after the date change — that tie is the only thing making this '
    + 'date safe.',
};

/* ── what the closing action does ─────────────────────────────────
   Keyed by the id of the artifact the row opens, because that is the only
   thing still on screen by the time the button is pressed. */
const CV_RUN = new Map();

/* Post the drafted reply onto the comment's own thread. This is the same
   mutation the Comments pane makes when you reply there — push, mark
   replied, log it on the request, offer it back — so the thread really has
   moved on, and opening the request afterwards shows it. */
function cvPostReply(r, c, text) {
  const was = JSON.stringify({ thread: c.thread, status: c.status });
  c.thread.push({ who: USER.name, text, when: mxNow() });
  c.status = 'replied';
  const where = cvWhere(c, mxDocuments(r).find(d => d.id === c.doc));
  (r.activity ||= []).push({ who: USER.name, kind: 'note',
    what: `On ${where}, to ${c.by}: ${text}`, when: mxNow() });
  r.updated = mxNow();
  save();
  pbToast(`Replied to ${cvFirst(c.by)}. It is with them now`, { label: 'Undo', run: () => {
    const prev = JSON.parse(was);
    c.thread = prev.thread; c.status = prev.status;
    (r.activity || []).pop();
    save();
    pbToast('Reply taken back');
  } });
}

/* A request has no thread to post into, so the honest action is the one
   the request's own page takes: say on the record what went out, and move
   the clock. Nothing is emailed; nothing in this build ever is. */
function cvLogOnRequest(r, what) {
  const when = mxNow();
  (r.activity ||= []).push({ who: USER.name, what, when });
  r.updated = when;
  save();
  pbToast(`Recorded on ${r.id}`, { label: 'Undo', run: () => {
    const i = (r.activity || []).findIndex(a => a.when === when && a.what === what);
    if (i > -1) r.activity.splice(i, 1);
    save();
    pbToast('Taken off the record');
  } });
}

/* ── comments that tag you ───────────────────────────────────────
   On you means: still open, addressed to you or handed to you, and not
   written by you. A comment you wrote that is waiting on somebody else is
   their task, not yours, and putting it here is how a list stops being
   trusted. */
const cvOnMe = (c) =>
  c.status === 'open'
  && c.by !== USER.name
  && (c.assignee ? c.assignee === USER.name : c.to === USER.name);

function cvCommentItem(r, c) {
  const doc = mxDocuments(r).find(d => d.id === c.doc);
  const docName = String(doc?.title || r.title).replace(/\.\w+$/, '');
  const where = cvWhere(c, doc);
  const first = cvFirst(c.by);
  const ago = cvAgoSay(cvDaysAgo(c.when));
  const draft = CV_REPLIES[c.text] || null;
  const said = (c.thread || []).filter(x => !x.sys);
  const handed = (c.thread || []).some(x => x.sys && /assigned this to/.test(x.text || ''));

  /* Two rows, so the sentence has somewhere to point: the clause the
     comment is pinned to, and the request it all belongs to. The first
     carries the author's name in its meta line, which is what makes the
     bold name in the sentence resolve to the thread rather than to the
     request. */
  const from = [
    { src: 'microsoft', t: `${docName} — ${cvClause(c)}`,
      m: `${c.by} · ${ago}` },
    { src: r.source || 'clavia', t: `${r.title} — ${r.id}`,
      m: `${r.submitter || 'Unassigned'} · ${r.where || r.team || 'Requests'}` },
  ];

  /* The hover card on an annotated name shows the thing itself. These two
     are the comment and the request in their own words — no excerpt is
     written for them, the fixture already holds the sentence. */
  DO_SNIP[from[0].t] = { who: `${c.by}, on ${where}`, when: ago, body: c.text };
  if (r.detail) DO_SNIP[from[1].t] = {
    who: `${r.submitter || 'Requests'} · ${r.team || ''}`.replace(/ · $/, ''),
    when: r.id, body: r.detail };

  const why = handed
    ? `${cvFirst((c.thread.find(x => x.sys) || {}).who || c.by)} handed the answer to you, so the `
      + 'thread stops here until you reply.'
    : `It is addressed to you and nobody else can answer it.`;
  const due = r.due ? cvDueSay(r.due) : null;
  const press = r.urgent
    ? ` ${r.counterparty || r.id} is marked urgent.`
    : due ? ` ${r.id} is due ${due}.` : '';

  const timing = r.due && cvDaysTo(r.due) <= 1
    ? cvTiming(r.due)
    : { due: null, age: `asked ${ago}`, urgent: !!r.urgent };

  const task = handed
    ? `Own the answer on ${cvClause(c)} in the ${cvTag(doc)}`
    : `Answer ${first} on ${cvClause(c)} in the ${cvTag(doc)}`;

  const it = {
    cv: 'comment',
    cat: r.deal || r.counterparty || r.title,
    src: ['microsoft'],
    kind: 'assigned',
    due: timing.due, age: timing.age, urgent: timing.urgent,
    task,
    desc: `**${c.by}** asked on ${where}: “${c.text}” ${why}${press}`,
    ref: `${where} · asked ${ago}`,
    ready: [
      `The words it is pinned to — “${c.quote}”`,
      said.length
        ? `${mxPlural(said.length, 'reply', 'replies')} on the thread already, the last from `
          + `${cvFirst(said[said.length - 1].who)}`
        : 'Nothing said on the thread yet — your answer is the first one',
      draft ? 'A reply written and ready to post, in your words rather than a summary'
        : 'No reply drafted for this one — it needs your words, not a suggestion',
    ],
    from,
    act: draft ? 'Review reply' : 'Open the thread',
    cta: draft ? 'Post reply' : 'Mark as read',
  };

  /* The document this row opens: the clause, what was asked, the thread so
     far, and the reply underneath it. All of it is the fixture's own text. */
  DO_DOCS[task] = {
    kind: 'doc', name: task, ext: 'docx', sub: `${where} · ${first} · ${ago}`,
    blocks: [
      { t: 'h1', v: task },
      { t: 'meta', v: `${r.id} · ${docName} · ${where}` },
      { t: 'h2', v: 'The words it is pinned to' },
      { t: 'p', v: `“…${c.quote}…”` },
      { t: 'h2', v: `What ${first} asked` },
      { t: 'p', v: c.text },
      ...(said.length ? [
        { t: 'h2', v: 'The thread so far' },
        { t: 'ul', v: said.map(x => `<b>${x.who}</b> — ${x.text}`) },
      ] : []),
      ...(draft ? [
        { t: 'h2', v: 'The reply, ready to post' },
        { t: 'p', v: draft },
      ] : []),
      { t: 'h2', v: 'What needs you' },
      { t: 'p', v: draft
        ? 'Read it and post it, or write your own instead. Posting puts it on the thread in the '
          + 'Comments pane and hands the clause back to ' + first + '; nothing is emailed.'
        : 'This one has no draft. The clause, the question and the thread are all here, so the '
          + 'only thing missing is your answer.' },
    ],
  };

  if (draft) CV_RUN.set(doDoc(it).id, () => cvPostReply(r, c, draft));
  return it;
}

/* ── requests with your name in the attorney field ───────────────
   The Requests module already knows these are yours. The Do List did not,
   which is the gap: the one list of what is on you was missing the work
   the business has formally handed you. */

/* The closing action, said in the terms of the kind of work it is. The
   pipeline already decides what a request is for; this only names the end
   of it. */
const CV_CTA = {
  review: ['Review their paper', 'Send our mark-up'],
  draft:  ['Review the draft', 'Send the draft'],
  advice: ['Review the answer', 'Send the answer'],
  notice: ['Review the notice', 'Send the notice'],
  sign:   ['Check it over', 'Send for signature'],
};

function cvRequestItem(r) {
  const pipe = mxPipe(r);
  const [act, cta] = CV_CTA[pipe] || CV_CTA.draft;
  const stages = mxStages(r);
  const stage = stages[mxStage(r)];
  const docs = mxDocuments(r);
  const open = mxWComments(r).filter(c => c.status !== 'closed');
  const onMe = open.filter(cvOnMe).length;
  const t = r.due ? cvTiming(r.due) : { due: null, age: 'no date set' };
  const due = r.due ? cvDueSay(r.due) : null;

  const from = [
    { src: r.source || 'clavia', t: `${r.title} — ${r.id}`,
      m: `${r.submitter || 'Requests'} · ${r.where || r.team || 'Requests'}` },
    ...(docs.length ? [{ src: 'microsoft',
      t: `${String(docs[0].title).replace(/\.\w+$/, '')} — v${docs[0].versions.length}`,
      m: `${r.counterparty || r.team} · ${mxPlural(docs.length, 'document')}` }] : []),
  ];
  DO_SNIP[from[0].t] = {
    who: `${r.submitter || 'Requests'}, ${r.team || 'the business'}`,
    when: due ? `due ${due}` : r.id,
    body: r.detail || r.title };
  if (from[1]) DO_SNIP[from[1].t] = {
    who: `${r.counterparty || r.team} · ${docs[0].versions.length} versions`,
    when: stage,
    body: `The document on ${r.id}. ${open.length
      ? `${mxPlural(open.length, 'comment')} still open on it.`
      : 'No comments open on it.'}` };

  const it = {
    cv: 'request',
    cat: r.deal || r.counterparty || r.team,
    src: [r.source].filter(Boolean),
    kind: 'assigned',
    due: t.due, age: t.age, urgent: t.urgent || !!r.urgent,
    /* The request's own title, unchanged. It is already the thing that has
       to be done, and rewriting it would mean the row and the request it
       points at no longer read as the same piece of work. */
    task: r.title,
    desc: `**${r.submitter || 'The business'}** asked ${r.team ? 'from ' + r.team : ''}: `
        + `“${r.detail || r.title}” It is yours, at ${stage}`
        + (due ? `, and due ${due}.` : '.'),
    ref: `${r.id} · ${r.team || 'Requests'}${due ? ' · due ' + due : ''}`,
    ready: [
      `Where it is now — ${stage}, ${mxPlural(mxStage(r) + 1, 'stage')} of ${stages.length}`,
      docs.length
        ? `${mxPlural(docs.length, 'document')} on it, latest ${String(docs[0].title)
            .replace(/\.\w+$/, '')} v${docs[0].versions.length}`
        : 'No document on it yet — this one starts with the drafting',
      open.length
        ? `${mxPlural(open.length, 'comment')} still open${onMe ? `, ${onMe} on you` : ''}`
        : 'No comments open on it',
    ],
    from,
    act, cta,
  };

  DO_DOCS[r.title] = {
    kind: 'doc', name: r.title, ext: 'docx',
    sub: `${r.id} · ${r.team || 'Requests'}${due ? ' · due ' + due : ''}`,
    blocks: [
      { t: 'h1', v: r.title },
      { t: 'meta', v: `${r.id} · ${r.counterparty || r.team || 'Lumen'} · ${stage}` },
      { t: 'h2', v: `What ${cvFirst(r.submitter) || 'the business'} asked` },
      { t: 'p', v: r.detail || r.title },
      { t: 'h2', v: 'Where it stands' },
      { t: 'ul', v: [
        `<b>Stage</b> — ${stage}, ${mxPlural(mxStage(r) + 1, 'stage')} of ${stages.length}`,
        `<b>Due</b> — ${due || 'no date'}`,
        `<b>Documents</b> — ${docs.length
          ? docs.map(d => String(d.title).replace(/\.\w+$/, '') + ` v${d.versions.length}`).join(', ')
          : 'none yet'}`,
        `<b>Comments</b> — ${open.length
          ? mxPlural(open.length, 'comment') + ' open' + (onMe ? `, ${onMe} on you` : '')
          : 'none open'}`,
      ] },
      { t: 'h2', v: 'What needs you' },
      { t: 'p', v: `${cta} is the end of this one. Pressing it records on ${r.id} that it went out `
        + 'and moves the clock; the request page is where the document and the thread live.' },
    ],
  };

  CV_RUN.set(doDoc(it).id, () => cvLogOnRequest(r, `${cta.toLowerCase()} on ${r.id}`));
  return it;
}

/* ── legal-change steps you own ──────────────────────────────────
   Horizon is out of the rail at the moment, which is exactly why its steps
   belong here: a step with your name on it is on you whether or not the
   page it lives on is reachable from the nav. */
function cvHorizonItem(u, s) {
  const next = typeof hzNext === 'function' ? hzNext(u) : null;
  const drafted = s.status === 'review';
  /* The step's own brand, where there is one: a note step is an email out
     of the company mailbox, and a request step points at the request, which
     knows the system it arrived through. */
  const ref = s.ref && typeof mxIntake === 'function'
    ? mxIntake().find(x => x.id === s.ref) : null;
  const from = [
    { src: s.kind === 'note' ? 'outlook' : (ref && ref.source) || 'clavia',
      t: `${u.title} — ${u.id}`,
      m: `${u.source ? u.source[0] : 'Horizon'} · ${u.juris || ''}`.replace(/ · $/, '') },
    ...(ref ? [{ src: ref.source || 'clavia', t: `${ref.title} — ${ref.id}`,
      m: `${ref.submitter || 'Requests'} · ${ref.team || ''}`.replace(/ · $/, '') }] : []),
  ];
  DO_SNIP[from[0].t] = {
    who: `Horizon · ${u.watch}`, when: typeof hzDay === 'function' ? hzDay(u.found, false) : '',
    body: u.lede + ' ' + (u.why || '') };
  if (ref) DO_SNIP[from[1].t] = {
    who: `${ref.submitter || 'Requests'}, ${ref.team || 'the business'}`, when: ref.id,
    body: ref.detail || ref.title };

  const it = {
    cv: 'horizon',
    cat: `${u.id} — ${u.title.split(/:\s/)[0]}`,
    src: [],
    kind: 'assigned',
    due: null,
    age: next ? `by ${hzDay(next[0], false)}` : 'no date set',
    urgent: false,
    task: s.what,
    desc: `Horizon found this in **${u.id}** and the step is yours: ${u.lede} ${u.why || ''}`,
    ref: `${u.id} · ${s.note || s.status}`,
    ready: [
      `Why it applies to us — ${u.why || 'read against the company profile'}`,
      drafted ? `Already drafted: ${s.note}` : `Not started: ${s.note || 'nothing drafted yet'}`,
      ref ? `It lands on ${ref.id} — ${ref.title}` : `Nothing else is waiting on this step`,
    ],
    from,
    act: drafted ? 'Review the draft' : 'Open the step',
    cta: drafted ? 'Approve and send' : 'Mark done',
  };

  DO_DOCS[s.what] = {
    kind: 'doc', name: s.what, ext: 'docx', sub: `${u.id} · ${u.type} · ${u.stage}`,
    blocks: [
      { t: 'h1', v: s.what },
      { t: 'meta', v: `${u.id} · ${u.juris || ''} · ${u.type}` },
      { t: 'h2', v: 'What changed' },
      { t: 'p', v: u.lede },
      ...(u.summary ? [{ t: 'ul', v: u.summary.map(([line]) => line) }] : []),
      { t: 'h2', v: 'Why it applies to us' },
      { t: 'p', v: u.why || 'Read against the company profile in Horizon.' },
      { t: 'h2', v: 'This step' },
      { t: 'p', v: `${s.what} — ${s.note || s.status}.` },
      { t: 'h2', v: 'What needs you' },
      { t: 'p', v: `${it.cta} closes the step on ${u.id}. The rest of the update, the contracts it `
        + 'touches and the other steps are on the Horizon page.' },
    ],
  };

  CV_RUN.set(doDoc(it).id, () => {
    const was = [s.status, s.note];
    s.status = 'done';
    s.note = `Done · ${typeof hzDay === 'function' ? hzDay(mxNow(), false) : 'today'}`;
    hzLog(u, `marked done: ${s.what.toLowerCase()}`);
    pbToast(`Closed on ${u.id}`, { label: 'Undo', run: () => {
      [s.status, s.note] = was;
      (u.log || []).pop();
      save();
      pbToast('Step reopened');
    } });
  });
  return it;
}

/* ── the gather ──────────────────────────────────────────────── */

function cvBuild() {
  if (CV_BUILT) return 0;
  CV_BUILT = true;
  const made = [];
  const taken = new Set(DO_ITEMS.map(x => x.task));
  const add = (it) => {
    if (!it || taken.has(it.task)) return;
    taken.add(it.task);
    DO_ITEMS.push(it);
    made.push(it);
  };

  /* mxIntake() is the thing that seeds the requests, their documents and
     their comment threads, so it has to run before any of them can be
     read. Everything below is wrapped because a list that throws takes the
     whole page with it, and a missing row is a smaller failure than that. */
  let rqs = [];
  try { rqs = mxIntake().filter(r => !mxClosed(r)); } catch (_) { rqs = []; }

  if (CV_FX.comments) {
    for (const r of rqs) {
      let cs = [];
      try { cs = mxWComments(r).filter(cvOnMe); } catch (_) { continue; }
      for (const c of cs) { try { add(cvCommentItem(r, c)); } catch (_) { /* skip that one */ } }
    }
  }

  if (CV_FX.requests) {
    for (const r of rqs) {
      if (r.attorney !== USER.name) continue;
      try { add(cvRequestItem(r)); } catch (_) { /* skip that one */ }
    }
  }

  if (CV_FX.horizon && typeof hzData === 'function') {
    try {
      for (const u of hzData().updates) {
        if (u.state === 'done' || u.state === 'archived') continue;
        for (const s of u.steps || []) {
          if (s.owner !== USER.name || s.status === 'done') continue;
          try { add(cvHorizonItem(u, s)); } catch (_) { /* skip that one */ }
        }
      }
    } catch (_) { /* Horizon has not been seeded; nothing to add */ }
  }

  return made.length;
}

/* ── the cut ─────────────────────────────────────────────────────
   One more filter on the bar the Do List already has, rather than a
   second row of tabs. It reads a field only these rows carry, so the
   eleven seeded items are unaffected.

   One and not two: the bar is a fixed strip and six tabs already fill
   it. A seventh fits; an eighth overflows the strip and clips its own
   label, and widening the strip would mean editing styles.css, which
   is not this file's to edit. "Tagged in a comment" was the one
   dropped — it is a subset of this cut, and a comment that names you
   is already the loudest row on the list. */
if (typeof DO_FILTERS !== 'undefined') DO_FILTERS.push(
  { id: 'cv', label: 'In Clavia', fn: (x) => !!x.cv },
);

/* The step that does the gathering, so a trace can say it in the same
   voice as the rest. Guarded the way agents-route.js guards its own. */
if (typeof SOURCES !== 'undefined') {
  SOURCES.actionables = { label: 'what is on you', verb: 'Gathered',
    icon: '<path d="M9 4.5h6a1.5 1.5 0 0 1 1.5 1.5v1.5h-9V6A1.5 1.5 0 0 1 9 4.5z"/>'
        + '<path d="M16.5 7.5h1.9a1.6 1.6 0 0 1 1.6 1.6v9.3a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.4'
        + 'V9.1a1.6 1.6 0 0 1 1.6-1.6h1.9"/><path d="M9 13.2l2 2 4-4"/>' };
  /* Comments are made in Word, so a comment row carries the Word mark
     rather than the generic globe the unknown-source fallback gives it. */
  if (!SOURCES.microsoft) SOURCES.microsoft = { brand: 'microsoft', label: 'Word', verb: 'Read',
    icon: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M7.5 9l2 6 2.5-6 2.5 6 2-6"/>' };
}

/* ── the closing action ──────────────────────────────────────────
   The Do List's footer CTA is built in app.js and ends in drop(), which
   ticks the row off and says so. For these rows that is half the job: the
   comment thread, the request record or the Horizon step has to move as
   well, or the list is telling you something was done that was not.

   Listening on the document rather than reaching into the footer, in the
   bubble phase so app.js's own handler runs first — it closes the canvas
   and drops the row, and this then says what actually happened to the
   thing underneath. If the hook named in the report is added to app.js's
   footer instead, delete this listener: it is the workaround, not the
   design. */
document.addEventListener('click', (e) => {
  if (!e.target.closest) return;
  if (!e.target.closest('.dof-cta')) return;
  const id = typeof openArtifactNow !== 'undefined' && openArtifactNow?.id;
  const run = id && CV_RUN.get(id);
  /* app.js has already closed the artifact by now, so the id is read off
     the node that was open when the press started */
  if (run) run();
});

/* Clavia's artifact ids survive the row, so a row pressed from the canvas
   after a reload still resolves. Deriving at load is what makes that true:
   these items exist before anybody opens the list, the same way the Do
   List's own prepared documents do. */
try {
  cvBuild();
  /* app.js calls boot() at the end of its own file, so a reload straight
     onto #dolist has already painted the list by the time this runs. One
     more route, only in that case, and only if there is something new. */
  if (location.hash.slice(1) === 'dolist' && typeof go === 'function') go('dolist');
} catch (_) {
  /* nothing added; the Do List's own eleven items are untouched */
}
