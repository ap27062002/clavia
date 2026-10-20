/* ════════════════════════════════════════════════════════════════
   intake-demo.js: the two Gulf Systems requests Priya's email became,
   told in full — the way RQ-1048 (Northwind) and the Brightwell showcase
   are told in intake-docs.js.

   1. Mutual NDA with Gulf Systems before the technical workshop.
      Mid-negotiation: our template draft, the version we sent, Gulf
      Systems' redline (DIFC law, a residuals clause, oral disclosures
      summarised in writing), a comparison, Schedule 1 in two versions,
      a playbook round waiting on Roger's sign-off, and eight threads.
   2. Authorised reseller letter for Gulf Systems' Riyadh distributor
      (Al Noor Technology Company). In drafting: the letter in three
      versions (Clavia, Matt, Priya's edits), the distributor's
      commercial registration, the schedule of territory and products,
      a comparison, and seven threads.

   Requests are matched by title (their numbers are made at runtime) and
   rebuilt once, behind d.demoV. The same pass lengthens the Brightwell
   documents for browsers that seeded them before they were full length.
   ════════════════════════════════════════════════════════════════ */
const MX_GULF_TITLES = {
  'gulf-nda': 'Mutual NDA with Gulf Systems before the technical workshop',
  'gulf-letter': 'Authorised reseller letter for Gulf Systems’ Riyadh distributor',
};

/* small builders shared by both requests */
const mxDemoKit = () => {
  const P = (t) => ({ t: 'p', v: t }), H = (t) => ({ t: 'h2', v: t }), T = (t) => ({ t: 'h1', v: t }), M = (t) => ({ t: 'meta', v: t });
  const del = (x) => `<del>${x}</del>`, ins = (x) => `<ins>${x}</ins>`, blank = (x) => `<mark>[${x}]</mark>`, sw = (a, b) => del(a) + ins(b);
  const n = (k, x) => `<b>${k}</b> ${x}`;
  const now = Date.now();
  /* a time some days ago; never later than a few minutes ago, whatever the hour the demo runs */
  const at = (days, hh, mm) => { const x = new Date(now - days * 864e5); x.setHours(hh, mm, 0, 0); return new Date(Math.min(x.getTime(), now - 5 * 6e4)).toISOString(); };
  const due = (days) => { const x = new Date(); x.setDate(x.getDate() + days); x.setHours(17, 0, 0, 0); return x.toISOString(); };
  /* a saved comparison of two versions of a document, as the Compare action makes it */
  const compare = (doc, id, a, b, when, title) => {
    if (typeof mxCompare !== 'function') return null;
    const res = mxCompare(doc.versions[a - 1], doc.versions[b - 1]);
    if (!res) return null;
    const base = doc.title.replace(/\.docx?$/i, '');
    return { id, title: `${title || base} — v${a} vs v${b}.docx`, versions: [{ name: 'Comparison', by: 'Clavia', when,
      file: `${title || base} — v${a} vs v${b}.docx`, note: `What changed from v${a} (${doc.versions[a - 1].name}) to v${b} (${doc.versions[b - 1].name})`,
      blocks: res.rows.map(row => ({ t: row.t, v: mxCompareHtml(row) })),
      cmp: { from: { v: a, name: doc.versions[a - 1].name }, to: { v: b, name: doc.versions[b - 1].name }, changes: res.changes, ins: res.ins, del: res.del, summary: mxCompareSummary(res) } }] };
  };
  return { P, H, T, M, del, ins, blank, sw, n, at, due, compare };
};

