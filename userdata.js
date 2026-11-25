/* Career Compass — the user's own data: validation, versioning, backup and mentor summary.
 * Pure functions, no DOM, no network. Works in browser (window.CCUserData) and Node (require).
 *
 * Everything the person enters lives only in their browser (localStorage). This module is the
 * single gate for anything that comes back in (load / import): it keeps known fields only,
 * clamps values and drops anything unexpected, so a damaged or hand-edited file can't break the app.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CCUserData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA = 3;                       // bump when the SHAPE of saved data changes, and add a step to migrate()
  var MAX_FILE_CHARS = 2000000;
  var STEPS = ['discover', 'narrow', 'build', 'improve', 'apply'];
  var THEMES = ['classic', 'mac84', 'macos', 'wrapped'];
  var SKILL_STATES = ['demonstrated', 'developing', 'notShown', 'confirmedGap', 'unknown'];
  var PROJ_STATUS = ['idea', 'proposed', 'approved', 'inProgress', 'completed'];
  var LEARN_STATUS = ['notStarted', 'inProgress', 'done'];
  var APP_STATUS = ['To verify', 'Saved', 'Applied', 'Interviewing', 'Offer', 'Closed'];
  var OUTCOMES = ['', 'noReply', 'auto', 'screen', 'interviews', 'final'];   // how a closed application ended
  var SEARCH_STAGES = ['', 'start', 'noReplies', 'screen', 'middle', 'final'];   // how she says her search is going
  var ID_RE = /^(?!__proto__$|constructor$|prototype$)[A-Za-z0-9_-]{1,60}$/;   // also blocks prototype-pollution keys

  function str(v, max) { return (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max || 500); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function oneOf(v, list, dflt) { return list.indexOf(v) > -1 ? v : dflt; }
  function int(v, lo, hi, dflt) { var n = Math.round(Number(v)); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt; }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function ids(list, max, known) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (typeof x === 'string' && ID_RE.test(x) && out.indexOf(x) < 0 && (!known || known.indexOf(x) > -1) && out.length < max) out.push(x);
    });
    return out;
  }
  function eachId(o, fn) { if (!isObj(o)) return; Object.keys(o).forEach(function (k) { if (ID_RE.test(k)) fn(k, o[k]); }); }

  /** Step-by-step upgrades of OLD saved data to the current shape. Never throws away answers. */
  function migrate(raw) {
    var s = isObj(raw) ? raw : {};
    var v = Number(s.v) || 1;
    // v1 → v2: added lastBackup. v2 → v3: applications can record how they ended (`outcome`); old ones just have none.
    // Add future steps here, in order.
    if (v < 2) s.lastBackup = s.lastBackup || null;
    s.v = SCHEMA;
    return s;
  }

  /** Build a clean state from anything. `fresh` is the app's default state (used for missing fields). */
  function sanitize(raw, fresh, D) {
    var r = migrate(isObj(raw) ? raw : {});
    var roleIds = (D.roles || []).map(function (x) { return x.id; });
    var s = JSON.parse(JSON.stringify(fresh));
    s.v = SCHEMA;

    if (isObj(r.profile)) Object.keys(fresh.profile).forEach(function (k) { if (own(r.profile, k)) s.profile[k] = str(r.profile[k], 300); });
    s.prefilled = !!r.prefilled;
    if (isObj(r.guide)) {
      s.guide = {
        step: oneOf(r.guide.step, STEPS, 'discover'), q: int(r.guide.q, 0, 99, 0), showAll: !!r.guide.showAll,
        detail: typeof r.guide.detail === 'string' && roleIds.indexOf(r.guide.detail) > -1 ? r.guide.detail : null,
        src: oneOf(r.guide.src, ['real', 'public'], undefined)
      };
      if (s.guide.src === undefined) delete s.guide.src;
      if (!s.guide.showAll) delete s.guide.showAll;
      if (!s.guide.detail) delete s.guide.detail;
      if (isObj(r.guide.proj)) { s.guide.proj = {}; eachId(r.guide.proj, function (k, v2) { if (typeof v2 === 'string' && ID_RE.test(v2)) s.guide.proj[k] = v2; }); }
    }
    s.theme = oneOf(r.theme, THEMES, 'classic');

    eachId(r.prefs, function (k, p) {
      if (!isObj(p)) return;
      s.prefs[k] = {
        desired: p.desired == null ? null : int(p.desired, 1, 5, null), importance: int(p.importance, 1, 3, 2),
        constraint: oneOf(p.constraint, ['avoid', 'require'], null), source: str(p.source, 300)
      };
    });
    s.custom = []; (Array.isArray(r.custom) ? r.custom : []).slice(0, 30).forEach(function (c) { if (isObj(c) && typeof c.id === 'string' && ID_RE.test(c.id)) s.custom.push({ id: c.id, label: str(c.label, 80) }); });
    s.hidden = ids(r.hidden, 50);
    s.focus = ids(r.focus, 3, roleIds);
    s.compare = ids(r.compare, 3, roleIds);
    s.lensRole = typeof r.lensRole === 'string' && roleIds.indexOf(r.lensRole) > -1 ? r.lensRole : null;

    s.skills = {}; eachId(r.skills, function (k, v2) { if (isObj(v2)) s.skills[k] = { state: oneOf(v2.state, SKILL_STATES, 'unknown'), note: str(v2.note, 1000) }; });
    s.projects = {}; eachId(r.projects, function (k, v2) {
      if (!isObj(v2)) return; var rf = isObj(v2.reflection) ? v2.reflection : {};
      s.projects[k] = { status: oneOf(v2.status, PROJ_STATUS, 'idea'), reflection: { energized: str(rf.energized, 2000), drained: str(rf.drained, 2000), learned: str(rf.learned, 2000) } };
    });
    s.currentProject = typeof r.currentProject === 'string' && ID_RE.test(r.currentProject) ? r.currentProject : null;
    s.weeklyHours = int(r.weeklyHours, 1, 60, 5);
    s.learning = {}; eachId(r.learning, function (k, v2) { s.learning[k] = oneOf(v2, LEARN_STATUS, 'notStarted'); });
    s.tasks = {}; eachId(r.tasks, function (k, v2) { if (v2) s.tasks[k] = true; });
    s.apps = (Array.isArray(r.apps) ? r.apps : []).slice(0, 500).filter(isObj).map(function (a) {
      var o = { employer: str(a.employer, 200), title: str(a.title, 200), url: str(a.url, 500), status: oneOf(a.status, APP_STATUS, 'Saved'), outcome: oneOf(a.outcome, OUTCOMES, '') };
      ['location', 'elig', 'experience', 'coding', 'verified', 'next'].forEach(function (k) { o[k] = str(a[k], 300); });
      o.notes = str(a.notes, 3000); return o;
    });
    s.resumeNotes = str(r.resumeNotes, 10000);
    s.searchStage = oneOf(r.searchStage, SEARCH_STAGES, '');
    s.lastBackup = typeof r.lastBackup === 'string' && !isNaN(Date.parse(r.lastBackup)) ? r.lastBackup : null;
    return s;
  }

  /**
   * Where her applications are stalling, from the tracker alone (no private text is read).
   * Returns counts plus a `stage`: tooEarly | noReplies | screen | middle | final | mixed.
   * Small samples are never over-read: under 8 applications it says tooEarly.
   */
  function funnel(apps) {
    var f = { applied: 0, waiting: 0, active: 0, offer: 0, noReply: 0, auto: 0, screen: 0, interviews: 0, final: 0, unrecorded: 0 };
    (apps || []).forEach(function (a) {
      if (['Applied', 'Interviewing', 'Offer', 'Closed'].indexOf(a.status) < 0) return;
      f.applied++;
      if (a.status === 'Applied') f.waiting++;
      else if (a.status === 'Interviewing') f.active++;
      else if (a.status === 'Offer') f.offer++;
      else if (a.outcome && own(f, a.outcome)) f[a.outcome]++;
      else f.unrecorded++;
    });
    f.heard = f.active + f.offer + f.screen + f.interviews + f.final;     // reached a real person
    var stage = 'tooEarly';
    if (f.applied >= 8) {
      if (f.heard / f.applied < 0.15) stage = 'noReplies';
      else {
        var order = ['screen', 'interviews', 'final'], best = null;
        order.forEach(function (k) { if (f[k] >= 2 && (best === null || f[k] > f[best])) best = k; });
        stage = best === 'screen' ? 'screen' : best === 'interviews' ? 'middle' : best === 'final' ? 'final' : 'mixed';
      }
    }
    f.stage = stage;
    return f;
  }

  /** What gets written to a backup file. */
  function envelope(state, kind, appVersion) {
    return { app: 'career-compass', kind: kind || 'backup', schema: SCHEMA, appVersion: appVersion || '', exportedAt: new Date().toISOString(), state: state };
  }

  /** Parse and validate text from an imported file. Returns { state } or throws an Error with a plain-language message. */
  function parseImport(text, fresh, D) {
    if (typeof text !== 'string' || text.length > MAX_FILE_CHARS) throw new Error('that file is too large to be a Career Compass file');
    var j; try { j = JSON.parse(text); } catch (e) { throw new Error('that isn’t a readable JSON file'); }
    if (!isObj(j) || j.app !== 'career-compass' || !isObj(j.state)) throw new Error('that isn’t a Career Compass file');
    var fileSchema = Number(j.schema || j.version || j.state.v || 1);
    if (fileSchema > SCHEMA) throw new Error('that file was made by a newer version. Refresh this page and try again');
    return { state: sanitize(j.state, fresh, D), kind: j.kind === 'profile' ? 'profile' : 'backup' };
  }

  /**
   * Plain-text summary a student can choose to share with a mentor.
   * Deliberately NOT included, whatever the options: profile (grad date, locations, work authorization, notes),
   * skill notes, preference notes, project reflections, résumé notes, tracker notes/next steps/links, contact details.
   * opts: { includePrefs, includeTracker }.  ctx: { planDone, planTotal, answered, totalQuestions } computed by the app.
   */
  function mentorSummary(state, D, opts, ctx) {
    opts = opts || {}; ctx = ctx || {};
    var byId = function (list, id) { return (list || []).filter(function (x) { return x.id === id; })[0]; };
    var L = [];
    L.push('# Career Compass: progress summary');
    L.push('Shared by the student on ' + new Date().toISOString().slice(0, 10) + '. It leaves out private notes, reflections, personal details and contact information.', '');
    L.push('## Journey');
    L.push('- Current step: ' + ({ discover: 'Discover', narrow: 'Narrow', build: 'Build', improve: 'Build (fill the gaps)', apply: 'Apply' }[state.guide && state.guide.step] || 'Discover'));
    if (ctx.totalQuestions) L.push('- Discovery questions answered: ' + ctx.answered + ' of ' + ctx.totalQuestions);
    var paths = (state.focus || []).map(function (id) { return byId(D.roles, id); }).filter(Boolean);
    L.push('- Chosen paths: ' + (paths.length ? paths.map(function (p) { return p.title; }).join('; ') : 'none yet'), '');

    L.push('## Skills the paths ask for (student’s own résumé assessment)');
    if (!paths.length) L.push('- Choose paths first.');
    var SK = { demonstrated: 'Demonstrated', developing: 'Developing', notShown: 'Not yet shown on résumé', confirmedGap: 'Confirmed gap', unknown: 'Not assessed' };
    paths.forEach(function (p) {
      L.push('- ' + p.title + ':');
      p.req.forEach(function (sid) { var b = byId(D.skills, sid), o = (state.skills || {})[sid] || {}; if (b) L.push('  - ' + b.name + ': ' + SK[o.state || b.state]); });
    });
    L.push('');

    var PS = { idea: 'Not started', proposed: 'Proposed', approved: 'Approved', inProgress: 'In progress', completed: 'Completed' };
    var LS = { notStarted: 'Not started', inProgress: 'In progress', done: 'Done' };
    var projs = Object.keys(state.projects || {}).filter(function (k) { return state.projects[k].status !== 'idea' && byId(D.projects, k); });
    var courses = Object.keys(state.learning || {}).filter(function (k) { return state.learning[k] !== 'notStarted' && byId(D.learning, k); });
    L.push('## Projects and courses');
    if (!projs.length && !courses.length) L.push('- Nothing started yet.');
    projs.forEach(function (k) { L.push('- Project: ' + byId(D.projects, k).title + ' (' + PS[state.projects[k].status] + ')'); });
    courses.forEach(function (k) { L.push('- Course topic: ' + byId(D.learning, k).topic + ' (' + LS[state.learning[k]] + ')'); });
    L.push('');

    if (ctx.planTotal) { L.push('## 30-day plan', '- ' + ctx.planDone + ' of ' + ctx.planTotal + ' steps done', ''); }

    var apps = state.apps || [];
    L.push('## Applications');
    if (!apps.length) L.push('- None logged yet.');
    else {
      var counts = {}; apps.forEach(function (a) { counts[a.status] = (counts[a.status] || 0) + 1; });
      L.push('- ' + apps.length + ' logged: ' + Object.keys(counts).map(function (k) { return counts[k] + ' ' + k.toLowerCase(); }).join(', '));
      var fu = funnel(apps);
      if (fu.applied) L.push('- Of ' + fu.applied + ' applied: ' + fu.heard + ' reached a real person; ' + fu.noReply + ' no reply, ' + fu.auto + ' automatic rejection, ' + fu.waiting + ' still waiting');
      if (opts.includeTracker) apps.forEach(function (a) { L.push('  - ' + a.employer + ': ' + a.title + ' (' + a.status + ')'); });
    }
    L.push('');

    if (opts.includePrefs) {
      var likes = [], dislikes = [];
      (D.activities || []).forEach(function (a) { var p = (state.prefs || {})[a.id]; if (!p || p.desired == null) return; if (p.desired >= 4) likes.push(a.label); else if (p.desired <= 2) dislikes.push(a.label); });
      L.push('## Preferences (student chose to share)', '- Likes: ' + (likes.join('; ') || 'none marked'), '- Likes less: ' + (dislikes.join('; ') || 'none marked'), '');
    }
    return L.join('\n');
  }

  return { SCHEMA: SCHEMA, MAX_FILE_CHARS: MAX_FILE_CHARS, migrate: migrate, funnel: funnel, OUTCOMES: OUTCOMES, sanitize: sanitize, envelope: envelope, parseImport: parseImport, mentorSummary: mentorSummary };
});
