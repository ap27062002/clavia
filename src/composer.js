/* ------------------------------------------------------------------
   Composer — ported from ashford/app.html.

   Two kinds of row in the + menu: sources the assistant may draw on
   (which stay ticked), and things it can make (one step in, under
   Create). Skills, Agents and Projects cascade into their own panel
   with a search, rather than spilling into the root list.

   initComposer(root, opts) wires an .ask element that already holds a
   textarea and an .askbar.
------------------------------------------------------------------ */

function initComposer(askEl, opts = {}) {
  const $  = (s, r = askEl) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const box  = $('textarea');
  const bar  = $('.askbar');
  const send = $('.send');

  const AGENTS   = opts.agents   || [];
  /* The humans in this conversation. Read at open time, not at init: people
     arrive after the composer is built, and a list captured once is a list
     that is wrong the moment somebody joins. */
  const PEOPLE = () => (typeof opts.people === 'function' ? opts.people() : (opts.people || []));
  const IN_THREAD = !!opts.inThread;
  const SKILLS   = opts.skills   || [];
  const PROJECTS = opts.projects || [];
  const onSend   = opts.onSend   || (() => {});
  /* A box that only takes files swaps the whole + menu for its own rows —
     [{ label, mark, run }] — and leaves the rest of the composer as it is.
     { sep: true } draws a hairline; { src: 'web' | 'deep' } is the same
     source toggle New Chat has, chip and all. */
  const ATTACH   = opts.attach   || null;

  /* ── icons in the house style — 24 grid, 1.7 stroke, round caps ── */
  const I = (d) => `<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const PI = {
    upload:  '<path d="M12 15.5V3.5M8 7.5l4-4 4 4"/><path d="M4 14v5a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-5"/>',
    skills:  '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9.5h8M8 13.5h5"/>',
    web:     '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.7 2.4 14.3 0 17M12 3.5c-2.4 2.7-2.4 14.3 0 17"/>',
    deep:    '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/><path d="M8.5 11.5l1.8 1.8 3.2-3.6"/>',
    doc:     '<path d="M6 3.5h8l4.5 4.5v12a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 6 3.5z"/><path d="M13.5 3.5V9h5"/>',
    deck:    '<rect x="3" y="4.5" width="18" height="13" rx="2"/><path d="M12 17.5V21M8 21h8"/>',
    sheet:   '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M9 9.5v10M15 9.5v10"/>',
    artifact:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    agents:  '<path d="M12 4.5c.57 4.2 3.28 6.93 7.5 7.5-4.22.57-6.93 3.28-7.5 7.5-.57-4.2-3.28-6.93-7.5-7.5 4.22-.57 6.93-3.28 7.5-7.5z"/>',
    project: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.4a2 2 0 0 1 1.6.8l1 1.35a2 2 0 0 0 1.6.8H18a2.5 2.5 0 0 1 2.5 2.5V18a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18z"/>',
    routine: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.1V12l3.3 2"/>',
    apps:    '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2"/>'
           + '<rect x="3.5" y="13" width="7.5" height="7.5" rx="2"/><path d="M16.75 13.75v6M13.75 16.75h6"/>',
  };
  const ARW2 = '<svg class="arw" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  const TICK = '<svg class="tick" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  const FIND = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
  const XSVG = '<svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';

  /* ── the bar's own controls ── */
  const modeBar = document.createElement('div');
  modeBar.className = 'modebar'; modeBar.hidden = true;
  askEl.insertBefore(modeBar, askEl.firstElementChild);

  const plusWrap = document.createElement('span'); plusWrap.className = 'plus';
  const plus = document.createElement('button');
  plus.className = 'iconbtn'; plus.type = 'button'; plus.setAttribute('aria-label', 'Add');
  plus.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  const menu = document.createElement('div'); menu.className = 'plusmenu'; menu.hidden = true;
  plusWrap.append(plus, menu);
  bar.insertBefore(plusWrap, bar.firstElementChild);

  const chips = document.createElement('span'); chips.className = 'srcchips';
  plusWrap.after(chips);

  /* ── what sits in the box: pills ── */
  let PILLS = [];
  const PLACEHOLDER = box.placeholder;
  const SRC_LABEL = { web: 'Web search', deep: 'Deep research' };
  /* company knowledge is a given — it never appears as a choice */
  const SRCS = { web: false, deep: false };

  const pillMark = (p) => {
    const m = (p.mark || I(PI[p.icon] || PI.skills))
      .replace('class="ic"', 'class="ic on"').replace('class="av2"', 'class="av2 on"');
    return `<span class="sw">${m}${XSVG}</span>`;
  };
  /* a fixed reading order, so the row does not reshuffle as you pick things */
  const ORDER = { what: 0, who: 1, skill: 2, where: 3, src: 4, file: 5 };

  const sync = () => { if (send) send.disabled = !box.value.trim() && !PILLS.length; };

  function paintMode() {
    PILLS.sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9));
    const on = PILLS.length > 0;
    modeBar.hidden = !on;
    askEl.classList.toggle('hasmode', on);
    const hinted = [...PILLS].reverse().find(x => x.hint);
    box.placeholder = hinted ? hinted.hint : PLACEHOLDER;
    modeBar.innerHTML = PILLS.map((p, i) =>
      `<span class="modechip" data-pill="${i}" title="Remove ${p.label}">${pillMark(p)}${p.label}</span>`).join('');
    modeBar.querySelectorAll('[data-pill]').forEach(c => c.addEventListener('click', () => {
      const p = PILLS[+c.dataset.pill];
      if (p.kind === 'src') {                 // a source is a toggle, so untick it too
        SRCS[p.key] = false;
        menu.querySelector(`button[data-t="${p.key}"]`)?.classList.remove('on');
      }
      PILLS.splice(+c.dataset.pill, 1); paintMode(); box.focus();
    }));
    sync();
  }

  /* what is switched on rides in the box with everything else — a source and a
     skill are both context for the same message, so they look the same */
  function paintChips() {
    PILLS = PILLS.filter(p => p.kind !== 'src').concat(
      Object.keys(SRCS).filter(k => SRCS[k]).map(k => ({ kind: 'src', key: k, icon: k, label: SRC_LABEL[k] })));
    paintMode();
  }

  /* you can brief several colleagues, or stack several skills, in one go —
     but only one thing can be under construction, so 'what' still replaces */
  function addPill(p) {
    PILLS = PILLS.filter(x => !(x.kind === p.kind && (p.kind === 'what' || x.label === p.label))).concat(p);
    paintMode(); box.focus(); box.setSelectionRange(box.value.length, box.value.length);
  }
  const setMode = (icon, label, hint) => addPill({ kind: 'what', icon, label, hint });

  /* backspace at the very start eats the last pill — no close button needed */
  box.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && PILLS.length && box.selectionStart === 0 && box.selectionEnd === 0) {
      e.preventDefault(); PILLS.pop(); paintMode();
    }
  });
  box.addEventListener('input', sync);

  /* the field is one line until it is not — grow it to fit, up to the cap
     the stylesheet sets, then let it scroll */
  const grow = () => {
    box.style.height = 'auto';
    box.style.height = box.scrollHeight + 'px';
  };
  if (askEl.classList.contains('ask-mini')) {
    box.addEventListener('input', grow);
    requestAnimationFrame(grow);
  }

  /* ── the root menu ── */
  const row = (icon, label, right, attrs = '') =>
    `<button type="button" ${attrs}>${I(PI[icon])}<span class="lbl"><span class="nmm">${label}</span></span>${right}</button>`;
  const sec = (t) => `<div class="sec">${t}</div>`;

  function plusRoot() {
    if (ATTACH) {
      menu.innerHTML = ATTACH.map((a, i) => a.sec ? sec(a.sec)
        : a.sep ? '<div class="sep" role="separator"></div>'
        : a.src ? row(a.src, SRC_LABEL[a.src], TICK, `data-t="${a.src}" class="${SRCS[a.src] ? 'on' : ''}"`)
        : `<button type="button" data-x="${i}">${a.mark}`
          + `<span class="lbl"><span class="nmm">${a.label}</span></span></button>`).join('');
      $$('button[data-x]', menu).forEach(b => b.addEventListener('click', e => {
        e.stopPropagation(); openPlus(false); ATTACH[+b.dataset.x].run();
      }));
      wire();
      return;
    }
    menu.innerHTML =
      row('upload', 'Upload file', '', 'data-a="upload"') +
      row('web', 'Web search', TICK, `data-t="web" class="${SRCS.web ? 'on' : ''}"`) +
      row('deep', 'Deep research', TICK, `data-t="deep" class="${SRCS.deep ? 'on' : ''}"`) +
      `<span class="cascwrap">${row('apps', 'Apps', `<span class="cnt">${appCount()}</span>${ARW2}`, 'data-casc="apps"')}${appCascade()}</span>` +
      sec('Use') +
      `<span class="cascwrap">${row('skills', 'Skills', ARW2, 'data-casc="skills"')}${cascade('skills')}</span>` +
      `<span class="cascwrap">${row('agents', 'Agents', ARW2, 'data-casc="agents"')}${cascade('agents')}</span>` +
      `<span class="cascwrap">${row('project', 'Projects', ARW2, 'data-casc="projects"')}${cascade('projects')}</span>` +
      /* Some boxes are asking about something that already exists — a
         meeting, a day — and a routine or a presentation is not an
         answer to that. `noCreate` leaves the section out. */
      (opts.noCreate ? '' :
        sec('Create') +
        row('doc', 'Document', '', 'data-c="Document" data-i="doc"') +
        row('deck', 'Presentation', '', 'data-c="Presentation" data-i="deck"') +
        row('sheet', 'Sheet', '', 'data-c="Sheet" data-i="sheet"') +
        row('artifact', 'App', '', 'data-c="App" data-i="artifact"') +
        row('routine', 'Routine', '', 'data-c="Routine" data-i="routine"'));
    wire(); wireCascades();
  }

  /* ── the connected apps, and the ones you have not connected yet ──
     The first-run card is the place you meet these, and it can be
     dismissed. This is where they live afterwards, so nothing is lost by
     putting that card down — the state is shared, and either surface can
     change it. */
  const APPS = () => (typeof CONNECTORS !== 'undefined' ? CONNECTORS : []);
  const isOn = (id) => typeof CONNECTED !== 'undefined' && CONNECTED.has(id);
  const appCount = () => {
    const n = APPS().filter(a => isOn(a.id)).length;
    return n ? `${n} connected` : '';
  };
  const appRows = () => APPS().map(a => {
    const on = isOn(a.id);
    return `<button type="button" data-app="${a.id}" class="approw${on ? ' on' : ''}" `
      + `title="${on ? 'Disconnect' : 'Connect'} ${a.name}">`
      + `<svg class="ic ic-brand" width="18" height="18" viewBox="0 0 24 24"><use href="#b-${a.id}"></use></svg>`
      + `<span class="lbl"><span class="nmm">${a.name}</span></span>`
      /* Connected is a tick, the same tick Web search and Deep research
         use two rows up — a thing that is on, and can be turned off.
         Spelling out "Connected" said the same thing in more words and
         made the state look like it could not be changed. */
      + (on ? TICK : `<span class="appstate">Connect</span>`) + `</button>`;
  }).join('');
  const appCascade = () =>
    `<div class="pmc pmc-apps" data-appmenu hidden><div class="pmc-list">${appRows()}</div></div>`;

  /* ── Skills, Agents and Projects cascade, with a search at the top ── */
  function cascade(kind) {
    /* skills carry no mark — one repeated glyph down a list of verbs says nothing */
    const items = kind === 'skills'
      ? SKILLS.map(n => ({ n, icon: '' }))
      : kind === 'projects'
      ? PROJECTS.map(n => ({ n, icon: I(PI.project) }))
      : AGENTS.map(a => ({ n: a.label, icon: a.mark || I(PI.agents) }));
    const rows = items.map(it =>
      `<button type="button" data-pick="${it.n}" data-kind="${kind}">${it.icon}<span class="lbl"><span class="nmm">${it.n}</span></span></button>`).join('');
    return `<div class="pmc" hidden>
      <div class="pmc-find">${FIND}<input type="text" placeholder="Search ${kind}…" spellcheck="false"></div>
      <div class="pmc-list">${rows}</div>
    </div>`;
  }

  const HINTS = {
    skill: 'On what? Attach the document, or describe it.',
    where: 'What about it?',
    who:   'What do you need from them?',
  };
  function pick(kind, name) {
    if (kind === 'skills')        addPill({ kind: 'skill', icon: 'skills',  label: name, hint: HINTS.skill });
    else if (kind === 'projects') addPill({ kind: 'where', icon: 'project', label: name, hint: HINTS.where });
    else {
      const p = PEOPLE().find(x => x.label === name);
      const a = AGENTS.find(x => x.label === name);
      addPill({ kind: 'who', label: name, hint: HINTS.who,
                mark: p?.mark || a?.mark || I(PI.agents) });
    }
  }

  function wireCascades() {
    $$('.cascwrap', menu).forEach(wrap => {
      const btn = wrap.querySelector('button[data-casc]'), pan = wrap.querySelector('.pmc');
      let t;
      const open = (on) => {
        if (on && !pan.hidden) return;         // already up — don't replay the entrance
        /* only an OPENING panel clears the others. Closing used to clear them too,
           so moving Skills → Agents let the Skills close timer, firing 260ms later,
           take the Agents panel down with it. */
        if (on) $$('.pmc', menu).forEach(p => { if (p !== pan) p.hidden = true; });
        pan.hidden = !on;
        if (on) {
          pan.classList.remove('opening', 'left'); pan.style.top = ''; void pan.offsetWidth;
          // no room to the right? hang it on the other side
          if (pan.getBoundingClientRect().right > innerWidth - 12) pan.classList.add('left');
          /* and slide it up off the bottom edge rather than let it clip */
          const r = pan.getBoundingClientRect();
          let d = 0;
          if (r.bottom > innerHeight - 12) d = innerHeight - 12 - r.bottom;
          if (r.top + d < 12) d = 12 - r.top;
          if (d) pan.style.top = (-5 + d) + 'px';
          pan.classList.add('opening');
        }
      };
      wrap.addEventListener('mouseenter', () => { clearTimeout(t); open(true); });
      wrap.addEventListener('mouseleave', () => { t = setTimeout(() => open(false), 260); });
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = !pan.hidden; open(!wasOpen);
        if (!wasOpen) pan.querySelector('input')?.focus();
      });
      pan.addEventListener('click', e => e.stopPropagation());

      const input = pan.querySelector('input'), list = pan.querySelector('.pmc-list');
      /* Four apps do not need a search field, so the apps panel has none —
         and everything below here assumes one. */
      if (!input) { wireApps(pan); return; }
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        let shown = 0;
        $$('button[data-pick]', list).forEach(b => {
          const hit = b.textContent.toLowerCase().includes(q);
          b.style.display = hit ? '' : 'none'; if (hit) shown++;
        });
        const none = list.querySelector('.none');
        if (!shown && !none) list.insertAdjacentHTML('beforeend', '<div class="none">Nothing matches.</div>');
        if (shown && none) none.remove();
      });
      input.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); open(false); } });

      $$('button[data-pick]', pan).forEach(b => b.addEventListener('click', () => {
        openPlus(false); pick(b.dataset.kind, b.dataset.pick);
      }));
    });
  }

  /* Connecting from here has to land on the first-run card too, and the
     other way round — one set, repainted on both. */
  function wireApps(pan) {
    const paint = () => {
      pan.querySelector('.pmc-list').innerHTML = appRows();
      bind();
      const cnt = menu.querySelector('button[data-casc="apps"] .cnt');
      if (cnt) cnt.textContent = appCount();
    };
    const bind = () => $$('button[data-app]', pan).forEach(b =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.app;
        if (isOn(id)) CONNECTED.delete(id); else CONNECTED.add(id);
        if (typeof paintConnections === 'function') paintConnections(); else paint();
      }));
    bind();
    pan.addEventListener('repaint', paint);
  }

  function wire() {
    $$('button[data-t]', menu).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();                     // toggles keep the menu open
      const k = b.dataset.t; SRCS[k] = !SRCS[k]; b.classList.toggle('on', SRCS[k]); paintChips();
    }));
    /* A file handed over in the box rides with what you ask about it —
       the same pill the pages that make a thing from a file use, so a
       conversation can be given one too: reformat this like that,
       bring that clause across. */
    $$('button[data-a]', menu).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation(); openPlus(false);
      const pick = h('input', { type: 'file', multiple: true, style: 'display:none',
        accept: '.docx,.doc,.pdf,.txt,.md,.rtf,.odt,.xlsx,.msg' });
      pick.onchange = () => {
        for (const f of pick.files) addPill({ kind: 'file', label: f.name, mark: PB_UPLOAD });
        pick.remove();
      };
      document.body.append(pick);
      pick.click();
    }));
    /* the chip names the verb, so the placeholder asks the rest of the question */
    const HINT = {
      Document:     'A document about what? Say the subject and who reads it.',
      Presentation: 'A deck about what? Say the subject and who is in the room.',
      Sheet:        'A sheet of what? Say the numbers and the period they cover.',
      App:          'An app that does what? Say who uses it and what they need from it.',
      Routine:      'What should it watch or write, and when should it run?',
    };
    $$('button[data-c]', menu).forEach(b => b.addEventListener('click', () => {
      openPlus(false);
      setMode(b.dataset.i, 'Create ' + b.dataset.c.toLowerCase(), HINT[b.dataset.c]);
    }));
  }

  function openPlus(on) {
    menu.hidden = !on;
    plus.classList.toggle('on', on);
    if (!on) return;
    plusRoot();
    menu.classList.remove('opening', 'up');
    menu.style.top = menu.style.bottom = ''; void menu.offsetWidth;
    const r = plus.getBoundingClientRect(), h = menu.offsetHeight;
    /* on Home it only flips up when the room runs out below */
    if (innerHeight - r.bottom < h + 20) menu.classList.add('up');
    /* flipping up is not enough on a short window — the menu can be taller than
       the room above. Pin it to a position that fits, measured from the +. */
    const want = menu.classList.contains('up') ? r.top - 8 - h : r.bottom + 8;
    const fit = Math.max(12, Math.min(want, innerHeight - 12 - h));
    menu.style.bottom = 'auto';
    menu.style.top = Math.round(fit - plusWrap.getBoundingClientRect().top) + 'px';
    menu.classList.add('opening');
  }

  plus.addEventListener('click', e => { e.stopPropagation(); openPlus(menu.hidden); });
  menu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => { if (!menu.hidden) openPlus(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) openPlus(false); });

  /* ── @ for a colleague, / for a skill ──────────────────────────
     Type the character in the box and the list comes up under the
     caret's line; pick one and it lands as a pill, trigger text gone. */
  const tok = document.createElement('div');
  tok.className = 'tokmenu'; tok.hidden = true;
  askEl.append(tok);
  let tokKind = null, tokFrom = 0, tokAct = 0;

  /* the assistant gets a face too — same circle as everyone else in the
     list, because in that column it is another party you can address */
  const SPARK = '<span class="tokface tokbot">'
    + '<svg viewBox="0 0 24 24" fill="currentColor">'
    + '<path d="M12 4.5c.57 4.2 3.28 6.93 7.5 7.5-4.22.57-6.93 3.28-7.5 7.5'
    + '-.57-4.2-3.28-6.93-7.5-7.5 4.22-.57 6.93-3.28 7.5-7.5z"/></svg></span>';

  const tokItems = (kind, q) => {
    /* @ reaches anyone who can answer: the assistant, the people in the
       conversation, and the agents. / is a verb list and reads better bare. */
    const all = kind === 'who'
      /* In a conversation @ is for the assistant and the people in it, and
         nothing else — agents belong to the home page, where there is
         nobody to address yet. */
      ? (IN_THREAD
          ? [{ n: 'Assistant', mark: SPARK, g: 'Assistant' },
             ...PEOPLE().map(p => ({ n: p.label, mark: p.mark || '', g: 'People' }))]
          : [{ n: 'Assistant', mark: SPARK, g: 'Assistant' },
             ...AGENTS.map(a => ({ n: a.label, mark: a.mark || '', g: 'Agents' }))])
      : SKILLS.map(n => ({ n, mark: '', g: 'Skills' }));
    const s = q.trim().toLowerCase();
    return all.filter(x => !s || x.n.toLowerCase().includes(s));
  };

  function tokPaint(kind, q) {
    const items = tokItems(kind, q);
    tokAct = 0;
    /* One list, in the order you would reach for them: the assistant, then
       everyone, then each person. Headings over four rows are labels on
       things that already look like what they are. */
    const rows = items.map((x, i) =>
      `<button type="button" data-tp="${x.n}" class="${i ? '' : 'act'}">${x.mark}` +
      `<span class="lbl"><span class="nmm">${x.n}</span></span></button>`).join('');
    tok.innerHTML = (kind === 'who' ? '' : '<div class="hd">Skills</div>')
      + (items.length ? rows : '<div class="none">Nothing matches.</div>');
    tok.querySelectorAll('[data-tp]').forEach(b => b.addEventListener('mousedown', e => {
      e.preventDefault(); tokChoose(b.dataset.tp);
    }));
  }
  function tokOpen(kind, from, q) {
    tokKind = kind; tokFrom = from;
    tokPaint(kind, q);
    tok.hidden = false; tok.classList.remove('opening'); void tok.offsetWidth; tok.classList.add('opening');
  }
  function tokClose() { tok.hidden = true; tokKind = null; }
  function tokChoose(name) {
    const before = box.value.slice(0, tokFrom), after = box.value.slice(box.selectionStart);

    /* In a conversation an @ is part of the sentence — "@Matt what do you
       make of this" — so it goes in as text and you keep typing. A pill
       would lift the name out of the sentence it belongs to and then ask
       what you want from them, which is the thing you were already saying.
       Agents on the home page still become pills: those are a mode, not a
       word in a sentence. */
    if (tokKind === 'who' && IN_THREAD) {
      const ins = '@' + name + ' ';
      box.value = before + ins + after;
      const at = before.length + ins.length;
      box.setSelectionRange(at, at);
      box.focus();
      tokClose(); sync();
      return;
    }

    box.value = before + after;
    pick(tokKind === 'who' ? 'agents' : 'skills', name);
    tokClose(); sync();
  }
  /* the trigger only counts at the start of a word */
  function tokScan() {
    if (opts.noTokens) return tokClose();
    const upto = box.value.slice(0, box.selectionStart);
    const m = /(^|\s)([@\/])([^@\/\s]{0,24})$/.exec(upto);
    if (!m) return tokClose();
    tokOpen(m[2] === '@' ? 'who' : 'skill', upto.length - m[2].length - m[3].length, m[3]);
  }
  box.addEventListener('input', tokScan);
  box.addEventListener('blur', () => setTimeout(tokClose, 120));
  box.addEventListener('keydown', e => {
    if (tok.hidden) return;
    const rows = [...tok.querySelectorAll('[data-tp]')];
    if (e.key === 'Escape') { e.stopPropagation(); return tokClose(); }
    if (!rows.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      tokAct = (tokAct + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
      rows.forEach((r, i) => r.classList.toggle('act', i === tokAct));
      rows[tokAct].scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); tokChoose(rows[tokAct].dataset.tp); }
  }, true);

  /* ── model switcher ──────────────────────────────────────────
     The platform is model-agnostic, so the composer says who is
     answering. Auto is the default and picks per request. */
  /* the description answers "when would I pick this?", never "who made it?" */
  const MODELS = [
    { id: 'auto',   n: 'Auto',            d: 'Picks the right one for each request' },
    { id: 'fable',  n: 'Claude Fable 5',  d: 'For your hardest thinking' },
    { id: 'sonnet', n: 'Claude Sonnet 5', d: 'Best balance for everyday work' },
    { id: 'gpt',    n: 'GPT-5',           d: 'Strong all-rounder, widely trusted' },
    { id: 'qwen',   n: 'Qwen 3',          d: 'Stays inside your own network' },
    { id: 'luna',   n: 'Luna',            d: 'Fastest and cheapest at high volume' },
  ];
  let sel = 'auto';
  const MTICK = '<svg class="tick" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  const CHEV  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

  /* Some composers are not choosing a model — the meetings box asks about
     a day, and there is one thing answering. `noModel` leaves the picker
     out rather than hiding it, so the bar has nothing in it but Send. */
  const NO_MODEL = !!opts.noModel;

  const mwrap = document.createElement('div'); mwrap.className = 'mdl';
  mwrap.innerHTML = `
    <button class="mdlbtn" type="button" aria-haspopup="menu" aria-expanded="false">
      <span class="mdlname">Auto</span>${CHEV}
    </button>
    <div class="mdlmenu" role="menu" hidden>
      ${MODELS.map(m => `<button type="button" data-m="${m.id}" role="menuitemradio">
        <span><span class="nmm">${m.n}</span><span class="dsc">${m.d}</span></span>${MTICK}</button>`).join('')}
    </div>`;
  if (!NO_MODEL) bar.insertBefore(mwrap, send);

  const mbtn = $('.mdlbtn', mwrap), mmenu = $('.mdlmenu', mwrap);
  const mpaint = () => {
    $('.mdlname', mwrap).textContent = MODELS.find(m => m.id === sel).n;
    $$('button[data-m]', mmenu).forEach(b => b.classList.toggle('on', b.dataset.m === sel));
  };
  const mopen = (on) => {
    mbtn.setAttribute('aria-expanded', String(on));
    mbtn.classList.toggle('on', on);
    mmenu.hidden = !on;
    if (!on) return;
    mmenu.classList.remove('opening', 'up'); void mmenu.offsetWidth;
    // it hangs below the pill; only when the window runs out underneath does it flip up
    const r = mbtn.getBoundingClientRect();
    if (innerHeight - r.bottom < mmenu.offsetHeight + 20) mmenu.classList.add('up');
    mmenu.classList.add('opening');
  };
  mbtn.addEventListener('click', e => { e.stopPropagation(); mopen(mmenu.hidden); });
  mmenu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => { if (!mmenu.hidden) mopen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mmenu.hidden) mopen(false); });
  $$('button[data-m]', mmenu).forEach(b => b.addEventListener('click', () => { sel = b.dataset.m; mpaint(); mopen(false); }));
  mpaint();

  /* ── send ── */
  function submit() {
    const t = box.value.trim();
    if (!t && !PILLS.length) return;
    const m = PILLS.length ? PILLS.map(p => p.label).join(' · ') : null;
    onSend(m ? `${m} — ${t}` : t, { model: sel, pills: [...PILLS] });
    box.value = ''; PILLS = []; paintMode(); sync();
  }
  send?.addEventListener('click', submit);
  box.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault(); submit();
  });

  paintChips();
  sync();
  return { get model() { return sel; }, get pills() { return [...PILLS]; }, addPill };
}

/* ── a tooltip ──
   For the marks that carry no word of their own. The platform's own is
   a grey slab that arrives a second and a half late and lands wherever
   the pointer happens to be; this one is the workspace's ink, centred
   over the thing it names. */
let tipEl, tipFor, tipT;
function hideTip() {
  clearTimeout(tipT); tipT = null;
  tipEl?.remove(); tipEl = null; tipFor = null;
}
function showTip(el) {
  const text = el.getAttribute('data-tip');
  if (!text || tipFor === el) return;
  hideTip();
  tipFor = el;
  tipEl = document.createElement('div');
  tipEl.className = 'tip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.textContent = text;
  document.body.append(tipEl);
  const r = el.getBoundingClientRect();
  const w = tipEl.offsetWidth, hgt = tipEl.offsetHeight;
  tipEl.style.left = Math.round(Math.max(8,
    Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8))) + 'px';
  /* above by default, and under it only when there is no room over it */
  const above = r.top - hgt - 8 > 8;
  tipEl.style.top = Math.round(above ? r.top - hgt - 8 : r.bottom + 8) + 'px';
  tipEl.dataset.side = above ? 'top' : 'bottom';
  requestAnimationFrame(() => tipEl?.setAttribute('data-on', 'true'));
}
document.addEventListener('pointerover', (e) => {
  const el = e.target.closest?.('[data-tip]');
  if (!el) { if (tipFor) hideTip(); return; }
  if (el === tipFor) return;
  clearTimeout(tipT);
  /* long enough that running the pointer across a row does not trail a
     line of them behind it */
  tipT = setTimeout(() => showTip(el), 240);
});
document.addEventListener('pointerdown', hideTip, true);
document.addEventListener('focusin', (e) => {
  const el = e.target.closest?.('[data-tip]');
  /* only for focus that came from the keyboard: a button just clicked
     should not label itself all over again */
  if (el && e.target.matches?.(':focus-visible')) showTip(el); else hideTip();
});
window.addEventListener('scroll', hideTip, true);
window.addEventListener('blur', hideTip);

/* ── a short-lived note, for what is not built yet ── */
let toastEl;
function toast(msg) {
  toastEl?.remove();
  toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.textContent = msg;
  document.body.append(toastEl);
  setTimeout(() => { toastEl?.remove(); toastEl = null; }, 3200);
}