/* ── 1. the Gulf Systems mutual NDA ───────────────────────────────── */
function mxGulfNdaDocs() {
  const { P, H, T, M, del, ins, blank, sw, n, at, compare } = mxDemoKit();
  const nda = (o) => [
    T('Mutual Non-Disclosure Agreement'),
    M('BETWEEN LUMEN ANALYTICS LTD AND GULF SYSTEMS LLC'),
    P(`This Agreement is made on ${o.date} between:`),
    P('(1) Lumen Analytics Ltd, a company registered in England and Wales under number 09876543 whose registered office is at 1 Finsbury Avenue, London EC2M 2PF ("Lumen"); and'),
    P('(2) Gulf Systems LLC, a limited liability company registered in the Emirate of Dubai under licence number 784512 whose principal office is at Office 1204, Al Habtoor Tower, Dubai, United Arab Emirates ("Gulf Systems"),'),
    P('each a "party" and together the "parties".'),
    H('Background'),
    P(`(A) The parties are discussing ${o.purpose}, and will hold a technical workshop on ${o.workshop} to take those discussions forward.`),
    P('(B) Each party expects to disclose Confidential Information to the other in the course of those discussions, and wishes to protect it on the terms of this Agreement.'),
    H('1. Definitions'),
    P(n('1.1', `In this Agreement: ${o.affDef}"Business Day" means a day other than a Saturday, Sunday or public holiday in London or Dubai; "Disclosing Party" means the party that discloses Confidential Information, directly or through its Representatives; "Purpose" means evaluating the partnership described in recital (A), including at the Workshop; "Receiving Party" means the party that receives Confidential Information; "Representatives" means, in relation to a party, ${o.reps}employees, officers, contractors and professional advisers; and "Workshop" means the technical workshop referred to in recital (A) and any follow-up session the parties agree in writing.`)),
    P(n('1.2', 'Headings do not affect interpretation. Schedule 1 forms part of this Agreement. "Including" and similar words do not limit the words that come before them.')),
    H('2. Confidential Information'),
    P(n('2.1', `"Confidential Information" means all information of a confidential nature disclosed by or on behalf of the Disclosing Party to the Receiving Party, before or after the date of this Agreement, in writing, orally, visually, electronically or by any other means, that is marked confidential${o.reasonable}. It includes product roadmaps, source code, system architecture, integration designs, pricing, customer and pipeline information, the information described in Schedule 1, and the existence and terms of this Agreement.`)),
    P(n('2.2', 'Confidential Information does not include information that the Receiving Party can show: (a) is or becomes generally available to the public other than through a breach of this Agreement; (b) was lawfully in its possession before disclosure, free of any duty of confidence; (c) is independently developed by or for it without use of the Confidential Information; or (d) is lawfully received from a third party who is free to disclose it.')),
    H('3. Obligations of Confidentiality'),
    P(n('3.1', 'The Receiving Party shall: (a) use the Confidential Information only for the Purpose; (b) keep it secure, using at least the care it uses to protect its own confidential information and in any event no less than reasonable care; (c) not disclose it to any person except in accordance with clause 4 or clause 5; and (d) not copy it or reduce it to writing except as reasonably needed for the Purpose.')),
    P(n('3.2', 'The Receiving Party shall not reverse engineer, decompile or disassemble any software, prototype or sample provided under this Agreement, or use any demonstration environment made available to it for any purpose other than the Purpose.')),
    P(n('3.3', 'The Receiving Party shall notify the Disclosing Party promptly in writing if it becomes aware of any unauthorised use or disclosure of the Confidential Information, and shall take reasonable steps to stop it.')),
    ...(o.residuals ? [P(o.residuals)] : []),
    H('4. Representatives'),
    P(n('4.1', 'The Receiving Party may disclose Confidential Information to those of its Representatives who need to know it for the Purpose, provided that it tells them of its confidential nature before disclosure and ensures that they comply with this Agreement as if they were party to it.')),
    P(n('4.2', 'The Receiving Party is responsible for any act or omission of its Representatives that would be a breach of this Agreement if it had been done by the Receiving Party.')),
    H('5. Compelled Disclosure'),
    P(n('5.1', 'The Receiving Party may disclose Confidential Information to the extent required by law, by any governmental or regulatory authority, or by a court of competent jurisdiction, provided that, to the extent it is lawful to do so, it gives the Disclosing Party as much notice as is practicable, takes into account the Disclosing Party’s reasonable requests about the content and timing of the disclosure, and discloses only the minimum required.')),
    H('6. Term'),
    P(n('6.1', `This Agreement applies to Confidential Information disclosed during the twelve (12) months after the date above. The obligations in clauses 2 to 5 continue for ${o.term} from the date of each disclosure, except that, for source code and trade secrets, they continue for as long as the information remains confidential.`)),
    P(n('6.2', 'Either party may end the period during which information is disclosed under this Agreement by giving the other thirty (30) days’ written notice. Ending it does not affect the obligations in respect of information already disclosed.')),
    H('7. Return and Destruction'),
    P(n('7.1', 'Within ten (10) Business Days of the Disclosing Party’s written request, the Receiving Party shall return or destroy all documents and materials containing the Disclosing Party’s Confidential Information and, if asked, confirm in writing that it has done so.')),
    P(n('7.2', 'The Receiving Party may keep one archival copy where required by law or regulation, and need not delete electronic copies held in routine back-up systems, provided that any copy it keeps remains subject to this Agreement for as long as it is kept.')),
    H('8. No Licence, Warranty or Further Obligation'),
    P(n('8.1', 'All Confidential Information remains the property of the Disclosing Party. No licence of any patent, copyright, trade mark or other intellectual property right is granted by this Agreement, other than the limited right to use the Confidential Information for the Purpose.')),
    P(n('8.2', 'Confidential Information is provided "as is". The Disclosing Party gives no warranty as to its accuracy or completeness, and has no liability for the Receiving Party’s use of it, except as set out in a later written agreement between the parties.')),
    P(n('8.3', 'Nothing in this Agreement obliges either party to enter into any further agreement, including the reseller agreement the parties are negotiating, or prevents either party from discussing similar arrangements with others, provided it does not use the other party’s Confidential Information to do so.')),
    H('9. Remedies'),
    P(n('9.1', 'Each party acknowledges that damages alone may not be an adequate remedy for a breach of this Agreement, and that the other party is entitled to seek an injunction, specific performance or other equitable relief for any threatened or actual breach, in addition to any other remedy available to it.')),
    H('10. Data Protection'),
    P(n('10.1', 'The parties do not expect to share personal data under this Agreement, other than the business contact details of the people involved in the discussions and the Workshop. Each party shall process any such personal data in accordance with the data protection laws that apply to it, including the UK GDPR and Federal Decree-Law No. 45 of 2021 of the United Arab Emirates.')),
    H('11. General'),
    P(n('11.1', 'This Agreement is the entire agreement between the parties about its subject matter and replaces any earlier understanding about it. Any variation must be in writing and signed by both parties.')),
    P(n('11.2', 'Neither party may assign or transfer any of its rights or obligations under this Agreement without the other party’s prior written consent.')),
    P(n('11.3', `Any notice under this Agreement shall be in writing and delivered by hand or by international courier to the address of the other party set out above${o.email}.`)),
    P(n('11.4', 'This Agreement may be signed in any number of counterparts, including by electronic signature, each of which is an original and which together form one agreement.')),
    ...(o.lang ? [P(o.lang)] : []),
    H('12. Governing Law and Jurisdiction'),
    P(n('12.1', `This Agreement and any dispute or claim arising out of or in connection with it, including non-contractual disputes or claims, are governed by the laws of ${o.law}.`)),
    P(n('12.2', `The ${o.courts} have exclusive jurisdiction to settle any dispute or claim arising out of or in connection with this Agreement.`)),
    P(`Signed for and on behalf of Lumen Analytics Ltd by ${o.signUs} ………………………… Date ……………`),
    P(`Signed for and on behalf of Gulf Systems LLC by ${o.signThem} ………………………… Date ……………`),
  ];
  const base = { date: 'the date of the last signature below', workshop: '22 October 2026 at Gulf Systems’ offices in Dubai',
    purpose: 'a channel partnership under which Gulf Systems would resell the Lumen Analytics Platform in the United Arab Emirates and the Kingdom of Saudi Arabia',
    affDef: '', reps: 'its ', reasonable: ' or that a reasonable person would understand to be confidential', residuals: null, term: 'three (3) years',
    email: '', lang: null, law: 'England and Wales', courts: 'courts of England and Wales',
    signUs: 'Roger Bennett, General Counsel', signThem: 'Omar Haddad, Managing Director' };
  const v1 = nda({ ...base, date: blank('Effective date'), workshop: blank('Workshop date and place'), purpose: blank('Purpose'), term: blank('Confidentiality period'),
    signUs: blank('Our signatory'), signThem: 'its authorised signatory' });
  const v2 = nda(base);
  const v3 = nda({ ...base,
    affDef: ins('"Affiliate" means any entity that controls, is controlled by or is under common control with a party; '),
    reps: `${ins('its Affiliates and ')}its ${ins('and their ')}`,
    reasonable: del(' or that a reasonable person would understand to be confidential') + ins(', or, if disclosed orally or visually, is identified as confidential at the time of disclosure and summarised in writing within thirty (30) days'),
    residuals: ins(n('3.4', 'Nothing in this Agreement restricts either party from using, for any purpose, the general skills, know-how and experience retained in the unaided memory of its Representatives, provided that this clause does not permit the disclosure of Confidential Information.')),
    term: sw('three (3) years', 'two (2) years'),
    email: ins(', or by email to legal@lumen.io (for Lumen) and legal@gulfsystems.ae (for Gulf Systems)'),
    lang: ins(n('11.5', 'This Agreement is made in the English language. If it is translated into Arabic or any other language, the English text prevails.')),
    law: sw('England and Wales', 'the Dubai International Financial Centre'),
    courts: sw('courts of England and Wales', 'Courts of the Dubai International Financial Centre') });
  const sched = (theirs) => [
    T('Schedule 1 — Workshop Attendees'),
    M('GULF SYSTEMS TECHNICAL WORKSHOP · 22 OCTOBER 2026 · DUBAI'),
    P('This schedule forms part of the Mutual Non-Disclosure Agreement between Lumen Analytics Ltd and Gulf Systems LLC. It lists who will attend the Workshop and what each party expects to share. It is a guide for the teams: information not listed here is still protected if it falls within clause 2 of the Agreement.'),
    H('Part A: Lumen will share'),
    P('1. The Lumen Analytics Platform roadmap for 2027, including the Arabic-language interface and the data residency options being considered for the Gulf region.'),
    P('2. The architecture of the data connectors and the integration patterns used with ERP and billing systems, shown live in a demonstration environment.'),
    P('3. Indicative partner pricing and discount tiers for resellers in the United Arab Emirates and the Kingdom of Saudi Arabia.'),
    P('4. Two anonymised case studies from existing customers in the utilities sector.'),
    H('Part B: Gulf Systems will share'),
    P('1. Their pipeline of prospective customers for the Platform in the UAE and Saudi Arabia, by sector and size. Customer names are not shared until the reseller agreement is signed.'),
    P('2. The systems their customers typically run, and the integration work Gulf Systems expects to do itself.'),
    P('3. Their pre-sales and support capacity, including Arabic-language support, and their plans for a team in Riyadh.'),
    H('Part C: Who will attend'),
    P(theirs ? 'Lumen: Priya Shah (Head of Partnerships), Leo Park (Head of Product), Sana Iqbal and Ben Carter (Solutions Engineering).'
      : 'Lumen: Priya Shah (Head of Partnerships), Leo Park (Head of Product), and two solutions engineers to be confirmed.'),
    P(theirs ? 'Gulf Systems: Omar Haddad (Managing Director), Karim Saleh (Chief Technology Officer) and Nadia Farouk (Solutions Architect), with Yousef Al-Harbi (Account Director) and Huda Al-Shehri (Pre-sales Engineer) of Gulf Systems Arabia Company, Riyadh.'
      : 'Gulf Systems: to be confirmed by Omar Haddad.'),
    H('Part D: Ground rules'),
    P('The sessions are not recorded. Slides are shared as PDF after the Workshop, not before, and only with the people listed in Part C. Source code is shown on screen and is not handed over.'),
  ];
  const d1 = { id: 'd1', title: 'Gulf Systems — Mutual NDA.docx', source: 'mutual-nda', versions: [
    { name: 'First draft', by: 'Clavia', when: at(6, 9, 15), file: 'Gulf Systems — Mutual NDA.docx', blocks: v1, note: 'Drafted from the Mutual NDA template; four blanks left for legal' },
    { name: 'Sent to Gulf Systems', by: 'Grace Coleman', when: at(5, 9, 30), file: 'Gulf Systems — Mutual NDA v2.docx', blocks: v2, note: 'Purpose, workshop and a three-year term filled in' },
    { name: 'Gulf Systems’ redline', by: 'Gulf Systems LLC', when: at(2, 14, 20), file: 'GS-Lumen MNDA - GS comments (LM).docx', blocks: v3, note: 'Their markup, from Layla Mansour' },
  ] };
  const d2 = { id: 'd2', title: 'Schedule 1 — Workshop Attendees.docx', versions: [
    { name: 'From Partnerships', by: 'Priya Shah', when: at(4, 15, 10), file: 'Schedule 1 — Workshop Attendees.docx', blocks: sched(false) },
    { name: 'Gulf Systems’ attendees added', by: 'Priya Shah', when: at(3, 10, 30), file: 'Schedule 1 — Workshop Attendees v2.docx', blocks: sched(true), note: 'Names from Omar Haddad' },
  ] };
  const docs = [d1, d2];
  const cmp = compare(d1, 'd3', 2, 3, at(2, 14, 20));
  if (cmp) docs.push(cmp);
  return docs;
}

