// Run: node test/scoring.test.js   (no dependencies)
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const S = require('../scoring.js');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../data.js'), 'utf8'), ctx);
const D = ctx.window.CC_DATA;

const blank = () => { const p = {}; D.activities.forEach(a => p[a.id] = { desired: null, importance: 2, constraint: null }); return p; };
const rank = (p, s) => S.rankRoles(D.roles, p, D.activities, s);
const row = (rows, id) => rows.find(r => r.roleId === id);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

t('data integrity: every role has all attributes 1–5', () => {
  D.roles.forEach(r => D.activities.forEach(a => assert(r.attrs[a.id] >= 1 && r.attrs[a.id] <= 5, r.id + '.' + a.id)));
});
t('data integrity: cross-references resolve', () => {
  const sk = new Set(D.skills.map(s => s.id)), ro = new Set(D.roles.map(r => r.id));
  D.roles.forEach(r => r.req.concat(r.help).forEach(s => assert(sk.has(s), 'skill ' + s)));
  D.projects.forEach(p => { p.careers.forEach(c => assert(ro.has(c), c)); p.skills.forEach(s => assert(sk.has(s), s)); });
  D.learning.forEach(l => { l.careers.forEach(c => assert(ro.has(c), c)); l.skills.forEach(s => assert(sk.has(s), s)); });
});
t('all unknown → baseline only, flagged low confidence', () => {
  const rows = rank(blank());
  rows.forEach(r => { assert(r.usedBaselineOnly); assert.equal(r.confidence, 'low'); });
  // neutral public baseline: no role is favoured before the user answers anything
  rows.forEach(r => assert.equal(r.tier, 'possible'));
});
t('all neutral (3) gives no conflicts and no NaN', () => {
  const p = blank(); Object.values(p).forEach(x => x.desired = 3);
  rank(p).forEach(r => { assert(!Number.isNaN(r.score)); assert.notEqual(r.tier, 'conflict'); });
});
t('lowering coding preference lowers coding-heavy role, raises none by penalising skill', () => {
  const hi = blank(); hi.coding.desired = 5;
  const lo = blank(); lo.coding.desired = 1;
  assert(row(rank(hi), 'fintechRisk').score > row(rank(lo), 'fintechRisk').score);
  assert(row(rank(lo), 'fpa').score >= row(rank(hi), 'fpa').score);
});
t('hard avoid coding → coding-heavy role conflicts and sinks to bottom', () => {
  const p = blank(); p.coding.desired = 1; p.coding.constraint = 'avoid';
  const rows = rank(p);
  assert.equal(row(rows, 'fintechRisk').tier, 'conflict');
  assert.equal(rows[rows.length - 1].roleId, 'fintechRisk');
  assert.equal(row(rows, 'credit').tier !== 'conflict', true);
});
t('hard require client interaction flags low-client roles', () => {
  const p = blank(); p.clientInteraction.desired = 5; p.clientInteraction.constraint = 'require';
  assert.equal(row(rank(p), 'invResearch').tier, 'conflict');
  assert.notEqual(row(rank(p), 'mgmtConsult').tier, 'conflict');
});
t('neutral client interaction does not boost sales-heavy role over baseline peers', () => {
  const p = blank(); p.clientInteraction.desired = 3;
  const rows = rank(p);
  assert(row(rows, 'clientSvc').score <= row(rows, 'invConsult').score);
});
t('raising coordination interest lifts operations/program roles', () => {
  const a = blank(); a.coordination.desired = 1;
  const b = blank(); b.coordination.desired = 5;
  assert(row(rank(b), 'productOps').score > row(rank(a), 'productOps').score);
});
t("internal vs customer coordination favour different roles", () => {
  const a = blank(); a.coordination.desired = 5; a.coordExternal.desired = 1;
  const b = blank(); b.coordination.desired = 1; b.coordExternal.desired = 5;
  assert(row(rank(a), "opsCoord").score > row(rank(a), "customerSuccess").score);
  assert(row(rank(b), "customerSuccess").score > row(rank(b), "opsCoord").score);
});
t('importance weights matter', () => {
  const p = blank(); p.coding.desired = 1; p.marketResearch.desired = 5;
  p.coding.importance = 1; p.marketResearch.importance = 1;
  const eq = row(rank(p), 'fintechRisk').score;
  p.coding.importance = 3;
  assert(row(rank(p), 'fintechRisk').score < eq);
});
t('custom activity without role attributes is ignored safely', () => {
  const acts = D.activities.concat([{ id: 'custom1', label: 'Baking' }]);
  const p = blank(); p.custom1 = { desired: 5, importance: 3, constraint: 'avoid' };
  const rows = S.rankRoles(D.roles, p, acts);
  rows.forEach(r => assert(!Number.isNaN(r.score)));
});
t('readiness sort is independent of preference score', () => {
  const rows = rank(blank(), 'readiness');
  assert(rows[0].role.readiness >= rows[rows.length - 1].role.readiness);
});
const EXAMPLE = Object.assign(blank(), {
  coding: { desired: 2, importance: 3, constraint: null },
  dataCleaning: { desired: 1, importance: 2, constraint: null },
  predictiveModeling: { desired: 1, importance: 2, constraint: null },
  marketResearch: { desired: 4, importance: 2, constraint: null },
  markets: { desired: 4, importance: 2, constraint: null }
});
t('example prefs (low coding, likes markets) rank low-coding finance above fintech risk', () => {
  const rows = rank(EXAMPLE);
  assert(rows.findIndex(r => r.roleId === 'fintechRisk') > rows.findIndex(r => r.roleId === 'invResearch'));
});
t('explain never returns a percentage', () => {
  rank(EXAMPLE).forEach(r => assert(!/%/.test(S.explain(r))));
});
t('public data contains no personal details', () => {
  const blob = JSON.stringify(D);
  // Optional, git-ignored list of private terms (one per line) to keep out of public data.
  let terms = [];
  try { terms = require('fs').readFileSync(__dirname + '/private-terms.txt', 'utf8').split('\n').filter(Boolean); } catch (e) {}
  terms.forEach(w => assert(blob.indexOf(w) < 0, 'private term in data.js: ' + w));
  assert(D.leads.length === 0 && D.prefilled === false);
  Object.keys(D.seedPrefs).forEach(k => assert(D.seedPrefs[k].desired === null));
});
console.log('\n' + n + ' tests passed');
