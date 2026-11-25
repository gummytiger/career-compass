// Run: node test/userdata.test.js   (no dependencies)
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const U = require('../userdata.js');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../data.js'), 'utf8'), ctx);
const D = ctx.window.CC_DATA;
const fresh = () => ({
  v: U.SCHEMA, lastBackup: null, searchStage: '', profile: JSON.parse(JSON.stringify(D.profile)), prefilled: false,
  guide: { step: 'discover', q: 0 }, theme: 'classic', prefs: JSON.parse(JSON.stringify(D.seedPrefs)), custom: [], hidden: [], focus: [],
  lensRole: null, skills: {}, projects: {}, currentProject: null, weeklyHours: 5, learning: {}, tasks: {}, apps: [], resumeNotes: '', compare: []
});
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

t('empty or garbage input becomes a clean default state', () => {
  [undefined, null, 5, 'x', [], {}].forEach(x => assert.deepEqual(U.sanitize(x, fresh(), D), fresh()));
});
t('a valid state survives a round trip unchanged', () => {
  const s = fresh();
  s.focus = [D.roles[0].id, D.roles[1].id]; s.prefs.coding = { desired: 2, importance: 3, constraint: 'avoid', source: 'my note' };
  s.skills.excel = { state: 'demonstrated', note: 'note' }; s.projects[D.projects[0].id] = { status: 'inProgress', reflection: { energized: 'a', drained: 'b', learned: 'c' } };
  s.learning[D.learning[0].id] = 'done'; s.apps = [{ employer: 'E', title: 'T', url: 'https://x.test', status: 'Applied', outcome: '', location: '', elig: '', experience: '', coding: '', verified: '', next: '', notes: 'n' }];
  s.tasks.a1 = true; s.lastBackup = '2026-11-24T10:00:00.000Z';
  assert.deepEqual(U.sanitize(JSON.parse(JSON.stringify(s)), fresh(), D), s);
});
t('values are clamped and unknown fields dropped', () => {
  const s = U.sanitize({ theme: 'evil', weeklyHours: 9999, prefs: { coding: { desired: 99, importance: -4, constraint: 'x' } }, extra: 'nope', apps: [{ employer: 5, status: 'Hacked' }], guide: { step: 'zzz', q: -3 } }, fresh(), D);
  assert.equal(s.theme, 'classic'); assert.equal(s.weeklyHours, 60); assert.equal(s.prefs.coding.desired, 5);
  assert.equal(s.prefs.coding.importance, 1); assert.equal(s.prefs.coding.constraint, null);
  assert.equal(s.apps[0].status, 'Saved'); assert.equal(s.apps[0].employer, '5'); assert.equal(s.guide.step, 'discover'); assert.equal(s.guide.q, 0);
  assert.equal('extra' in s, false);
});
t('prototype-pollution keys are ignored', () => {
  const s = U.sanitize(JSON.parse('{"__proto__":{"polluted":1},"prefs":{"__proto__":{"desired":1},"constructor":{"desired":1}},"skills":{"__proto__":{"state":"demonstrated"}}}'), fresh(), D);
  assert.equal(({}).polluted, undefined); assert.equal(Object.keys(s.skills).length, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(s.prefs, 'constructor'), true === false);
});
t('focus and compare only keep roles that still exist, max 3', () => {
  const s = U.sanitize({ focus: ['credit', 'deleted-role', 'fpa', 'strategy', 'productOps'], compare: ['gone'] }, fresh(), D);
  assert.deepEqual(s.focus, ['credit', 'fpa', 'strategy']); assert.deepEqual(s.compare, []);
});
t('answers for items removed in a later update are kept, not erased', () => {
  const s = U.sanitize({ projects: { someRemovedProject: { status: 'completed' } }, learning: { oldTopic: 'done' } }, fresh(), D);
  assert.equal(s.projects.someRemovedProject.status, 'completed'); assert.equal(s.learning.oldTopic, 'done');
});
t('new activities added by an update do not wipe saved answers', () => {
  const old = fresh(); delete old.prefs.coordExternal;
  const saved = { prefs: { coding: { desired: 1, importance: 2, constraint: null, source: '' } } };
  const s = U.sanitize(saved, fresh(), D);
  assert.equal(s.prefs.coding.desired, 1); assert.equal(s.prefs.coordExternal.desired, null);
});
t('old schema-1 data upgrades without losing anything', () => {
  const s = U.sanitize({ v: 1, focus: ['credit'], tasks: { t1c: true }, apps: [] }, fresh(), D);
  assert.equal(s.v, U.SCHEMA); assert.deepEqual(s.focus, ['credit']); assert.equal(s.tasks.t1c, true);
});
t('import: accepts backups and profiles, rejects other files', () => {
  const ok = JSON.stringify(U.envelope(fresh(), 'profile', 'x'));
  assert.equal(U.parseImport(ok, fresh(), D).kind, 'profile');
  assert.equal(U.parseImport(JSON.stringify({ app: 'career-compass', version: 1, state: { focus: ['credit'] } }), fresh(), D).state.focus[0], 'credit'); // original export format
  assert.throws(() => U.parseImport('not json', fresh(), D), /readable/);
  assert.throws(() => U.parseImport('{"app":"other","state":{}}', fresh(), D), /isn’t a Career Compass/);
  assert.throws(() => U.parseImport('x'.repeat(U.MAX_FILE_CHARS + 1), fresh(), D), /too large/);
  assert.throws(() => U.parseImport(JSON.stringify({ app: 'career-compass', schema: 99, state: {} }), fresh(), D), /newer version/);
});
t('mentor summary never contains private text, whatever options are on', () => {
  const s = fresh();
  s.profile = { gradDate: 'SECRET-GRAD', degree: 'SECRET-DEGREE', locations: 'SECRET-LOC', start: 'SECRET-START', workAuth: 'SECRET-AUTH', notes: 'SECRET-PNOTE' };
  s.focus = ['credit']; s.skills.accounting = { state: 'developing', note: 'SECRET-SKILLNOTE' };
  s.prefs.coding = { desired: 1, importance: 2, constraint: null, source: 'SECRET-PREFNOTE' };
  s.projects[D.projects[0].id] = { status: 'inProgress', reflection: { energized: 'SECRET-REFL1', drained: 'SECRET-REFL2', learned: 'SECRET-REFL3' } };
  s.resumeNotes = 'SECRET-RESUME';
  s.apps = [{ employer: 'Acme', title: 'Analyst', url: 'https://secret.example/SECRET-URL', status: 'Applied', location: 'SECRET-APPLOC', elig: '', experience: '', coding: '', verified: '', next: 'SECRET-NEXT', notes: 'SECRET-APPNOTE' }];
  [{}, { includePrefs: true, includeTracker: true }].forEach(o => {
    const text = U.mentorSummary(s, D, o, { planDone: 2, planTotal: 15, answered: 5, totalQuestions: 14 });
    assert(!/SECRET/.test(text), 'leaked: ' + (text.match(/SECRET[-A-Z0-9]*/) || [])[0]);
    assert(/Commercial banking/.test(text) && /1 applied/.test(text) && /2 of 15/.test(text));
  });
  assert(!/Acme/.test(U.mentorSummary(s, D, {}, {})), 'employer names only when opted in');
  assert(/Acme/.test(U.mentorSummary(s, D, { includeTracker: true }, {})));
});
t('shipped code contains no emails, phone numbers or network calls', () => {
  ['app.js', 'data.js', 'scoring.js', 'userdata.js', 'index.html'].forEach(f => {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(src), f + ' contains an email address');
    assert(!/\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/.test(src), f + ' contains a phone number');
    assert(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts/.test(src.replace(/connect-src/g, '')), f + ' makes network calls');
  });
});
t('the self-reported search stage is kept when valid and dropped when not', () => {
  assert.equal(U.sanitize({ searchStage: 'screen' }, fresh(), D).searchStage, 'screen');
  assert.equal(U.sanitize({ searchStage: '<script>' }, fresh(), D).searchStage, '');
});
const mk = (status, outcome) => ({ status, outcome });
t('application outcome is kept when valid and dropped when not', () => {
  const s = U.sanitize({ apps: [{ employer: 'A', title: 'B', status: 'Closed', outcome: 'auto' }, { employer: 'C', title: 'D', status: 'Closed', outcome: 'hacked' }] }, fresh(), D);
  assert.equal(s.apps[0].outcome, 'auto'); assert.equal(s.apps[1].outcome, '');
});
t('a schema-2 file upgrades: applications get an empty outcome', () => {
  const s = U.sanitize({ v: 2, apps: [{ employer: 'A', title: 'B', status: 'Applied' }] }, fresh(), D);
  assert.equal(s.v, U.SCHEMA); assert.equal(s.apps[0].outcome, '');
});
t('funnel: fewer than 8 applications is "too early", never a verdict', () => {
  assert.equal(U.funnel([]).stage, 'tooEarly');
  assert.equal(U.funnel(Array(7).fill(mk('Closed', 'auto'))).stage, 'tooEarly');
});
t('funnel: Saved and To verify are not counted as applied', () => {
  const f = U.funnel([mk('Saved'), mk('To verify'), mk('Applied')]);
  assert.equal(f.applied, 1); assert.equal(f.waiting, 1);
});
t('funnel: many applications and almost no replies points at the résumé / targeting', () => {
  const apps = Array(10).fill(mk('Closed', 'auto')).concat([mk('Applied')]);
  assert.equal(U.funnel(apps).stage, 'noReplies');
});
t('funnel: stalls are matched to the stage where most applications end', () => {
  const base = Array(5).fill(mk('Closed', 'noReply'));
  assert.equal(U.funnel(base.concat(Array(3).fill(mk('Closed', 'screen')))).stage, 'screen');
  assert.equal(U.funnel(base.concat(Array(3).fill(mk('Closed', 'interviews')))).stage, 'middle');
  assert.equal(U.funnel(base.concat(Array(3).fill(mk('Closed', 'final')))).stage, 'final');
  assert.equal(U.funnel(base.concat([mk('Closed', 'screen'), mk('Closed', 'interviews'), mk('Closed', 'final')])).stage, 'mixed');
});
t('mentor summary shows funnel counts but never employer names unless chosen', () => {
  const st = fresh(); st.apps = [{ employer: 'SECRETCO', title: 'SECRETROLE', status: 'Closed', outcome: 'auto' }];
  const txt = U.mentorSummary(st, D, {}, {});
  assert(/1 automatic rejection/.test(txt)); assert(!/SECRETCO|SECRETROLE/.test(txt));
});
console.log('\n' + n + ' tests passed');