/* the round: what Gulf Systems changed in v3, read against the Mutual NDA playbook */
MX_ROUNDS['Gulf Systems LLC — NDA'] = {
  d1: [{ v: 3, base: 2, answered: null, points: [
    { term: 'Representatives', brief: 'Affiliates included', clause: '1. Definitions', html: '"Representatives" means, in relation to a party, <ins>its Affiliates and </ins>its <ins>and their </ins>employees, officers, contractors and professional advisers', playbook: 'within', why: 'Affiliates are fine while each party answers for them',
      find: null, ours: null, suggest: { d: 'accept' }, decision: { d: 'accept' } },
    { term: 'What counts as confidential', brief: 'Marked, or reasonably understood', clause: '2. Confidential Information', html: 'that is marked confidential<del> or that a reasonable person would understand to be confidential</del><ins>, or, if disclosed orally or visually, is identified as confidential at the time of disclosure and summarised in writing within thirty (30) days</ins>', playbook: 'outside', why: 'Spoken and unmarked information must be covered',
      find: ', or, if disclosed orally or visually, is identified as confidential at the time of disclosure and summarised in writing within thirty (30) days', ours: ' or that a reasonable person would understand to be confidential', suggest: { d: 'keep' }, decision: { d: 'keep' } },
    { term: 'Residuals', brief: 'None', clause: '3. Obligations of Confidentiality', html: '<ins>3.4 Nothing in this Agreement restricts either party from using, for any purpose, the general skills, know-how and experience retained in the unaided memory of its Representatives…</ins>', playbook: 'outside', why: 'It would let them reuse what they see of our architecture',
      find: '3.4 Nothing in this Agreement restricts either party from using, for any purpose, the general skills, know-how and experience retained in the unaided memory of its Representatives, provided that this clause does not permit the disclosure of Confidential Information.', ours: '', suggest: { d: 'keep' }, decision: { d: 'keep' } },
    { term: 'Confidentiality period', brief: 'Two years', clause: '6. Term', html: 'continue for <del>three (3) years</del><ins>two (2) years</ins> from the date of each disclosure', playbook: 'fallback', why: 'Two years is our fallback',
      find: 'two (2) years', ours: 'three (3) years', suggest: { d: 'accept' }, decision: { d: 'accept' } },
    { term: 'Notices and language', brief: 'Email allowed; English prevails', clause: '11. General', html: 'to the address of the other party set out above<ins>, or by email to legal@lumen.io (for Lumen) and legal@gulfsystems.ae (for Gulf Systems)</ins> … <ins>11.5 This Agreement is made in the English language…</ins>', playbook: 'within',
      find: null, ours: null, suggest: { d: 'accept' }, decision: null },
    { term: 'Governing law', brief: 'DIFC, if Roger agrees', clause: '12. Governing Law and Jurisdiction', html: 'governed by the laws of <del>England and Wales</del><ins>the Dubai International Financial Centre</ins> … The <del>courts of England and Wales</del><ins>Courts of the Dubai International Financial Centre</ins> have exclusive jurisdiction', playbook: 'outside', why: 'Our NDA playbook takes UK law only', signoff: 'Roger Bennett',
      flag: 'A DIFC Courts judgment is enforced onshore in Dubai far more easily than an English one.', find: 'the Dubai International Financial Centre', ours: 'England and Wales', suggest: { d: 'signoff' }, decision: { d: 'signoff' } },
  ] }],
};

