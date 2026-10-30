/* ================================================================
   Repository — took Vault's place in the rail (22 Oct).

   The screens are the Repository prototype (Design artifact "Clavia
   Repository Prototype"), rendered by dc-mini.js from repository-dc.js:
   the documents list with its folders, filters and dialogs, and the
   document view. (Counterparties, Import history, the full details page
   and the Review page were removed on 23 Oct.)
   The prototype's other screens — its own New Chat, the pages it only
   points at, and Admin — are not part of this build: going to one of
   them goes to the app's own page instead, or says so.

   One instance for the session, so the list keeps its filters, sort and
   selection when you go elsewhere and come back.
================================================================ */

const REPO = { mounted: null };

/* rt-, cq-, sh-, cq, trow and mx-tile are already class names in the app's stylesheets */
const repoRename = (t) => (/^(rt|cq|sh)-/.test(t) || t === 'trow' || t === 'cq' || t === 'mx-tile' ? 'rp-' + t : t);
const repoCls = (s) => s.split(/\s+/).filter(Boolean).map(repoRename).join(' ');
const repoSel = (sel) => sel.replace(/\.((?:rt|cq|sh)-[\w-]+|(?:trow|cq|mx-tile)(?![\w-]))/g, '.rp-$1');

function repoExtend(Base) {
  const OK = ['repo'];
  return class RepoComponent extends Base {
    renderVals() {
      const v = super.renderVals();
      v.isHome = false; v.isThread = false; v.isOther = false; v.isAdmin = false;
      return v;
    }
    setState(part, cb) {
      const p = typeof part === 'function' ? part(this.state, this.props) : part;
      if (p && p.screen && OK.indexOf(p.screen) < 0) {
        const to = p.screen === 'other' ? p.other : (p.screen === 'home' || p.screen === 'thread' ? 'home' : '');
        if (to) { setTimeout(() => go(views.has(to) ? to : 'home'), 0); return; }
        return super.setState({ note: 'Admin settings are not part of this build yet.' }, cb);
      }
      const r = super.setState(p, cb);
      if (p && 'docPanel' in p) setTimeout(repoTrackDoc, 0);
      return r;
    }
  };
}

/* A document opens the way an Intake request does: the browser's Back
   returns to the list, and coming back to the Repository from another
   page shows the list. The address stays #vault, so opening a document
   adds a history step with the same address (pushState), which Back
   takes away again. */
let repoOpenDoc = '';
function repoTrackDoc() {
  const inst = REPO.mounted && REPO.mounted.inst;
  const id = (inst && inst.state.docPanel) || '';
  if (id && !repoOpenDoc) history.pushState({ rpDoc: true }, '', location.href);
  if (!id && repoOpenDoc && history.state && history.state.rpDoc) { REPO.skipPop = true; history.back(); }
  repoOpenDoc = id;
}
window.addEventListener('popstate', () => {
  if (REPO.skipPop) { REPO.skipPop = false; return; }
  const inst = REPO.mounted && REPO.mounted.inst;
  if (inst && inst.state.docPanel && !(history.state && history.state.rpDoc)) inst.setState({ docPanel: '' });
});

function repositoryView() {
  if (!REPO.mounted) {
    REPO.mounted = DCMini.mount({
      template: REPO_DC.template,
      css: REPO_DC.css,
      logic: REPO_DC.logic,
      props: { start: 'Documents', viewer: 'Roger Bennett · Legal Ops' },
      className: 'rp-root',
      scopeClass: 'rp-root',
      cls: repoCls,
      renameSel: repoSel,
      extend: repoExtend,
    });
  } else {
    /* arriving at the Repository (from the rail or another page) shows the list */
    if (REPO.mounted.inst.state.docPanel) REPO.mounted.inst.setState({ docPanel: '' });
    REPO.mounted.render();
  }
  return REPO.mounted.el;
}

/* a quick-filter menu closes on a click outside it, or on Escape */
const repoShutMenus = () => {
  const inst = REPO.mounted && REPO.mounted.inst;
  if (inst && inst.state && inst.state.qfOpen) inst.setState({ qfOpen: '' });
};
document.addEventListener('pointerdown', (e) => {
  if (!REPO.mounted || !REPO.mounted.el.isConnected) return;
  if (e.target.closest && e.target.closest('.rp-root [role="menu"], .rp-root [aria-haspopup]')) return;
  repoShutMenus();
}, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && REPO.mounted && REPO.mounted.el.isConnected) repoShutMenus(); });

register('vault', repositoryView);
/* app.js routes the address before this file loads; take the page over
   if it is already showing the old Vault */
if (state.view === 'vault') go('vault');
