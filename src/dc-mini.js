/* ================================================================
   dc-mini — renders a Design Component (.dc.html) inside the app.

   The Repository was designed as a Design artifact: one .dc.html file
   whose markup holds {{holes}}, <sc-if> and <sc-for>, and whose logic is
   a `class Component extends DCLogic` with renderVals(). Rather than
   re-write that by hand (and drift from it), the app renders the same
   template and runs the same logic. repository-import.mjs copies a new
   version of the prototype in.

   The template is tokenised here, not handed to the browser's HTML
   parser: the parser drops unknown tags inside <select> and <table>,
   which is exactly where the prototype loops its <option>s and <th>s.
   Rendering is a plain index-by-index patch of the live DOM, so an input
   keeps its focus and caret while the state around it changes.
================================================================ */

class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; this.__host = null; }
  setState(part, cb) {
    const p = typeof part === 'function' ? part(this.state, this.props) : part;
    if (p) this.state = Object.assign({}, this.state, p);
    if (this.__host) this.__host.schedule(cb);
  }
  forceUpdate(cb) { if (this.__host) this.__host.schedule(cb); }
}

const DCMini = (() => {
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const RAW = new Set(['style', 'script', 'textarea']);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  let decoder;
  const decode = (s) => {
    if (s.indexOf('&') < 0) return s;
    decoder = decoder || document.createElement('textarea');
    decoder.innerHTML = s;
    return decoder.value;
  };

  /* ---- template → tree ---- */
  function parse(html) {
    const root = { tag: '#root', attrs: [], kids: [] };
    const stack = [root];
    const n = html.length;
    let i = 0;
    const top = () => stack[stack.length - 1];
    const text = (t) => { if (t) top().kids.push({ tag: '#text', text: decode(t) }); };
    while (i < n) {
      const lt = html.indexOf('<', i);
      if (lt < 0) { text(html.slice(i)); break; }
      if (lt > i) text(html.slice(i, lt));
      i = lt;
      if (html.startsWith('<!--', i)) { const e = html.indexOf('-->', i); i = e < 0 ? n : e + 3; continue; }
      if (html[i + 1] === '/') {
        const e = html.indexOf('>', i);
        const tag = html.slice(i + 2, e).trim().toLowerCase();
        for (let k = stack.length - 1; k > 0; k--) if (stack[k].tag === tag) { stack.length = k; break; }
        i = e + 1;
        continue;
      }
      if (!/[a-zA-Z]/.test(html[i + 1] || '')) { text('<'); i++; continue; }
      let j = i + 1;
      while (j < n && !/[\s/>]/.test(html[j])) j++;
      const name = html.slice(i + 1, j);
      const tag = name.toLowerCase();
      const attrs = [];
      let selfClose = false;
      while (j < n) {
        while (j < n && /\s/.test(html[j])) j++;
        if (html[j] === '>') { j++; break; }
        if (html[j] === '/' && html[j + 1] === '>') { selfClose = true; j += 2; break; }
        let k = j;
        while (k < n && !/[\s=>]/.test(html[k]) && !(html[k] === '/' && html[k + 1] === '>')) k++;
        const an = html.slice(j, k);
        j = k;
        while (j < n && /\s/.test(html[j])) j++;
        let av = '';
        if (html[j] === '=') {
          j++;
          while (j < n && /\s/.test(html[j])) j++;
          const q = html[j];
          if (q === '"' || q === "'") { const e = html.indexOf(q, j + 1); av = html.slice(j + 1, e); j = e + 1; }
          else { let k2 = j; while (k2 < n && !/[\s>]/.test(html[k2])) k2++; av = html.slice(j, k2); j = k2; }
        }
        if (an) attrs.push([an, decode(av)]);
        else j++;
      }
      /* SVG keeps its camelCase names (viewBox, linearGradient) */
      const node = { tag: tag, name: name, attrs: attrs, kids: [] };
      top().kids.push(node);
      if (RAW.has(tag) && !selfClose) {
        const close = html.toLowerCase().indexOf('</' + tag, j);
        const body = html.slice(j, close < 0 ? n : close);
        if (body) node.kids.push({ tag: '#text', text: tag === 'textarea' ? decode(body) : body });
        i = close < 0 ? n : html.indexOf('>', close) + 1;
        continue;
      }
      if (!VOID.has(tag) && !selfClose) stack.push(node);
      i = j;
    }
    return root;
  }

  const BOOL = new Set(['checked', 'disabled', 'selected', 'multiple', 'readonly', 'required', 'hidden', 'open', 'autofocus']);

  /* ---- holes ---- */
  const HOLE = /\{\{([^}]*)\}\}/g;
  function lookup(path, scopes) {
    const p = path.trim();
    if (p === 'true') return true;
    if (p === 'false') return false;
    if (p === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
    if (/^'.*'$|^".*"$/.test(p)) return p.slice(1, -1);
    const parts = p.split('.');
    let v;
    for (let s = scopes.length - 1; s >= 0; s--) {
      if (scopes[s] && Object.prototype.hasOwnProperty.call(scopes[s], parts[0])) { v = scopes[s][parts[0]]; break; }
    }
    for (let k = 1; k < parts.length && v != null; k++) v = v[parts[k]];
    return v;
  }
  const str = (v) => (v == null || v === false ? '' : String(v));
  function value(raw, scopes) {
    if (raw.indexOf('{{') < 0) return raw;
    const m = /^\s*\{\{([^}]*)\}\}\s*$/.exec(raw);
    if (m) return lookup(m[1], scopes);
    return raw.replace(HOLE, (x, p) => str(lookup(p, scopes)));
  }

  /* ---- tree → virtual nodes ---- */
  function expand(node, scopes, out, cls) {
    for (const k of node.kids) {
      if (k.tag === '#text') {
        const t = k.text.indexOf('{{') < 0 ? k.text : k.text.replace(HOLE, (x, p) => str(lookup(p, scopes)));
        if (t) out.push({ t: '#text', text: t });
        continue;
      }
      if (k.tag === 'sc-if') {
        const a = k.attrs.find((x) => x[0] === 'value');
        if (a && value(a[1], scopes)) expand(k, scopes, out, cls);
        continue;
      }
      if (k.tag === 'sc-for') {
        const a = Object.fromEntries(k.attrs);
        const list = value(a.list || '', scopes);
        if (Array.isArray(list)) {
          const as = a.as || 'item';
          list.forEach((item, idx) => expand(k, scopes.concat([{ [as]: item, $index: idx }]), out, cls));
        }
        continue;
      }
      if (k.tag === 'helmet') continue;
      const props = {};
      for (const [an, av] of k.attrs) {
        if (an.startsWith('hint-')) continue;
        /* a bare boolean attribute (<button disabled>) is on, as in HTML */
        let v = av === '' && BOOL.has(an) ? true : value(av, scopes);
        if (an === 'class' && cls) v = cls(str(v));
        props[an] = v;
      }
      const kids = [];
      expand(k, scopes, kids, cls);
      out.push({ t: k.tag, name: k.name, props: props, kids: kids });
    }
    return out;
  }

  /* ---- virtual nodes → DOM ---- */
  const EVT = { doubleclick: 'dblclick', focus: 'focusin', blur: 'focusout' };
  function eventName(el, an) {
    const e = an.slice(2).toLowerCase();
    if (e === 'change') {
      const type = (el.getAttribute('type') || '').toLowerCase();
      return (el.localName === 'select' || type === 'checkbox' || type === 'radio' || type === 'file') ? 'change' : 'input';
    }
    return EVT[e] || e;
  }
  const isEvent = (an) => an.length > 2 && an[0] === 'o' && an[1] === 'n' && an[2] >= 'A' && an[2] <= 'Z';
  const PROP = new Set(['checked', 'disabled', 'selected', 'multiple', 'readonly', 'indeterminate']);
  const truthy = (v) => !(v === false || v == null || v === 'false' || v === '');

  function setProps(el, props, svg) {
    const old = el.__p || {};
    el.__h = el.__h || {};
    for (const an in old) {
      if (an in props) continue;
      if (an === 'ref') continue;
      if (isEvent(an)) { el.__h[eventName(el, an)] = null; continue; }
      if (PROP.has(an)) el[an] = false;
      el.removeAttribute(an);
    }
    for (const an in props) {
      const v = props[an];
      if (old[an] === v && an !== 'value' && !PROP.has(an)) continue;
      if (an === 'ref') {
        if (typeof v === 'function') v(el);
        else if (v && typeof v === 'object') v.current = el;
        continue;
      }
      if (isEvent(an)) {
        const ev = eventName(el, an);
        if (!(ev in el.__h)) el.addEventListener(ev, (e) => { const f = el.__h[ev]; if (typeof f === 'function') f(e); });
        el.__h[ev] = v;
        continue;
      }
      if (an === 'value' && !svg) {
        const s = str(v);
        if (el.localName === 'select') el.__v = s;
        else if (el.value !== s) el.value = s;
        if (el.localName !== 'select' && el.localName !== 'textarea' && el.localName !== 'input') el.setAttribute('value', s);
        continue;
      }
      if (PROP.has(an) && !svg) {
        el[an] = truthy(v);
        if (truthy(v)) el.setAttribute(an, ''); else el.removeAttribute(an);
        continue;
      }
      if (an.startsWith('aria-') || an.startsWith('data-')) { if (v == null) el.removeAttribute(an); else el.setAttribute(an, String(v)); continue; }
      if (v === false || v == null) el.removeAttribute(an);
      else el.setAttribute(an, v === true ? '' : String(v));
    }
    el.__p = props;
  }

  function create(v, svg) {
    if (v.t === '#text') return document.createTextNode(v.text);
    const inSvg = svg || v.t === 'svg';
    const el = inSvg ? document.createElementNS(SVG_NS, v.name) : document.createElement(v.t);
    el.__t = v.t;
    setProps(el, v.props, inSvg);
    patchKids(el, v.kids, inSvg && v.t !== 'foreignobject');
    if (el.__v !== undefined) el.value = el.__v;
    return el;
  }
  function same(d, v) { return v.t === '#text' ? d.nodeType === 3 : (d.nodeType === 1 && d.__t === v.t); }
  function patchKids(el, vk, svg) {
    for (let i = 0; i < vk.length; i++) {
      const v = vk[i];
      const d = el.childNodes[i];
      if (d && same(d, v)) {
        if (v.t === '#text') { if (d.data !== v.text) d.data = v.text; }
        else {
          const inSvg = svg || v.t === 'svg';
          setProps(d, v.props, inSvg);
          patchKids(d, v.kids, inSvg && v.t !== 'foreignobject');
          if (d.__v !== undefined && d.value !== d.__v) d.value = d.__v;
        }
      } else {
        const nd = create(v, svg);
        if (d) el.replaceChild(nd, d); else el.appendChild(nd);
      }
    }
    while (el.childNodes.length > vk.length) el.removeChild(el.lastChild);
  }

  /* ---- the <helmet> CSS, kept inside the mount ---- */
  function scopeCss(css, scope, rename) {
    let out = '', i = 0;
    const n = css.length;
    while (i < n) {
      const open = css.indexOf('{', i);
      if (open < 0) break;
      const head = css.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (j < n && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
      const body = css.slice(open + 1, j - 1);
      if (/^@(keyframes|-webkit-keyframes|font-face)/.test(head)) out += head + '{' + body + '}\n';
      else if (/^@(media|supports)/.test(head)) out += head + '{' + scopeCss(body, scope, rename) + '}\n';
      else {
        const sel = head.split(',').map((x) => {
          const t = rename(x.trim());
          if (/^(html|body)$/.test(t)) return scope;
          if (/^(html|body)[\s.:[]/.test(t)) return scope + t.replace(/^(html|body)/, '');
          return scope + ' ' + t;
        }).join(', ');
        out += sel + '{' + body + '}\n';
      }
      i = j;
    }
    return out;
  }

  /* ---- mount ---- */
  function mount(opts) {
    const tree = parse(opts.template);
    const Component = new Function('DCLogic', opts.logic + '\n;return Component;')(DCLogic);
    const Klass = opts.extend ? opts.extend(Component) : Component;
    const root = document.createElement('div');
    root.className = 'dcm-root ' + (opts.className || '');
    const style = document.createElement('style');
    style.textContent = '.dcm-root, .dcm-root *, .dcm-root *::before, .dcm-root *::after { box-sizing: content-box; }\n'
      + scopeCss(opts.css || '', '.' + opts.scopeClass, opts.renameSel || ((x) => x));
    root.appendChild(style);
    const body = document.createElement('div');
    body.style.display = 'contents';
    root.appendChild(body);
    const inst = new Klass(opts.props || {});
    let queued = false, cbs = [];
    const render = () => {
      queued = false;
      const vals = inst.renderVals();
      patchKids(body, expand(tree, [vals], [], opts.cls), false);
      const run = cbs; cbs = [];
      run.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    };
    inst.__host = {
      schedule: (cb) => { if (cb) cbs.push(cb); if (!queued) { queued = true; queueMicrotask(render); } }
    };
    render();
    if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
    return { el: root, inst: inst, render: render };
  }

  return { mount: mount, parse: parse };
})();