/* comment threads from the Word plugin, in the MX_WCOMMENTS shape:
   [doc, v, clause, quote, by, @mention, text, days ago, status, thread [[who, text, days ago, sys?]], draft, assignee]
   every quote is text that appears in that version, so it can be marked */
MX_WCOMMENTS['gulf-nda'] = [
  ['d1', 3, '12. Governing Law and Jurisdiction', 'Dubai International Financial Centre', 'Grace Coleman', 'Roger Bennett',
    'Layla wants DIFC law and the DIFC Courts. It is common law, in English, and a DIFC judgment is enforced onshore in Dubai far more easily than an English one. I would accept, but the playbook says UK law only, so it needs your sign-off.', 1.6, 'open',
    [['Grace Coleman', 'assigned this to Roger Bennett', 1.6, true]], null, 'Roger Bennett'],
  ['d1', 3, '12. Governing Law and Jurisdiction', 'Courts of the Dubai International Financial Centre', 'Layla Mansour', 'Grace Coleman',
    'Can you confirm today whether DIFC works for you? Omar wants this signed before the team travels on the 21st.', 0.3, 'open', [], null],
  ['d1', 3, '2. Confidential Information', 'summarised in writing within thirty (30) days', 'Grace Coleman', 'Priya Shah',
    'Most of the workshop is demos and whiteboard. Will anyone write a summary within 30 days? If not, this wording leaves the whole session unprotected.', 1.8, 'replied',
    [['Priya Shah', 'No one will. Leo’s team is demoing the connectors live and nobody takes minutes. Please keep our wording.', 1.7]], null],
  ['d1', 3, '3. Obligations of Confidentiality', 'retained in the unaided memory of its Representatives', 'Grace Coleman', 'Roger Bennett',
    'Layla has added a residuals clause. Their engineers will see our connector architecture at the workshop. I want to strike it, not narrow it. Agree?', 1.7, 'closed',
    [['Roger Bennett', 'Strike it. We never give residuals where architecture or code is shown.', 1.2], ['Grace Coleman', 'Marked as keep ours in the review.', 1.1]], null],
  ['d1', 3, '6. Term', 'two (2) years', 'Layla Mansour', 'Grace Coleman',
    'Two years is our group standard for pre-contract NDAs. Anything longer has to go to our board.', 1.9, 'replied',
    [['Grace Coleman', 'Two years works for us, provided the source code and trade secret carve-out stays as drafted.', 1.5]], null],
  ['d1', 3, '1. Definitions', 'its Affiliates and', 'Elena Petrova', 'Grace Coleman',
    'This will be for Gulf Systems Arabia, their Riyadh company. Fine, but check they stay responsible for what their affiliates do.', 1.3, 'closed',
    [['Grace Coleman', 'They do. Clause 4.2 makes each party responsible for its Representatives, and affiliates are now Representatives.', 1.2]], null],
  ['d1', 3, '11. General', 'the English text prevails', 'Roger Bennett', 'Grace Coleman',
    'If we end up in the DIFC Courts this does little, but it does no harm. Happy to leave it in unless you see a reason not to.', 0.4, 'open', [], null],
  ['d2', 2, 'Part C: Who will attend', 'Gulf Systems Arabia Company', 'Priya Shah', 'Grace Coleman',
    'Two of their people are from the Riyadh company, not Gulf Systems LLC. Does the NDA cover them, or do they sign separately?', 2.8, 'closed',
    [['Grace Coleman', 'Their redline adds affiliates to Representatives and we are accepting it, so they are covered. No separate signature.', 1.9], ['Priya Shah', 'Great, I will tell Omar.', 1.8]], null],
];

function mxGulfNda(r) {
  const { at, due } = mxDemoKit();
  r.documents = mxGulfNdaDocs();
  const d1 = (v) => ({ doc: 'd1', v }), sc = (v) => ({ doc: 'd2', v });
  const kept = mxDemoKeep(r);
  r.activity = [
    ...kept,
    { who: 'Clavia', ev: 'clavia', what: 'matched this to the Mutual NDA template', when: at(6, 9, 14) },
    { who: 'Clavia', ev: 'clavia', what: 'drafted v1 from the Mutual NDA template, with four blanks for legal', when: at(6, 9, 15), ref: d1(1) },
    { who: 'Roger Bennett', ev: 'assign', what: 'assigned this to Grace Coleman', when: at(6, 9, 40) },
    { who: 'Grace Coleman', ev: 'status', what: 'moved this to Drafting', when: at(6, 10, 5) },
    { who: 'Grace Coleman', kind: 'reply', to: 'Priya', via: 'outlook', what: 'Picking this up. Three things for the draft: what will each side show at the workshop, who is coming from Gulf Systems, and is there any reason not to use English law? Omar signs for them, I take it.', when: at(6, 10, 20), ref: d1(1) },
    { who: 'Priya Shah', kind: 'reply', via: 'outlook', what: 'Our roadmap, the connector architecture and partner pricing; their pipeline and integration plans. Omar will send names. English law is what we used on the reseller paper, so let’s keep it. And yes, Omar signs.', when: at(6, 11, 2) },
    { who: 'Grace Coleman', ev: 'version', what: 'uploaded v2 of Gulf Systems — Mutual NDA', when: at(5, 9, 30), ref: d1(2) },
    { who: 'Grace Coleman', kind: 'note', what: 'Purpose, workshop date and a three-year term filled in. Roger signs for us, Omar Haddad for Gulf Systems.', when: at(5, 9, 31), ref: d1(2) },
    { who: 'Grace Coleman', ev: 'email', what: 'emailed v2 to Omar Haddad and Layla Mansour', when: at(5, 9, 48), ref: d1(2) },
    { who: 'Grace Coleman', ev: 'status', what: 'moved this to Negotiation', when: at(5, 9, 49) },
    { who: 'Priya Shah', ev: 'version', what: 'uploaded Schedule 1 — Workshop Attendees.docx', when: at(4, 15, 10), ref: sc(1) },
    { who: 'Priya Shah', ev: 'version', what: 'uploaded v2 of Schedule 1 — Workshop Attendees', when: at(3, 10, 30), ref: sc(2) },
    { who: 'Priya Shah', kind: 'note', what: 'Omar sent their attendee list. Two of them are from Gulf Systems Arabia in Riyadh.', when: at(3, 10, 31), ref: sc(2) },
    { who: 'Grace Coleman', ev: 'version', what: 'uploaded v3 of Gulf Systems — Mutual NDA', when: at(2, 14, 20), ref: d1(3) },
    { who: 'Grace Coleman', kind: 'note', what: 'Gulf Systems’ markup, from Layla Mansour, their legal counsel.', when: at(2, 14, 21), ref: d1(3) },
    { who: 'Clavia', ev: 'clavia', what: 'compared v2 and v3 of Gulf Systems — Mutual NDA', when: at(2, 14, 22), ref: { doc: 'd3', v: 1 } },
    { who: 'Clavia', ev: 'clavia', what: 'read Gulf Systems’ redline against the Mutual NDA playbook: 6 changes, 3 of them outside it', when: at(2, 14, 23), ref: d1(3) },
    { who: 'Grace Coleman', kind: 'note', what: 'Three that matter: spoken information only counts if it is summarised in writing within 30 days, a new residuals clause, and DIFC law and courts. Two years and the affiliates change are fine. I would keep our wording on the first two and take DIFC, with Roger’s sign-off.', when: at(2, 16, 45), ref: d1(3) },
    { who: 'Grace Coleman', ev: 'assign', what: 'asked Roger Bennett to sign off on DIFC law', when: at(1, 9, 50), ref: d1(3) },
    { who: 'Roger Bennett', kind: 'note', what: 'Strike the residuals clause, no question. I am minded to agree DIFC; I will confirm once I have checked enforcement with our Dubai counsel.', when: at(1, 10, 15), ref: d1(3) },
    { who: 'Priya Shah', kind: 'reply', via: 'outlook', what: 'Omar asks whether we can sign by Monday. Their team flies in on the 21st.', when: at(0, 8, 50) },
  ];
  r.people = [
    { name: 'Priya Shah', role: 'Submitter · Partnerships', side: 'business', email: 'priya.shah@clavia.app' },
    { name: 'Roger Bennett', role: 'General Counsel', side: 'legal', email: 'roger.bennett@clavia.app' },
    { name: 'Leo Park', role: 'Head of Product', side: 'business', email: 'leo.park@clavia.app' },
    { name: 'Omar Haddad', role: 'Managing Director', side: 'counterparty', email: 'omar@gulfsystems.ae' },
    { name: 'Layla Mansour', role: 'Legal Counsel', side: 'counterparty', email: 'layla.mansour@gulfsystems.ae' },
  ];
  r.rounds = { v: 1, docs: JSON.parse(JSON.stringify(MX_ROUNDS['Gulf Systems LLC — NDA'])) };
  Object.assign(r, { attorney: 'Grace Coleman', stage: 2, status: 'progress', triaged: true, urgent: true, due: due(3),
    address: 'Office 1204, Al Habtoor Tower, Dubai, United Arab Emirates', law: 'England and Wales',
    purpose: 'Evaluating a channel partnership to resell the Analytics Platform in the UAE and Saudi Arabia',
    created: at(6, 9, 12), updated: at(0, 8, 50) });
}

/* ── 2. the authorised reseller letter for Al Noor Technology ───────── */
function mxGulfLetterDocs() {
  const { P, H, T, M, ins, blank, sw, at, compare } = mxDemoKit();
  const letter = (o) => [
    T('Letter of Authorisation'),
    M('LUMEN ANALYTICS LTD · 1 FINSBURY AVENUE, LONDON EC2M 2PF · REGISTERED IN ENGLAND AND WALES NO. 09876543'),
    P('Our ref: LA/GS/2026/014'),
    P(`Date: ${blank('Date of issue')}`),
    P('Al Noor Technology Company'),
    P(`Attn: ${o.attn}`),
    P(o.addr),
    P('Copy: Gulf Systems LLC, Office 1204, Al Habtoor Tower, Dubai, United Arab Emirates (Attn: Omar Haddad, Managing Director)'),
    P(`Dear ${o.dear},`),
    H('1. About Lumen'),
    P('Lumen Analytics Ltd ("Lumen") develops and supplies the Lumen Analytics Platform, a hosted data analytics service (the "Platform"). Lumen owns all intellectual property rights in the Platform, its documentation, and the Lumen name and logo.'),
    H('2. Our appointment of Gulf Systems'),
    P(`Lumen has appointed Gulf Systems LLC, a limited liability company registered in the Emirate of Dubai under licence number 784512 ("Gulf Systems"), as a non-exclusive reseller of the Platform in the United Arab Emirates and the Kingdom of Saudi Arabia under a Reseller Agreement dated ${blank('Reseller Agreement date')} (the "Reseller Agreement").`),
    H('3. Authorisation'),
    P(`At Gulf Systems’ request, Lumen confirms that Al Noor Technology Company, a limited liability company registered in the Kingdom of Saudi Arabia under commercial registration number ${o.cr} ("Al Noor"), is authorised, as a sub-reseller appointed by Gulf Systems, to market, promote and resell subscriptions to the Platform to customers in the Kingdom of Saudi Arabia${o.tenders}.`),
    ...(o.consent ? [
      P('For the purposes of the Reseller Agreement, this letter is Lumen’s written consent to Gulf Systems appointing Al Noor as its sub-reseller in the Kingdom of Saudi Arabia.'),
      P('The products Al Noor may resell, and the customers excluded from this authorisation, are set out in the Schedule to this letter.')] : []),
    H('4. Scope of this letter'),
    P('This authorisation is non-exclusive. Lumen may appoint other resellers in the Kingdom of Saudi Arabia, and may sell subscriptions to the Platform directly to any customer.'),
    P('Al Noor buys subscriptions from Gulf Systems and not from Lumen. Each customer must accept Lumen’s standard customer terms before it is given access to the Platform, and Al Noor may not make any commitment to a customer about the Platform that goes beyond those terms or the Platform documentation.'),
    P('Al Noor is not Lumen’s agent, partner or employee, and has no authority to bind Lumen or to make any representation on Lumen’s behalf. It may use the Lumen name and logo only to promote the Platform, and only in accordance with Lumen’s brand guidelines.'),
    P('Al Noor must comply with all laws that apply to its activities under this letter, including anti-bribery, sanctions and export control laws.'),
    H('5. Validity'),
    P(o.validity),
    P('When this letter ends, Al Noor must stop presenting itself as authorised to resell the Platform. Subscriptions already sold to customers continue for their term in accordance with Lumen’s customer terms.'),
    H('6. Verification'),
    P(`Any customer or public authority may confirm the status of this authorisation by writing to partners@lumen.io and quoting the reference above.${o.apostille}`),
    H('7. Governing law'),
    P('This letter, and any dispute arising out of or in connection with it, is governed by the laws of England and Wales.'),
    P('Yours faithfully,'),
    P(o.sign),
    P('Acknowledged for and on behalf of Gulf Systems LLC by Omar Haddad, Managing Director ………………………… Date ……………'),
  ];
  const base = { attn: 'Mr Faisal Al-Qahtani, General Manager', dear: 'Mr Al-Qahtani',
    addr: 'Building 3125, King Fahd Road, Al Olaya District, Riyadh 12214, Kingdom of Saudi Arabia',
    cr: '1010785412', tenders: '', consent: true, apostille: '',
    validity: 'This letter takes effect on the date above and remains valid for twelve (12) months, unless it ends earlier under this paragraph. It ends automatically if the Reseller Agreement ends or if Gulf Systems ends its appointment of Al Noor, and Lumen may revoke it at any time by giving thirty (30) days’ written notice to Al Noor and Gulf Systems.',
    sign: 'Roger Bennett, General Counsel, for and on behalf of Lumen Analytics Ltd ………………………… ' };
  const v1 = letter({ ...base, attn: blank('Addressee'), dear: 'Sir or Madam', addr: blank('Distributor address'), cr: blank('Commercial registration no.'), consent: false,
    validity: `This letter takes effect on the date above and remains valid until ${blank('Expiry date')}, unless Lumen revokes it earlier by written notice.`,
    sign: `${blank('Signatory')}, for and on behalf of Lumen Analytics Ltd ………………………… ` });
  const v2 = letter(base);
  const v3 = letter({ ...base,
    tenders: ins(', including through public tenders and government procurement portals in its own name'),
    validity: base.validity.replace('remains valid for twelve (12) months', `remains valid ${sw('for twelve (12) months', 'until 31 December 2027')}`),
    apostille: ins(' On Al Noor’s reasonable request and at its cost, Lumen will provide a signed original of this letter bearing an apostille, for use in tenders.') });
  const cr = [
    T('Commercial Registration — Certified English Translation'),
    M('KINGDOM OF SAUDI ARABIA · MINISTRY OF COMMERCE · TRANSLATED FROM THE ARABIC ORIGINAL'),
    H('Company'),
    P('Name: Al Noor Technology Company (شركة النور للتقنية)'),
    P('Legal form: Limited liability company'),
    P('Commercial registration no.: 1010785412'),
    P('Unified national number: 7004857321'),
    P('Date of registration: 3 May 2015'),
    P('Capital: SAR 2,000,000 (two million Saudi riyals), fully paid'),
    P('VAT registration no.: 310478596300003'),
    H('Head office'),
    P('Building 3125, King Fahd Road, Al Olaya District, Riyadh 12214, additional no. 6890, Kingdom of Saudi Arabia'),
    H('Activities'),
    P('Wholesale and retail sale of computers, peripherals and software.'),
    P('Installation, configuration and maintenance of software and network systems.'),
    P('Computer systems integration and related technical consultancy.'),
    H('Managers and partners'),
    P('General Manager: Faisal Al-Qahtani, with full authority to represent the company and sign on its behalf.'),
    P('Partners: Faisal Al-Qahtani (60%); Saad Al-Dosari (40%).'),
    H('Chamber of Commerce'),
    P('Member of the Riyadh Chamber of Commerce, membership no. 284117, valid until 2 March 2027.'),
    H('Status'),
    P('Status: Active'),
    P('Annual confirmation due: 22 March 2027'),
    H('Translator’s certificate'),
    P('We certify that this is a true and complete English translation of the Arabic commercial registration extract issued by the Ministry of Commerce and presented to us on 7 October 2026. Dar Al Bayan Legal Translation, Riyadh, licence no. 41/2208.'),
  ];
  const schedule = [
    T('Territory Schedule'),
    M('SCHEDULE TO THE LETTER OF AUTHORISATION FOR AL NOOR TECHNOLOGY COMPANY · REF. LA/GS/2026/014'),
    H('Part A: Territory'),
    P('The Kingdom of Saudi Arabia. Al Noor may not market or resell subscriptions to the Platform outside the Kingdom, or to a customer it knows intends to use the Platform mainly outside the Kingdom, without Lumen’s prior written consent.'),
    H('Part B: Products'),
    P('1. Lumen Analytics Platform, Standard edition.'),
    P('2. Lumen Analytics Platform, Enterprise edition.'),
    P('3. Data Connectors add-on.'),
    P('4. Premium Support, delivered by Gulf Systems as first line with Lumen as second line.'),
    P('Not included: the Grid Analytics module, and any professional services delivered by Lumen. Al Noor should refer requests for either to Gulf Systems.'),
    H('Part C: How Al Noor may sell'),
    P('Directly to customers in the private sector, and through public tenders and government procurement in its own name. Al Noor may not appoint resellers of its own.'),
    P('Prices to customers are for Al Noor to set. Lumen’s published list prices and Gulf Systems’ discount are not to be disclosed to customers.'),
    H('Part D: Excluded customers'),
    P('Any customer that has a direct subscription with Lumen, or is in a pilot with Lumen, on the date of this letter. Lumen Partnerships keeps the list and will give it to Gulf Systems in confidence; Al Noor will receive it from Gulf Systems.'),
    H('Part E: Contacts'),
    P('Lumen: Priya Shah, Head of Partnerships, partners@lumen.io.'),
    P('Gulf Systems: Omar Haddad, Managing Director, omar@gulfsystems.ae.'),
    P('Al Noor: Faisal Al-Qahtani, General Manager.'),
  ];
  const d1 = { id: 'd1', title: 'Al Noor — Reseller Letter.docx', versions: [
    { name: 'First draft', by: 'Clavia', when: at(6, 9, 16), file: 'Al Noor — Reseller Letter.docx', blocks: v1, note: 'Drafted from the reseller terms in RQ-1044; blanks for the distributor’s details' },
    { name: 'Legal draft', by: 'Matt Rivera', when: at(3, 10, 15), file: 'Al Noor — Reseller Letter v2.docx', blocks: v2, note: 'Details from the commercial registration; tied to the Reseller Agreement' },
    { name: 'Priya’s edits', by: 'Priya Shah', when: at(2, 17, 20), file: 'Al Noor — Reseller Letter v3 (PS edits).docx', blocks: v3, note: 'Tenders, an end date of 31 December 2027, and an apostilled original' },
  ] };
  const d2 = { id: 'd2', title: 'Al Noor — Commercial Registration.pdf', versions: [
    { name: 'From Gulf Systems', by: 'Priya Shah', when: at(4, 16, 42), file: 'Al Noor — Commercial Registration.pdf', blocks: cr, note: 'Sent by Omar Haddad' } ] };
  const d3 = { id: 'd3', title: 'Territory Schedule.docx', versions: [
    { name: 'Legal draft', by: 'Matt Rivera', when: at(3, 11, 5), file: 'Territory Schedule.docx', blocks: schedule } ] };
  const docs = [d1, d2, d3];
  const cmp = compare(d1, 'd4', 2, 3, at(2, 17, 20));
  if (cmp) docs.push(cmp);
  return docs;
}

MX_WCOMMENTS['gulf-letter'] = [
  ['d1', 1, '2. Our appointment of Gulf Systems', 'Reseller Agreement dated', 'Matt Rivera', 'Roger Bennett',
    'The reseller agreement in RQ-1044 is not signed yet. Do we issue this now, or hold it until RQ-1044 is signed?', 5.0, 'closed',
    [['Roger Bennett', 'Hold it. Date it the day RQ-1044 is signed and send the two together. It must also end when the Reseller Agreement ends.', 4.9],
     ['Matt Rivera', 'Done in v2. Paragraph 5 ties it to the Reseller Agreement, and the date stays blank until signing.', 3.0]], null],
  ['d1', 3, '5. Validity', 'until 31 December 2027', 'Matt Rivera', 'Roger Bennett',
    'Priya moved the end date from 12 months to 31 December 2027 so it covers next year’s tender round. The Reseller Agreement runs 24 months, so this sits inside it, and it still ends early if that does. OK with you?', 0.7, 'open', [], null],
  ['d1', 3, '3. Authorisation', 'including through public tenders and government procurement portals in its own name', 'Matt Rivera', 'Priya Shah',
    'Do Al Noor bid in their own name, or do the tender boards want us as the bidder? If it is us, this letter is not enough.', 1.8, 'replied',
    [['Priya Shah', 'Their own name. The boards only want proof that the vendor has authorised them, and this letter is what they will attach.', 1.6]], null],
  ['d1', 3, '6. Verification', 'bearing an apostille', 'Roger Bennett', 'Matt Rivera',
    'The original has to be notarised before it can be apostilled, and our notary needs a few days. Can you book it for the day RQ-1044 is signed?', 0.5, 'open',
    [['Roger Bennett', 'assigned this to Matt Rivera', 0.5, true]], null, 'Matt Rivera'],
  ['d1', 3, '4. Scope of this letter', 'This authorisation is non-exclusive.', 'Priya Shah', 'Matt Rivera',
    'Omar asked whether we can call Al Noor our exclusive partner in Riyadh. I said I would check.', 1.4, 'closed',
    [['Matt Rivera', 'No. Gulf Systems is non-exclusive, so Al Noor cannot be exclusive either. The sentence stays.', 1.3], ['Priya Shah', 'Told Omar. He expected that.', 1.1]], null],
  ['d2', 1, 'Status', 'Annual confirmation due: 22 March 2027', 'Matt Rivera', 'Priya Shah',
    'Their annual CR confirmation falls due before this letter ends. Can you ask Omar for the confirmed extract next March so we keep it on file?', 3.6, 'open',
    [['Matt Rivera', 'assigned this to Priya Shah', 3.6, true]], null, 'Priya Shah'],
  ['d3', 1, 'Part D: Excluded customers', 'a direct subscription with Lumen', 'Daniel Okafor', 'Priya Shah',
    'We have two direct pilots in Riyadh. If Al Noor never sees the excluded list they will end up bidding against us.', 2.6, 'replied',
    [['Priya Shah', 'The list goes to Omar once the Gulf Systems NDA is signed, so it is covered, and he passes it to Al Noor.', 2.4]], null],
];

function mxGulfLetter(r) {
  const { at, due } = mxDemoKit();
  r.documents = mxGulfLetterDocs();
  const d1 = (v) => ({ doc: 'd1', v });
  const kept = mxDemoKeep(r);
  r.activity = [
    ...kept,
    { who: 'Clavia', ev: 'clavia', what: 'found no template for an authorisation letter, and drafted v1 from the reseller terms in RQ-1044', when: at(6, 9, 16), ref: d1(1) },
    { who: 'Roger Bennett', ev: 'assign', what: 'assigned this to Matt Rivera', when: at(5, 11, 30) },
    { who: 'Matt Rivera', ev: 'status', what: 'moved this to Drafting', when: at(5, 11, 55) },
    { who: 'Matt Rivera', kind: 'reply', to: 'Priya', via: 'outlook', what: 'I have a draft. To finish it I need Al Noor’s full legal name and commercial registration, who the letter goes to, and what they will sell: everything, or particular products?', when: at(5, 12, 10), ref: d1(1) },
    { who: 'Priya Shah', kind: 'reply', via: 'outlook', what: 'Omar sent their CR this afternoon, attached. The letter goes to Faisal Al-Qahtani, their GM. Standard and Enterprise, connectors and support. They want to bid in public tenders too.', when: at(4, 16, 40) },
    { who: 'Priya Shah', ev: 'version', what: 'uploaded Al Noor — Commercial Registration.pdf', when: at(4, 16, 42), ref: { doc: 'd2', v: 1 } },
    { who: 'Clavia', ev: 'clavia', what: 'read the commercial registration: Al Noor Technology Company, CR 1010785412, active, Faisal Al-Qahtani signs for it', when: at(4, 16, 44), ref: { doc: 'd2', v: 1 } },
    { who: 'Matt Rivera', ev: 'version', what: 'uploaded v2 of Al Noor — Reseller Letter', when: at(3, 10, 15), ref: d1(2) },
    { who: 'Matt Rivera', kind: 'note', what: 'Details filled from the CR. As Roger asked, it is tied to the Reseller Agreement: it ends when that does, and stays undated until RQ-1044 is signed.', when: at(3, 10, 16), ref: d1(2) },
    { who: 'Matt Rivera', ev: 'version', what: 'uploaded Territory Schedule.docx', when: at(3, 11, 5), ref: { doc: 'd3', v: 1 } },
    { who: 'Matt Rivera', ev: 'email', what: 'emailed v2 and the Schedule to Priya Shah for comments', when: at(3, 11, 10), ref: d1(2) },
    { who: 'Priya Shah', ev: 'version', what: 'uploaded v3 of Al Noor — Reseller Letter', when: at(2, 17, 20), ref: d1(3) },
    { who: 'Priya Shah', kind: 'note', what: 'My edits: tenders, a fixed end date so it covers the 2027 tender round, and an apostilled original, which the tender boards ask for.', when: at(2, 17, 21), ref: d1(3) },
    { who: 'Clavia', ev: 'clavia', what: 'compared v2 and v3 of Al Noor — Reseller Letter', when: at(2, 17, 22), ref: { doc: 'd4', v: 1 } },
    { who: 'Roger Bennett', kind: 'note', what: 'Fine to issue once RQ-1044 is signed. I will sign the original.', when: at(1, 9, 30), ref: d1(3) },
    { who: 'Priya Shah', kind: 'reply', via: 'outlook', what: 'Omar says Al Noor’s first tender closes on 12 November, so they need the apostilled letter before then.', when: at(0, 9, 5) },
  ];
  r.people = [
    { name: 'Priya Shah', role: 'Submitter · Partnerships', side: 'business', email: 'priya.shah@clavia.app' },
    { name: 'Roger Bennett', role: 'General Counsel · Signs the letter', side: 'legal', email: 'roger.bennett@clavia.app' },
    { name: 'Daniel Okafor', role: 'Account Executive', side: 'business', email: 'daniel.okafor@clavia.app' },
    { name: 'Omar Haddad', role: 'Managing Director, Gulf Systems', side: 'counterparty', email: 'omar@gulfsystems.ae' },
    { name: 'Faisal Al-Qahtani', role: 'General Manager, Al Noor Technology', side: 'counterparty', email: 'f.alqahtani@alnoor-tech.com.sa' },
  ];
  r.rounds = { v: 1, docs: {} };
  /* there is no template for this letter: keep the Reseller Agreement template from being offered */
  Object.assign(r, { attorney: 'Matt Rivera', stage: 1, status: 'progress', triaged: true, urgent: false, due: due(6), template: 'authorisation-letter',
    address: 'Office 1204, Al Habtoor Tower, Dubai, United Arab Emirates', law: 'England and Wales',
    purpose: 'Authorising Al Noor Technology to resell the Analytics Platform in Saudi Arabia',
    created: at(6, 9, 12), updated: at(0, 9, 5) });
}

/* the email and the split, as mxSplitSeed wrote them, moved to when the story starts */
function mxDemoKeep(r) {
  const { at } = mxDemoKit();
  const old = r.activity || [];
  const sub = old.find(a => a.ev === 'submit'), split = old.find(a => a.links);
  return [
    sub ? { ...sub, when: at(6, 9, 12) } : { who: 'Priya Shah', ev: 'submit', what: 'emailed legal@lumen.io', via: 'outlook', when: at(6, 9, 12) },
    ...(split ? [{ ...split, when: at(6, 9, 13) }] : []),
  ];
}

/* ── Brightwell, at full length for browsers that seeded it shorter ──
   Only a version that is still as it was seeded is replaced: every block
   it has must still be in the new text, so nothing anyone wrote is lost. */
function mxShowcaseRefresh(r) {
  if (typeof mxShowcase !== 'function' || !r?.documents) return;
  const fresh = mxShowcase(r.id);
  for (const nd of fresh.documents) {
    const od = r.documents.find(x => x.id === nd.id); if (!od) continue;
    nd.versions.forEach((nv, i) => {
      const ov = od.versions[i]; if (!ov || ov.name !== nv.name || ov.by !== nv.by || !Array.isArray(ov.blocks)) return;
      const seeded = ov.blocks.every(b => nv.blocks.some(x => x.t === b.t && String(x.v).startsWith(String(b.v))));
      if (seeded) { ov.blocks = nv.blocks; if (nv.cmp) ov.cmp = nv.cmp; }
    });
  }
}

/* ── Brightwell's v5 (20 Oct), for browsers that seeded Brightwell before it existed ──
   Their second redline, its two activity lines and its playbook round are added once.
   Only when the MSA still ends at our v4: a version someone uploaded is never stepped on. */
function mxShowcaseV5TopUp(r) {
  const d1 = r?.documents?.find(x => x.id === 'd1');
  if (!d1 || d1.versions.length !== 4 || d1.versions[3].name !== 'Our response') return;
  const v5 = mxShowcase(r.id).documents.find(x => x.id === 'd1')?.versions[4]; if (!v5) return;
  const now = Date.now(), at = (mm) => new Date(now - (45 - mm) * 6e4).toISOString();
  d1.versions.push({ ...v5, when: at(0) });
  r.activity = [...(r.activity || []), ...mxShowcaseV5(at)];
  if (r.rounds?.docs?.d1 && !r.rounds.docs.d1.some(x => x.v === 5)) r.rounds.docs.d1.push(JSON.parse(JSON.stringify(MX_ROUND_V5)));
  r.updated = at(2);
}

/* ── v5 read again (20 Oct, later): the data cap became a long rewrite ──
   Browsers that already had v5 get the new text and its playbook round. Answers given to its
   deviations are cleared with the comments they made, since they were made against the old text. */
function mxShowcaseV5Refresh(r) {
  const d1 = r?.documents?.find(x => x.id === 'd1'), v5 = d1?.versions[4];
  if (!v5 || v5.name !== 'Brightwell’s second redline' || d1.versions.length !== 5) return;
  const fresh = mxShowcase(r.id).documents.find(x => x.id === 'd1')?.versions[4]; if (!fresh) return;
  v5.blocks = fresh.blocks; delete v5.edited;
  const made = new Set(Object.values(r.devDec || {}).map(k => k.cid).filter(Boolean));
  if (r.wcomments?.items) r.wcomments.items = r.wcomments.items.filter(c => !made.has(c.id));
  delete r.devDec;
  const list = r.rounds?.docs?.d1; if (list) { const i = list.findIndex(x => x.v === 5); if (i >= 0) list[i] = JSON.parse(JSON.stringify(MX_ROUND_V5)); }
}

/* run from mxIntake each time: the comment threads are registered under each request's number, then
   (once per browser, behind d.demoV: 2 since the mentions were fixed) the two Gulf Systems requests are told in full */
function mxDemoSeed(d) {
  const list = d.intake || [];
  const find = (k) => list.find(q => q.demo === k) || list.find(q => q.title === MX_GULF_TITLES[k]);
  const nda = find('gulf-nda'), letter = find('gulf-letter');
  if (nda) MX_WCOMMENTS[nda.id] = MX_WCOMMENTS['gulf-nda'];
  if (letter) MX_WCOMMENTS[letter.id] = MX_WCOMMENTS['gulf-letter'];
  if (!d.devV) { mxShowcaseV5TopUp(list.find(q => q.id === d.showcaseId)); d.devV = 1; save(); }
  if (d.devV === 1) { mxShowcaseV5Refresh(list.find(q => q.id === d.showcaseId)); d.devV = 2; save(); }
  if (d.demoV === 3) return;
  for (const [r, k, fill] of [[nda, 'gulf-nda', mxGulfNda], [letter, 'gulf-letter', mxGulfLetter]]) {
    if (!r) continue;
    fill(r); r.demo = k;
    /* read again from the new story: comments, sign-off and the first pass */
    delete r.wcomments; delete r.sign; delete r.issues; delete r.handling; delete r.waitingOn;
  }
  mxShowcaseRefresh(list.find(q => q.id === d.showcaseId));
  d.demoV = 3; save();
}
