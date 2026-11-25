/* Career Compass — UI. Vanilla JS, local-storage only, no network calls. */
(function () {
  'use strict';
  var D = window.CC_DATA, S = window.CCScoring;
  var U = CCUserData;
  var KEY = 'careerCompass.v1';
  var THEMES = ['classic', 'mac84', 'macos', 'wrapped'];

  /* ---------- helpers ---------- */
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var byId = function (arr, id) { return arr.filter(function (x) { return x.id === id; })[0]; };
  var $ = function (sel) { return document.querySelector(sel); };

  var TIER = { strong: 'Strong match so far', possible: 'Possible match', explore: 'Explore carefully', conflict: 'Check your constraints' };
  var INTENSITY = ['', 'Minimal', 'Light', 'Moderate', 'Heavy', 'Core to the job'];
  var SKILL_STATES = { demonstrated: 'Demonstrated', developing: 'Developing', notShown: 'Not yet demonstrated on résumé', confirmedGap: 'Confirmed gap', unknown: 'Unknown' };
  var PROJ_STATUS = { idea: 'Not started', proposed: 'Proposed', approved: 'Approved', inProgress: 'In progress', completed: 'Completed' };
  var APP_STATUS = ['To verify', 'Saved', 'Applied', 'Interviewing', 'Offer', 'Closed'];
  var BRIEF_ATTRS = {}; // every role value is an estimate

  /* ---------- state ---------- */
  function fresh() {
    return {
      v: CCUserData.SCHEMA, lastBackup: null, searchStage: '',
      profile: clone(D.profile), prefilled: !!D.prefilled,
      guide: { step: 'discover', q: 0 }, theme: 'classic', prefs: clone(D.seedPrefs), custom: [], hidden: [], focus: [], lensRole: null,
      skills: {}, projects: {}, currentProject: null, weeklyHours: 5,
      learning: {}, tasks: {}, apps: [], resumeNotes: '', compare: []
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return CCUserData.sanitize(JSON.parse(raw), fresh(), D);
    } catch (e) { /* storage unavailable or corrupt → start fresh */ }
    return fresh();
  }
  var state = load();
  var ui = { f: { sort: 'match', coding: 'any', client: 'any', finance: 'any', coord: 'any', coordExt: 'any', ready: 'any', family: 'any' },
             rhRole: '', rhOther: '', rhEmployer: '', posting: '', moves: {}, mentor: { open: false, includePrefs: false, includeTracker: false }, editing: null, editApp: null, undo: null, focusId: null, projFilter: { onlyLens: true, source: 'any', coding: 'any' } };
  var toastTimer;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast('Could not save — browser storage is unavailable. Use Export JSON to keep your work.'); } }
  function toast(msg, undoFn) {
    var t = $('#toast'); t.innerHTML = '<span>' + esc(msg) + '</span>' + (undoFn ? '<button data-action="undo">Undo</button>' : '');
    ui.undo = undoFn || null; t.className = 'show'; clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; ui.undo = null; }, undoFn ? 9000 : 3500);
  }

  /* ---------- derived ---------- */
  function activities() { return D.activities.filter(function (a) { return state.hidden.indexOf(a.id) < 0; }).concat(state.custom.map(function (c) { return { id: c.id, label: c.label, hint: 'Custom — saved as a note; not used for ranking (no role data).' }; })); }
  function ranking(sortBy) { return S.rankRoles(D.roles, state.prefs, activities(), sortBy); }
  function rankMap() { var m = {}; ranking().forEach(function (r, i) { m[r.roleId] = i; }); return m; }
  function lensId() { return state.lensRole || ranking()[0].roleId; }
  function skillOf(id) { var base = byId(D.skills, id), o = state.skills[id] || {}; return { id: id, name: base.name, state: o.state || base.state, note: o.note != null ? o.note : base.note }; }
  function projOf(id) { return state.projects[id] || { status: 'idea', reflection: { energized: '', drained: '', learned: '' } }; }
  function topRoles() {
    var rows = ranking();
    if (state.focus.length) return state.focus.map(function (id) { return rows.filter(function (r) { return r.roleId === id; })[0]; }).filter(Boolean);
    return rows.slice(0, 3);
  }
  var GAP_ORDER = { confirmedGap: 0, notShown: 1, unknown: 2, developing: 3, demonstrated: 9 };
  function gapsFor(role) {
    var out = [];
    role.req.forEach(function (s) { out.push({ id: s, required: true }); });
    role.help.forEach(function (s) { out.push({ id: s, required: false }); });
    return out.map(function (g) { g.skill = skillOf(g.id); return g; })
      .filter(function (g) { return g.skill.state !== 'demonstrated'; })
      .sort(function (a, b) { return (b.required - a.required) || (GAP_ORDER[a.skill.state] - GAP_ORDER[b.skill.state]); });
  }
  function learningFor(roleId, includeOptional) {
    return D.learning.filter(function (l) { return l.careers.indexOf(roleId) > -1 && !!l.optional === !!includeOptional; })
      .sort(function (a, b) { return a.priority - b.priority; });
  }
  function projectsFor(roleId) { return D.projects.filter(function (p) { return p.careers.indexOf(roleId) > -1; }); }

  /* ---------- small components ---------- */
  function bar(label, val, opts) {
    opts = opts || {}; var h = '';
    for (var i = 1; i <= 5; i++) h += '<span class="pip' + (i <= val ? ' on' : '') + (opts.est && i <= val ? ' est' : '') + (opts.you === i ? ' you' : '') + '"></span>';
    return '<div class="bar"><span>' + esc(label) + '</span><span class="pips" role="img" aria-label="' + esc(label) + ': ' + val + ' of 5' + (opts.est ? ', estimate' : '') + '">' + h + '</span></div>';
  }
  function attrBars(role, ids) {
    return '<div class="bars">' + ids.map(function (id) {
      var a = byId(D.activities, id), p = state.prefs[id];
      return bar(a.label.split(' / ')[0].split(' & ')[0], role.attrs[id], { est: !BRIEF_ATTRS[id], you: p && p.desired });
    }).join('') + '</div>';
  }
  function projectBrief(p) {
    return ['PROJECT PROPOSAL: ' + p.title, '',
      'The question I would help answer', p.q, '',
      'What I would need from you (only what you are comfortable sharing)', p.data, '',
      'What I would do', p.steps.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n'), '',
      'What you would get', p.deliver, '',
      'Time', 'About ' + p.dur + ', roughly ' + state.weeklyHours + ' hours a week. We can adjust to what suits you.', '',
      'Privacy', 'I will only use data you approve, keep it private, and not share it outside this project. I will not put company details on my résumé or anywhere else without your OK.', '',
      'This is a proposal, not a promise of results. Happy to start with one small piece first.'].join('\n');
  }
  var DIMS = [['Technical', ['coding', 'dataCleaning', 'predictiveModeling']], ['Client-facing', ['clientInteraction', 'coordExternal', 'sales', 'presentations']], ['Operations', ['coordination', 'operations', 'productImprovement']], ['Finance & markets', ['financeModeling', 'marketResearch', 'markets']]];
  function roleShape(role) {
    return '<div class="bars" aria-label="What the role is like">' + DIMS.map(function (d) {
      var v = d[1].reduce(function (s, id) { return s + (role.attrs[id] || 0); }, 0) / d[1].length;
      return bar(d[0], Math.round(v), { est: true });
    }).join('') + '</div>';
  }
  function tag(cls, text) { return '<span class="tag ' + cls + '">' + esc(text) + '</span>'; }
  function select(id, opts, val, data) {
    return '<select id="' + esc(id) + '" ' + data + '>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  function roleSelect(label) {
    var rows = ranking();
    return '<label class="field" style="max-width:26rem">' + esc(label) + select('lens', rows.map(function (r) { return [r.roleId, r.role.title]; }), lensId(), 'data-change="lens"') + '</label>';
  }

  /* ---------- views ---------- */
  var NAV = [['guide', 'My journey'], ['readiness', 'Résumé help'], ['home', 'Dashboard']];
  var TOOLS = { explore: 'Explore paths', prefs: 'Preferences', readiness: 'Résumé help', projects: 'Projects', learning: 'Learning', plan: 'Plan & tracker', role: 'Path details' };

  function taskGo(t, cls) {
    if (!t.go) return '';
    var NAMES = { discover: 'My journey › Discover', narrow: 'My journey › Narrow', improve: 'My journey › Fill the gaps', '#find-roles': 'Find roles, lower on this page', '#my-tracker': 'My tracker, lower on this page' };
    var tip = (t.go.charAt(0) === '#' ? 'Jump to ' : 'Open ') + (NAMES[t.go] || '');
    return '<button class="' + (cls || 'link small') + '" data-action="goTo" data-id="' + t.go + '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' + (t.go.charAt(0) === '#' ? 'Jump to below ↓' : 'Open') + '</button>';
  }
  function taskDone(t) {
    if (!t.auto) return !!state.tasks[t.id];
    var P = state.projects, L = state.learning;
    switch (t.auto) {
      case 'discover': return activities().filter(function (x) { return state.prefs[x.id] && state.prefs[x.id].desired != null; }).length >= 8;
      case 'paths': return state.focus.length >= 2;
      case 'build': return Object.keys(P).some(function (k) { return P[k].status === 'inProgress' || P[k].status === 'completed'; }) || Object.keys(L).some(function (k) { return L[k] === 'inProgress' || L[k] === 'done'; });
      case 'projDone': return Object.keys(P).some(function (k) { return P[k].status === 'completed'; });
      case 'tracker': return state.apps.length >= 1;
    }
    return false;
  }
  function dataCard() {
    var d = state.lastBackup ? Math.floor((Date.now() - Date.parse(state.lastBackup)) / 86400000) : null, m = ui.mentor;
    var hasData = state.focus.length || state.apps.length || Object.keys(state.projects).length || summaryCtx().answered > 2;
    var nudge = hasData && (d === null || d >= 14) ? '<div class="note small" role="note">' + (d === null ? 'You haven’t downloaded a backup yet.' : 'Your last backup was ' + d + ' days ago.') + ' Your work lives only in this browser, so a backup protects you if you clear browser data or switch devices.</div>' : '';
    return '<h2>Your data</h2><div class="card stack"><p class="small">Everything you enter stays in this browser. Nothing is uploaded, and updates to this site never overwrite it.</p>' + nudge +
      '<div class="row"><button class="btn" data-action="export">Download full backup</button><button class="btn ghost" data-action="pickImport">Import a file</button></div>' +
      '<p class="small muted">Last backup: ' + (state.lastBackup ? esc(state.lastBackup.slice(0, 10)) : 'never') + '. Use the backup to move to a new device.</p>' +
      '<details' + (m.open ? ' open' : '') + '><summary>Share a progress summary with your mentor</summary><div class="stack" style="margin-top:.75rem">' +
      '<p class="small muted">This is a short summary you can send. It never includes your notes, reflections, personal details or links. Check the preview before you share.</p>' +
      '<label class="check"><input type="checkbox" data-change="mentorOpt" data-key="includePrefs"' + (m.includePrefs ? ' checked' : '') + '><span>Also share what I like and like less</span></label>' +
      '<label class="check"><input type="checkbox" data-change="mentorOpt" data-key="includeTracker"' + (m.includeTracker ? ' checked' : '') + '><span>Also list the employers and job titles I logged</span></label>' +
      '<textarea readonly rows="14" aria-label="Summary preview">' + esc(summaryText()) + '</textarea>' +
      '<div class="row"><button class="btn small" data-action="copySummary">Copy summary</button><button class="btn ghost small" data-action="dlSummary">Download as a file</button></div></div></details></div>';
  }
  function progressCard() {
    var acts = activities(), answered = acts.filter(function (x) { return state.prefs[x.id] && state.prefs[x.id].desired != null; }).length;
    var focus = state.focus.map(function (id) { return byId(D.roles, id); }).filter(Boolean);
    var courses = {}; focus.forEach(function (r) { var l = learningFor(r.id, false)[0]; if (l) courses[l.id] = l; });
    var cl = Object.keys(courses), cDone = cl.filter(function (k) { return state.learning[k] === 'done'; }).length, cWip = cl.filter(function (k) { return state.learning[k] === 'inProgress'; }).length;
    var order = Object.keys(PROJ_STATUS), cur = state.currentProject && byId(D.projects, state.currentProject);
    var started = Object.keys(state.projects).filter(function (k) { return order.indexOf(state.projects[k].status) > 0; });
    var pDone = started.filter(function (k) { return state.projects[k].status === 'completed'; }).length;
    var done = D.tasks.filter(taskDone).length;
    var row = function (label, val, max, text) { return '<div class="progrow"><label><span>' + label + '</span><progress max="' + max + '" value="' + val + '"></progress></label><span class="small muted">' + text + '</span></div>'; };
    return '<h2>Progress</h2><div class="card stack">' +
      row('Discover', answered, acts.length, answered + ' of ' + acts.length + ' questions answered') +
      row('Paths chosen', focus.length, 3, focus.length + ' of 3') +
      row('Project', cur ? order.indexOf(projOf(cur.id).status) : 0, order.length - 1, cur ? esc(cur.title) + ': ' + PROJ_STATUS[projOf(cur.id).status] : (started.length ? started.length + ' started, ' + pDone + ' completed' : 'No project chosen yet')) +
      row('Courses', cDone + cWip / 2, Math.max(cl.length, 1), cl.length ? cDone + ' done, ' + cWip + ' in progress (of ' + cl.length + ' for your paths)' : 'Choose paths to see your courses') +
      row('30-day plan', done, D.tasks.length, done + ' of ' + D.tasks.length + ' steps · <a href="#/plan">open</a>') +
      '<p class="small muted">Applications tracked: ' + state.apps.length + '. Progress comes only from what you answer and mark yourself.</p></div>';
  }

  function viewHome() {
    var top = topRoles();
    var next = D.tasks.filter(function (t) { return !taskDone(t); })[0];
    var done = D.tasks.filter(taskDone).length;
    var projDone = Object.keys(state.projects).filter(function (k) { return state.projects[k].status === 'completed'; }).length;
    var learnDone = Object.keys(state.learning).filter(function (k) { return state.learning[k] === 'done'; }).length;
    var cs = state.guide.step === 'improve' ? 'build' : state.guide.step, csl = (STEPS.filter(function (s) { return s[0] === cs; })[0] || STEPS[0])[1];
    return '<h1>Your dashboard</h1><p><a class="btn" href="#/guide">Continue your journey: ' + esc(csl) + ' →</a></p>' +
      '<p class="lede">This isn’t a verdict on what you should do. It’s a way to try ideas on, see what each path really involves, and build evidence while you keep applying.</p>' +
      '<div class="note info small" role="note">Rankings are exploratory. ' + (state.prefilled ? 'They start from a few likes and dislikes pre-filled from your mentor’s notes — they may be wrong, and they’re yours to change — plus rough estimates of each role.' : 'They come from the likes and dislikes you tell us plus rough estimates of each role — answer a few on Preferences to personalise them.') + ' They are not a measure of your ability or your odds of being hired. <a href="#/prefs">Review and edit my answers</a></div>' +
      '<div class="card hero" style="margin-top:1rem"><h3>Your next step</h3>' +
      (next ? '<p>' + esc(next.text) + '</p>' + taskGo(next, 'btn') + '' : '<p>You’ve checked off the 30-day plan. Look back at what you enjoyed and re-answer the discovery questions if anything changed.</p><button class="btn" data-action="goTo" data-id="discover">Open in My journey</button>') + '</div>' +
      '<h2>' + (state.focus.length ? 'Your focus paths' : 'Top three paths right now') + '</h2>' +
      '<div class="grid cols3">' + top.map(function (r) { return roleCard(r, { compact: true }); }).join('') + '</div>' +
      progressCard() +
      '<h2>All tools</h2><div class="grid cols3">' +
      [['#/explore', 'Explore paths', 'Compare paths side by side. Your chosen paths come first.', ''], ['#/readiness', 'Résumé help', 'Find where your search is stalling and get prompts for your AI.', ''], ['#/plan', 'Plan & tracker', '30-day checklist and applications.', '']]
        .map(function (l) { return l[3] ? '<div class="card"><h3>' + l[1] + ' <span class="tag">Coming soon</span></h3><p class="muted small">' + l[2] + '</p></div>' : '<a class="card" style="text-decoration:none;color:inherit" href="' + l[0] + '"><h3>' + l[1] + '</h3><p class="muted small">' + l[2] + '</p></a>'; }).join('') + '</div>' + dataCard();
  }

  function roleCard(r, o) {
    o = o || {}; var role = r.role, pinned = state.focus.indexOf(role.id) > -1, inCmp = state.compare.indexOf(role.id) > -1;
    var move = ui.moves[role.id] ? '<span class="small ' + (ui.moves[role.id] > 0 ? 'moved-up' : 'moved-down') + '">' + (ui.moves[role.id] > 0 ? '▲ up ' : '▼ down ') + Math.abs(ui.moves[role.id]) + ' since your last change</span>' : '';
    return '<article class="card stack" aria-labelledby="rc-' + role.id + '">' +
      '<div><h3 id="rc-' + role.id + '">' + esc(role.title) + '</h3><div class="row">' + tag(r.tier, TIER[r.tier]) + tag('', role.family) + (r.confidence === 'low' ? tag('est', 'low confidence') : '') + '</div></div>' +
      '<p class="small muted">' + esc(S.explain(r)) + ' ' + move + '</p>' +
      (o.compact ? '' : '<p class="small">' + esc(role.desc) + '</p>') +
      attrBars(role, o.compact ? ['coding', 'clientInteraction', 'financeModeling'] : ['coding', 'clientInteraction', 'coordination', 'financeModeling']) +
      '<div class="bars">' + bar('Résumé readiness', role.readiness, { est: true }) + '</div>' +
      '<div class="row"><a class="btn small" href="#/role/' + role.id + '">Details</a>' +
      '<button class="btn ghost small" data-action="pin" data-id="' + role.id + '" aria-pressed="' + pinned + '">' + (pinned ? '✓ Chosen' : 'Choose this path') + '</button>' +
      (o.compact ? '' : '<label class="small"><input type="checkbox" id="cmp-' + role.id + '" data-change="compare" data-id="' + role.id + '"' + (inCmp ? ' checked' : '') + '> Compare</label>') + '</div></article>';
  }

  function viewExplore() {
    var f = ui.f, rows = ranking(f.sort === 'readiness' ? 'readiness' : 'match');
    rows = rows.filter(function (r) {
      var a = r.role.attrs;
      if (f.coding === 'light' && a.coding > 2) return false;
      if (f.coding === 'mod' && a.coding > 3) return false;
      if (f.client === 'low' && a.clientInteraction > 2) return false;
      if (f.client === 'high' && a.clientInteraction < 4) return false;
      if (f.finance === 'high' && a.financeModeling < 4) return false;
      if (f.coord === 'high' && a.coordination < 4) return false;
      if (f.coordExt === 'high' && a.coordExternal < 4) return false;
      if (f.ready !== 'any' && r.role.readiness < +f.ready) return false;
      if (f.family !== 'any' && r.role.family !== f.family) return false;
      return true;
    });
    var fam = []; D.roles.forEach(function (r) { if (fam.indexOf(r.family) < 0) fam.push(r.family); });
    var F = function (key, label, opts) { return '<label class="field">' + label + select('f-' + key, opts, f[key], 'data-change="filter" data-key="' + key + '"') + '</label>'; };
    var cmp = state.compare.map(function (id) { return byId(D.roles, id); }).filter(Boolean);
    return '<h1>Explore careers</h1><p class="lede">Bars show how much of each activity a role involves. Hatched bars are editable estimates; a green ring marks where you said you’d like to be.</p>' +
      '<div class="card"><div class="grid cols3">' +
      F('sort', 'Sort by', [['match', 'Best match to my preferences'], ['readiness', 'Résumé readiness today']]) +
      F('coding', 'Coding tolerance', [['any', 'Any'], ['light', 'Light only (≤2)'], ['mod', 'Up to moderate (≤3)']]) +
      F('client', 'Client interaction', [['any', 'Any'], ['low', 'Low'], ['high', 'High']]) +
      F('finance', 'Finance depth', [['any', 'Any'], ['high', 'Deep finance']]) +
      F('coord', 'Coordinating with teammates', [['any', 'Any'], ['high', 'Lots of internal coordination']]) +
      F('coordExt', 'Coordinating with customers', [['any', 'Any'], ['high', 'Lots of customer coordination']]) +
      F('ready', 'Readiness', [['any', 'Any'], ['3', '3 or more'], ['4', '4 or more']]) +
      F('family', 'Industry', [['any', 'Any']].concat(fam.map(function (x) { return [x, x]; }))) +
      '</div></div>' +
      (cmp.length >= 2 ? compareTable(cmp) : '<p class="small muted" style="margin-top:.75rem">Tick “Compare” on up to three cards to see them side by side.</p>') +
      '<h2>' + rows.length + ' path' + (rows.length === 1 ? '' : 's') + (f.sort === 'readiness' ? ', by résumé readiness' : ', best match first') + '</h2>' +
      (rows.length ? (function () {
        var mine = rows.filter(function (r) { return state.focus.indexOf(r.roleId) > -1; }), rest = rows.filter(function (r) { return state.focus.indexOf(r.roleId) < 0; });
        var grid = function (l) { return '<div class="grid cols2">' + l.map(function (r) { return roleCard(r); }).join('') + '</div>'; };
        return mine.length ? '<h3>Your chosen paths</h3>' + grid(mine) + (rest.length ? '<h3>Other paths</h3>' + grid(rest) : '') : grid(rows);
      })() : '<div class="card"><p>No paths match those filters. Loosen one — filters are a view, not a verdict.</p><button class="btn ghost" data-action="clearFilters">Clear filters</button></div>');
  }

  function compareTable(cmp) {
    var rows = ranking(), tierOf = function (id) { return rows.filter(function (r) { return r.roleId === id; })[0]; };
    var attr = ['coding', 'clientInteraction', 'coordination', 'coordExternal', 'financeModeling', 'marketResearch', 'presentations'];
    return '<h2>Side by side</h2><div class="card tablewrap"><table class="cmp"><thead><tr><th scope="col"></th>' +
      cmp.map(function (r) { return '<th scope="col">' + esc(r.title) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      '<tr><th scope="row">Match so far</th>' + cmp.map(function (r) { return '<td>' + tag(tierOf(r.id).tier, TIER[tierOf(r.id).tier]) + '</td>'; }).join('') + '</tr>' +
      attr.map(function (id) { return '<tr><th scope="row">' + esc(byId(D.activities, id).label) + '</th>' + cmp.map(function (r) { return '<td>' + r.attrs[id] + '/5 ' + INTENSITY[r.attrs[id]] + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr><th scope="row">Résumé readiness</th>' + cmp.map(function (r) { return '<td>' + r.readiness + '/5</td>'; }).join('') + '</tr>' +
      '<tr><th scope="row">Typical day</th>' + cmp.map(function (r) { return '<td class="small">' + esc(r.day) + '</td>'; }).join('') + '</tr>' +
      '<tr><th scope="row">Key gap</th>' + cmp.map(function (r) { return '<td class="small">' + esc(r.gap) + '</td>'; }).join('') + '</tr>' +
      '</tbody></table></div>';
  }

  function viewRole(id) {
    var row = ranking().filter(function (r) { return r.roleId === id; })[0];
    if (!row) return '<h1>Path not found</h1><a href="#/explore">Back to Explore</a>';
    var role = row.role, gaps = gapsFor(role).slice(0, 3), L = learningFor(id).slice(0, 3), P = projectsFor(id).slice(0, 3);
    var comps = role.cats.map(function (c) { return D.companies[c]; });
    return '<p><a href="#/explore">← All paths</a></p><h1>' + esc(role.title) + '</h1>' +
      '<div class="row">' + tag(row.tier, TIER[row.tier]) + tag('', role.family) + '</div>' +
      '<p>' + esc(role.desc) + '</p><p class="muted"><strong>A typical day:</strong> ' + esc(role.day) + '</p>' +
      '<p class="small muted">' + esc(S.explain(row)) + '</p>' +
      (role.note ? '<div class="note small">' + esc(role.note) + '</div>' : '') +
      '<div class="row" style="margin:.75rem 0"><button class="btn" data-action="setLens" data-id="' + id + '">Use this path for Readiness, Projects and Learning</button>' +
      '<button class="btn ghost" data-action="pin" data-id="' + id + '">' + (state.focus.indexOf(id) > -1 ? 'Unpin focus' : 'Pin as focus') + '</button></div>' +
      '<div class="layout2"><div class="stack"><div class="card"><h3>What the role involves</h3><p class="small muted">Hatched = editable estimate. All values are rough estimates you can challenge.</p>' +
      '<div class="bars">' + D.activities.map(function (a) { return bar(a.label, role.attrs[a.id], { est: !BRIEF_ATTRS[a.id], you: state.prefs[a.id] && state.prefs[a.id].desired }); }).join('') + '</div></div>' +
      '<div class="card"><h3>Evidence vs. what the role asks for</h3><p class="small muted">“Not yet demonstrated” means it isn’t on your résumé — not that you can’t do it.</p>' +
      '<p><strong>Typically required:</strong></p><ul>' + role.req.map(function (s) { return '<li>' + esc(skillOf(s).name) + ' — ' + tag('', SKILL_STATES[skillOf(s).state]) + '</li>'; }).join('') + '</ul>' +
      '<p><strong>Helpful:</strong></p><ul>' + role.help.map(function (s) { return '<li>' + esc(skillOf(s).name) + ' — ' + tag('', SKILL_STATES[skillOf(s).state]) + '</li>'; }).join('') + '</ul></div></div>' +
      '<div class="stack"><div class="card"><h3>Biggest gaps right now</h3>' + (gaps.length ? '<ul>' + gaps.map(function (g) { return '<li>' + esc(g.skill.name) + '</li>'; }).join('') + '</ul>' : '<p>Nothing flagged.</p>') +
      '<p class="small"><strong>Next step:</strong> ' + esc(role.next) + '</p></div>' +
      '<div class="card"><h3>Start with</h3>' + (P.length ? '<p class="small muted">Projects</p><ul>' + P.map(function (p) { return '<li>' + esc(p.title) + '</li>'; }).join('') + '</ul>' : '') +
      (L.length ? '<p class="small muted">Learning (just in time)</p><ul>' + L.map(function (l) { return '<li>' + esc(l.topic) + '</li>'; }).join('') + '</ul>' : '') +
      '<a href="#/projects" data-action="setLens" data-id="' + id + '">See all projects and learning →</a></div>' +
      '<div class="card"><h3>Example employer types</h3><p class="small muted">A watchlist, not open positions.</p>' +
      comps.map(function (c) { return '<p class="small"><strong>' + esc(c.label) + ':</strong> ' + esc(c.names.slice(0, 6).join(', ')) + '…</p>'; }).join('') + '</div></div></div>';
  }

  function viewPrefs() {
    var acts = activities(), rows = ranking();
    var list = acts.map(function (a) {
      var p = state.prefs[a.id] || { desired: null, importance: 2, constraint: null, source: '' };
      var seg = [[1, '😖', 'Nope'], [2, '🙁', 'Not really'], [3, '😐', 'It’s fine'], [4, '🙂', 'Like it'], [5, '😍', 'Love it'], ['u', '🤷', 'Not sure']].map(function (o) {
        var val = o[0], on = val === 'u' ? p.desired == null : p.desired === val, id = 'd-' + a.id + '-' + val;
        return '<label><input type="radio" name="d-' + a.id + '" id="' + id + '" value="' + val + '" data-change="desired" data-id="' + a.id + '"' + (on ? ' checked' : '') + '><span title="' + esc(o[2]) + '"><span aria-hidden="true">' + o[1] + '</span> ' + esc(o[2]) + '</span></label>';
      }).join('');
      return '<fieldset class="pref" style="border:0;padding:.8rem 0;margin:0;border-top:1px solid var(--line)"><legend style="padding:0"><strong>' + esc(a.label) + '</strong> <button class="iconbtn" id="edit-' + a.id + '" data-action="toggleEdit" data-id="' + a.id + '" aria-label="Edit ' + esc(a.label) + '" aria-expanded="' + (ui.editing === a.id) + '" title="Edit"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button> <span class="small muted">' + esc(a.hint || '') + '</span></legend>' +
        '<div class="seg" role="radiogroup" aria-label="' + esc(a.label) + ' preference">' + seg + '</div>' +
        '<div class="row small">' +
        '<label>Importance ' + select('imp-' + a.id, [[1, 'Low'], [2, 'Medium'], [3, 'High']], p.importance || 2, 'data-change="importance" data-id="' + a.id + '"') + '</label>' +
        '<label>Hard rule ' + select('con-' + a.id, [['', 'None'], ['avoid', 'Must avoid'], ['require', 'Must have']], p.constraint || '', 'data-change="constraint" data-id="' + a.id + '"') + '</label>' +
        '</div>' +
        (ui.editing === a.id ? '<div class="row editrow">' + (a.id.indexOf('custom') === 0 ? '<label class="small">Name <input type="text" id="rn-' + a.id + '" value="' + esc(a.label) + '" data-change="renameCustom" data-id="' + a.id + '"></label>' : '') + '<button class="btn ghost small danger" data-action="delAct" data-id="' + a.id + '">Remove this activity</button><button class="link small" data-action="toggleEdit" data-id="' + a.id + '">Done</button></div>' : '') +
        (p.source ? '<p class="small muted" style="margin:0">Starting point: ' + esc(p.source) + '</p>' : '') + '</fieldset>';
    }).join('');
    var pr = state.profile;
    var PF = function (k, label, type) { return '<label class="field">' + label + '<input type="' + (type || 'text') + '" id="pf-' + k + '" data-change="profile" data-key="' + k + '" value="' + esc(pr[k]) + '"></label>'; };
    return '<h1>My preferences</h1>' + (state.prefilled ? '<div class="note info small" role="note">Some answers below were <strong>pre-filled from your mentor’s notes</strong> (each says “Starting point”). If one doesn’t sound like you, change it or set it to Unsure — the ranking updates right away.</div>' : '') + '<p class="lede" style="margin-top:.75rem">Start with what you already know. “Unsure” is a perfectly good answer — unsure items are left out of the ranking, and you can change anything later.</p>' +
      '<div class="layout2"><div><div class="card">' + list +
      '<form data-submit="addCustom" class="row" style="margin-top:1rem"><label class="field" style="flex:1">Add your own activity<input type="text" id="customName" placeholder="e.g. Mentoring others" required></label><button class="btn" style="align-self:end">Add</button></form></div>' +
      '<h2>Where and when</h2><div class="card grid cols2">' + PF('locations', 'Locations to search') + PF('start', 'Target start date (leave blank if unsure)') + PF('workAuth', 'Work authorization (your note — unknown by default)') +
      '<label class="field">Notes<textarea id="pf-notes" data-change="profile" data-key="notes">' + esc(pr.notes) + '</textarea></label></div>' +
      (state.hidden.length ? '<details style="margin-top:1rem"><summary>Removed activities (' + state.hidden.length + ')</summary><ul class="small">' + state.hidden.map(function (hid) { var ha = byId(D.activities, hid); return '<li>' + esc(ha.label) + ' <button class="link" data-action="restoreAct" data-id="' + hid + '">Restore</button></li>'; }).join('') + '</ul></details>' : '') +
      '<div class="row" style="margin-top:1rem"><button class="btn ghost" data-action="resetPrefs">Reset preferences to starting point</button></div></div>' +
      '<aside class="card sticky" aria-label="Current ranking"><h3>Where this puts you today</h3><p class="small muted">Updates as you change answers. Tiers, not scores.</p><ol class="rank">' +
      rows.map(function (r) {
        var mv = ui.moves[r.roleId];
        return '<li><span><a href="#/role/' + r.roleId + '">' + esc(r.role.title) + '</a><br><span class="small muted">' + esc(S.explain(r)) + '</span></span><span class="small">' + tag(r.tier, TIER[r.tier].replace(' so far', '')) + (mv ? '<br><span class="' + (mv > 0 ? 'moved-up' : 'moved-down') + '">' + (mv > 0 ? '▲' : '▼') + Math.abs(mv) + '</span>' : '') + '</span></li>';
      }).join('') + '</ol></aside></div>';
  }

  function viewSkillCheck() {
    var role = byId(D.roles, lensId()), gaps = gapsFor(role), top = gaps.slice(0, 3);
    function gapCard(g) {
      var L = D.learning.filter(function (l) { return l.skills.indexOf(g.id) > -1 && l.careers.indexOf(role.id) > -1 && !l.optional; }).slice(0, 1);
      var P = D.projects.filter(function (p) { return p.skills.indexOf(g.id) > -1 && p.careers.indexOf(role.id) > -1; }).slice(0, 2);
      return '<div class="card stack"><div class="row between"><h3>' + esc(g.skill.name) + '</h3>' + tag('', g.required ? 'Usually required' : 'Helpful') + '</div>' + skillEditor(g.skill) +
        (L.length ? '<p class="small"><strong>Learn:</strong> ' + esc(L[0].topic) + ' — <span class="muted">' + esc(L[0].apply) + '</span></p>' : '') +
        (P.length ? '<p class="small"><strong>Prove it with:</strong> ' + P.map(function (p) { return esc(p.title); }).join('; ') + '</p>' : '') +
        '<p class="small muted">Résumé evidence: add a bullet only after you’ve actually done the work.</p></div>';
    }
    var vers = D.resumeVersions.filter(function (v) { return v.for.indexOf(role.id) > -1; })[0] || D.resumeVersions[0];
    return '<p class="small muted">What your résumé shows today versus what the role usually asks for. “Not yet demonstrated” is different from “can’t do”.</p>' + roleSelect('Looking at') +
      '<h2>Top gaps for ' + esc(role.title) + '</h2>' + (top.length ? '<div class="grid cols2">' + top.map(gapCard).join('') + '</div>' : '<div class="card">Nothing flagged for this path.</div>') +
      (gaps.length > 3 ? '<details style="margin-top:1rem"><summary>Show the other ' + (gaps.length - 3) + '</summary><div class="grid cols2" style="margin-top:.75rem">' + gaps.slice(3).map(gapCard).join('') + '</div></details>' : '') +
      '<h2>Recover evidence from your internship</h2><div class="card"><p class="small muted">Answer privately; only add to your résumé what you can confirm. Never backdate or invent duties.</p><ul>' +
      D.internshipPrompts.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ul></div>' +
      '<h2>Three targeted résumé versions</h2><div class="card stack"><p class="small">Suggested for this path: <strong>' + esc(vers.name) + '</strong>. Keep one page, simple ATS-friendly layout, verified outcomes only, and put skills below experience and projects if coding isn’t the point.</p>' +
      '<ul class="small">' + D.resumeVersions.map(function (v) { return '<li>' + esc(v.name) + '</li>'; }).join('') + '</ul>' +
      '<details><summary>Example: truthful reframing of existing bullets</summary>' + D.bulletExamples.map(function (b) { return '<p class="small"><span class="muted">Before:</span> ' + esc(b.before) + '<br><strong>After:</strong> ' + esc(b.after) + '</p>'; }).join('') + '</details>' +
      '<details><summary>Possible future bullets — <span class="tag unv">proposed, not earned yet</span></summary><p class="small muted">Use only after the work is done and approved. Fill in [brackets] with actual facts.</p><ul class="small">' + D.futureBullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></details>' +
      '<label class="field">My résumé notes<textarea id="resumeNotes" data-change="resumeNotes">' + esc(state.resumeNotes) + '</textarea></label></div>';
  }
  /* ---------- Résumé help: where the search is stalling + prompts for her own AI ---------- */
  var OUTCOME_OPTS = [['', 'How did it end?'], ['noReply', 'No reply'], ['auto', 'Automatic rejection email'], ['screen', 'Ended after recruiter screen'], ['interviews', 'Ended after interviews'], ['final', 'Ended after final round']];
  var STAGE_ORDER = ['start', 'noReplies', 'screen', 'middle', 'final'];
  var STAGES = {
    start: { pick: 'I’m just starting, or I’m not sure yet', label: 'Just starting', area: 'Tailoring each application', text: 'The best use of your time right now is matching your résumé to each posting before you apply. Come back and pick another option once you’ve applied to a handful of roles.' },
    noReplies: { pick: 'I apply, but mostly hear nothing or get automatic rejections', label: 'Mostly silence or automatic rejections', area: 'Résumé match and targeting', text: 'This is where the résumé matters most: match it to each posting’s wording, and check you’re aiming at true entry-level roles. Some automatic rejections come from questions a résumé can’t fix, like work authorization or location.' },
    screen: { pick: 'I get recruiter calls, but they don’t go further', label: 'Stopping after the recruiter screen', area: 'Your story and résumé match', text: 'People are talking to you, but it stops after the first call. The résumé got you the call. Now the screen is about your story and whether it matches what the résumé promises.' },
    middle: { pick: 'I get interviews, but stop before the final round', label: 'Stopping in the middle rounds', area: 'Interview skills', text: 'You’re passing the first screen but stopping in the middle rounds. That’s usually interview practice (behavioral or technical answers), not the résumé.' },
    final: { pick: 'I reach final rounds, but no offer yet', label: 'Reaching final rounds, no offer yet', area: 'Standing out and strategy', text: 'Getting to the final round means the résumé is doing its job. The difference now is usually how you stand out, the stories you tell, and your follow-up.' }
  };
  var STAGE_PROMPTS = { start: ['recruiterEye', 'bullets'], noReplies: ['noReplies', 'recruiterEye', 'bullets'], screen: ['screen'], middle: ['middle'], final: ['final'] };
  var PROMPT_INFO = {
    noReplies: ['Why am I not getting replies?', 'Attach your résumé. Paste 2–3 postings you applied to.'],
    recruiterEye: ['A recruiter’s 6-second skim', 'Attach your résumé.'],
    bullets: ['Strengthen my bullets, honestly', 'Attach your résumé.'],
    screen: ['Prepare for the recruiter screen', 'Attach your résumé. Add the posting if you have one.'],
    middle: ['Practice the middle rounds', 'Attach your résumé. Add the posting if you have one.'],
    final: ['Stand out in final rounds', 'Attach your résumé.']
  };
  // The role she is tailoring for: one of her chosen paths (default), another path, or a name she types.
  function tailorRole() {
    var v = ui.rhRole || (state.focus && state.focus[0]) || lensId();
    if (v === '__other') return { role: null, name: ui.rhOther.trim() };
    var r = byId(D.roles, v) || byId(D.roles, lensId());
    return { role: r, name: r ? r.title : '' };
  }
  function roleOptions() {
    var chosen = (state.focus || []).filter(function (id) { return byId(D.roles, id); }), cur = ui.rhRole || chosen[0] || lensId();
    var opt = function (id, label) { return '<option value="' + esc(id) + '"' + (id === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; };
    var rest = D.roles.filter(function (r) { return chosen.indexOf(r.id) < 0; });
    return (chosen.length ? '<optgroup label="Your chosen paths">' + chosen.map(function (id) { return opt(id, byId(D.roles, id).title); }).join('') + '</optgroup>' : '') +
      '<optgroup label="' + (chosen.length ? 'Other paths' : 'Paths') + '">' + rest.map(function (r) { return opt(r.id, r.title); }).join('') + '</optgroup>' +
      '<optgroup label="Not on the list">' + opt('__other', 'Other (type the role name)') + '</optgroup>';
  }
  function oneOfStage(v) { return STAGE_ORDER.indexOf(v) > -1 ? v : ''; }
  function pathsList() {
    var ids = (state.focus && state.focus.length ? state.focus : [lensId()]).slice(0, 3);
    return ids.map(function (id) { return byId(D.roles, id); }).filter(Boolean);
  }
  var PROMPT_RULES = ['RULES',
    '- Use only what is actually in my résumé. Never invent experience, tools, numbers, dates or titles.',
    '- When you cite evidence, quote my résumé’s exact words. If you can’t find evidence, say “not shown on the résumé”. That is different from “I can’t do it”.',
    '- If a bullet would be stronger with a fact you don’t have, ask me a question instead of guessing.',
    '- Be direct and specific. Put the changes that matter most first.',
    '- Keep my résumé honest and easy for automatic screening: simple layout, standard section names, one page.'];
  function promptContext() {
    var ps = pathsList(), seen = {}, skills = [];
    ps.forEach(function (p) { p.req.forEach(function (sid) { var b = byId(D.skills, sid); if (b && !seen[sid]) { seen[sid] = 1; skills.push(b.name); } }); });
    return ['ABOUT ME', '- I’m a recent graduate looking for entry-level roles.', '- Paths I’m aiming for: ' + ps.map(function (p) { return p.title; }).join('; ') + '.',
      skills.length ? '- Skills those paths usually ask for: ' + skills.slice(0, 12).join(', ') + '.' : ''].filter(Boolean);
  }
  function promptText(key) {
    var f = U.funnel(state.apps), head = promptContext(), rules = PROMPT_RULES, lines;
    if (key === 'tailor') {
      var tr = tailorRole(), skillsFor = tr.role ? tr.role.req.map(function (sid) { var sk = byId(D.skills, sid); return sk && sk.name; }).filter(Boolean) : [];
      lines = ['TASK: Tailor my résumé to one job.', '', 'THE JOB',
        '- Role: ' + (tr.name || '[ROLE]'),
        ui.rhEmployer.trim() ? '- Employer: ' + ui.rhEmployer.trim() : '',
        skillsFor.length ? '- Skills this kind of role usually asks for: ' + skillsFor.join(', ') + '.' : '',
        '- Posting text:', ui.posting ? ui.posting : '[PASTE THE FULL JOB POSTING HERE]', '',
        'STEPS',
        '1. List the 8–10 requirements and keywords that matter most in this posting, in order. Separate must-have from nice-to-have.',
        '2. For each one, tell me whether my résumé shows it (quote it), partly shows it, or doesn’t.',
        '3. Name my 3 biggest gaps against this posting. For each, say whether I can fix it honestly by rewording what I already did, or whether it’s a real gap.',
        '4. Suggest specific edits: what to move up, reword (show before and after) and cut. Use the posting’s own wording only where it is true for me.',
        '5. Flag anything that could trip an automatic screen (formatting, missing standard sections, date gaps, missing keywords) and any knockout questions the posting hints at (work authorization, location, degree, years of experience).',
        '6. Give a fit verdict: strong, reasonable or a stretch. Tell me whether to apply and what to do if I do.',
        '7. End with up to 3 questions about my experience whose answers could strengthen the résumé.'].filter(function (x) { return x !== ''; });
    } else if (key === 'noReplies') {
      lines = ['TASK: Work out why I’m getting few replies.', '', 'WHAT I’M SEEING',
        '- I apply to roles but mostly hear nothing back, or get automatic rejections.',
        f.applied >= 3 ? '- My tracker shows ' + f.applied + ' applications and ' + f.heard + ' that reached a real person.' : null,
        '- I’ll paste 2–3 postings I applied to below this prompt.', '',
        'STEPS',
        '1. Check my résumé against those postings: does it use the same words for the same skills?',
        '2. Check my level: am I applying to true entry-level roles, or ones that really need 2–3+ years?',
        '3. Check for automatic-screening problems: layout, section names, dates, anything that may not read correctly.',
        '4. Do a 6-second skim of the top third of my résumé. What would a recruiter take away?',
        '5. Give me the 3 most likely causes, ranked, with evidence from my résumé. Say which ones a résumé can’t fix (work authorization, location, a very crowded posting).',
        '6. Tell me what to change this week, and what to stop doing.'];
    } else if (key === 'recruiterEye') {
      lines = ['TASK: Read my résumé the way a busy recruiter does.', '',
        '1. In 6 seconds, what do you take away about me? Describe it in one sentence, and say which role you’d put me in.',
        '2. Does that match the paths I’m aiming for? If not, what’s sending the wrong signal?',
        '3. What are the 3 strongest things on the page, and are they easy to find?',
        '4. What would a recruiter ask about or doubt? (gaps, unrelated major, thin experience, vague claims)',
        '5. What should I cut, shorten or move?'];
    } else if (key === 'bullets') {
      lines = ['TASK: Strengthen my bullets without making anything up.', '',
        '1. Pick the 5 weakest bullets for the paths I’m aiming for (vague, task-only, no result).',
        '2. For each, ask me 1–2 questions about what I actually did and what changed because of it. Wait for my answers before rewriting.',
        '3. Then show a before and after. Only use facts I gave you. Mark anything that still needs a real number with [brackets] for me to fill in.',
        '4. Tell me which skills from the list above each rewritten bullet now shows.'];
    } else if (key === 'screen') {
      lines = ['TASK: Get me ready for the recruiter screen.', '', 'WHAT I’M SEEING',
        '- I get recruiter calls, but they don’t move forward.',
        f.applied >= 3 ? '- My tracker shows ' + f.applied + ' applications, ' + f.heard + ' reaching a real person.' : null, '',
        'STEPS',
        '1. Write a 60-second “tell me about yourself” for my target role, using only true facts from my résumé.',
        '2. Give me a simple way to answer “why this role” and “why this company”.',
        '3. Prepare me for the standard screen questions: salary expectations, work authorization, start date, and what I know about the company. Ask me for any facts you need.',
        '4. Flag places where my résumé will raise questions (gaps, a different major, short stints) and suggest honest answers.',
        '5. Then run a mock screen: ask one question at a time, wait for my answer, and give me feedback before the next question.'];
    } else if (key === 'middle') {
      lines = ['TASK: Help me practice for the middle interview rounds.', '', 'WHAT I’M SEEING',
        '- I get interviews, but I stop before the final round.', '',
        'STEPS',
        '1. Tell me which interview types are usual for my paths (behavioral, technical or case, hiring manager).',
        '2. List what each line of my résumé invites them to ask about.',
        '3. Help me prepare 6 stories from my real experience, each with the situation, what I did and the result.',
        '4. Run a practice interview: one question at a time, wait for my answer, then score it 1–5 on structure, specifics and relevance, and show a stronger version that uses only my real experience.',
        '5. After 10 questions, tell me the 3 patterns I most need to fix.'];
    } else {
      lines = ['TASK: Help me stand out in final rounds.', '', 'WHAT I’M SEEING',
        '- I reach final rounds, but I haven’t received an offer yet.', '',
        'STEPS',
        '1. Ask me about my last final round, one question at a time: who interviewed me, what they asked, and where I felt weak.',
        '2. Explain what usually decides between similar candidates at this stage, and how I can stand out from other recent graduates with my background.',
        '3. Be honest that I may not be able to know the real reason for a rejection.',
        '4. Write me a short thank-you and follow-up message, and a polite way to ask for feedback after a no.',
        '5. Give me the basics of negotiating if I get an offer.'];
    }
    return head.concat([''], rules, [''], lines.filter(function (x) { return x !== null; }), ['', 'I will attach my résumé.']).join('\n').replace(/\n- \n/g, '\n').replace(/\n{3,}/g, '\n\n');
  }
  function promptCard(key) {
    var info = key === 'tailor' ? ['Tailor my résumé to one job', 'Attach your résumé.'] : PROMPT_INFO[key];
    return '<article class="card stack"><h3>' + esc(info[0]) + '</h3><p class="small muted">' + esc(info[1]) + '</p>' +
      '<details><summary>Preview the prompt</summary><textarea readonly rows="14" aria-label="Prompt preview">' + esc(promptText(key)) + '</textarea></details>' +
      '<div><button class="btn small" data-action="copyPrompt" data-id="' + key + '">Copy prompt</button></div></article>';
  }
  function viewReadiness() {
    var f = U.funnel(state.apps), chosen = state.searchStage, stage = chosen || 'start', S0 = STAGES[stage];
    var hint = { noReplies: 1, screen: 1, middle: 1, final: 1 }[f.stage] && f.stage !== chosen ? f.stage : '';
    var more = ['noReplies', 'recruiterEye', 'bullets', 'screen', 'middle', 'final'].filter(function (k) { return STAGE_PROMPTS[stage].indexOf(k) < 0; });
    return '<h1>Résumé help</h1><p class="lede">Find where your job search is stalling, then get a ready-made prompt for Claude, ChatGPT or Gemini. You attach your résumé in the chat, so it never passes through this app.</p>' +
      '<section class="tool"><p class="eyebrow">For your whole search</p><h2>How is your search going?</h2><p class="small muted">Use this when you’ve been applying for a while and want to know what to work on.</p><fieldset class="card stack" style="border:0"><legend class="small muted">Pick the one that fits best. You can change it any time.</legend>' +
      STAGE_ORDER.map(function (k) { return '<label class="check"><input type="radio" name="searchStage" value="' + k + '" data-change="searchStage"' + (chosen === k ? ' checked' : '') + '><span>' + esc(STAGES[k].pick) + '</span></label>'; }).join('') +
      (chosen ? '<div class="note"><strong>' + esc(S0.label) + '.</strong> Work on: <strong>' + esc(S0.area) + '.</strong> ' + esc(S0.text) + '</div>' : '') +
      (hint ? '<p class="small muted">Your tracker points to “' + esc(STAGES[hint].pick) + '”. <button class="link" data-action="useStage" data-id="' + hint + '">Use this</button></p>' : '') + '</fieldset>' +
      '<h3>' + (chosen ? 'Prompts for “' + esc(S0.label) + '”' : 'Prompts to start with') + '</h3><p class="small muted">' + (chosen ? 'These change with your answer above.' : 'Pick an option above to see prompts for that situation.') + '</p><div class="grid cols2">' + STAGE_PROMPTS[stage].map(promptCard).join('') + '</div>' +
      '<details style="margin-top:1rem"><summary>More prompts</summary><div class="grid cols2" style="margin-top:.75rem">' + more.map(promptCard).join('') + '</div></details></section>' +
      '<section class="tool"><p class="eyebrow">For one job</p><h2>Tailor your résumé to a specific job</h2><p class="small muted">Use this before each application. It works at any stage.</p><div class="card stack">' +
      '<div class="grid cols2"><label class="field"><span>What kind of role is it?</span><select id="rhRole" data-change="uiRole">' + roleOptions() + '</select></label>' +
      '<label class="field"><span>Employer <span class="small muted">(optional)</span></span><input type="text" id="rhEmployer" value="' + esc(ui.rhEmployer) + '" data-change="uiEmployer" maxlength="100"></label></div>' +
      (ui.rhRole === '__other' ? '<label class="field" style="max-width:30rem"><span>Role name</span><input type="text" id="rhOther" value="' + esc(ui.rhOther) + '" data-change="uiOther" maxlength="100" placeholder="For example: Operations Analyst"></label>' : '') +
      '<label class="field"><span>Paste the job posting text <span class="small muted">(assistants often can’t open links; this isn’t saved)</span></span><textarea id="rhPosting" rows="5" data-change="uiPosting">' + esc(ui.posting) + '</textarea></label>' +
      '<details><summary>Preview the prompt</summary><textarea readonly rows="16" aria-label="Prompt preview">' + esc(promptText('tailor')) + '</textarea></details>' +
      '<div><button class="btn" data-action="copyPrompt" data-id="tailor">Copy prompt</button> <span class="small muted">Then paste it into your AI and attach your résumé.</span></div></div></section>' +
      '<div class="note small" style="margin-top:1.5rem"><strong>Before you paste:</strong> your résumé and any posting go to the AI service you choose, not to this app. Remove details you don’t want to share (such as your home address or phone number). The AI can be wrong, so check every suggestion against what is true for you, and only keep edits you can back up in an interview.</div>' +
      '<details style="margin-top:1.5rem"><summary>Skill check: what your paths ask for (optional)</summary><div style="margin-top:.75rem">' + viewSkillCheck() + '</div></details>';
  }
  function skillEditor(sk) {
    return '<div class="row"><label class="small">Status ' + select('sk-' + sk.id, Object.keys(SKILL_STATES).map(function (k) { return [k, SKILL_STATES[k]]; }), sk.state, 'data-change="skillState" data-id="' + sk.id + '"') + '</label></div>' +
      '<label class="field">Evidence / notes<textarea id="skn-' + sk.id + '" data-change="skillNote" data-id="' + sk.id + '">' + esc(sk.note) + '</textarea></label>';
  }

  function viewProjects() {
    var role = byId(D.roles, lensId()), pf = ui.projFilter;
    var list = D.projects.filter(function (p) {
      if (pf.onlyLens && p.careers.indexOf(role.id) < 0) return false;
      if (pf.source !== 'any' && p.source !== pf.source) return false;
      if (pf.coding === 'none' && p.r && p.r[3] > 1) return false;
      return true;
    });
    var cur = state.currentProject && byId(D.projects, state.currentProject);
    return '<h1>Project lab</h1><p class="lede">Real work beats a bullet point. Pick one project at a time and finish it before starting another.</p>' + roleSelect('Show projects for') +
      '<div class="note small" style="margin-top:1rem"><strong>About the M&amp;K projects.</strong> These are <em>hypothetical</em> assignments — we don’t know yet that the business needs them. Confirm the company’s details, get a sponsor (ideally not a parent), use only authorized data, anonymize anything you show, and get approval before sharing outside. Never present projected savings as achieved or claim a title you weren’t given.</div>' +
      '<div class="card row" style="margin-top:1rem"><label class="field">Hours per week available<input type="number" id="wk" min="1" max="60" value="' + esc(state.weeklyHours) + '" data-change="weekly" style="width:6rem"></label>' +
      '<div>' + (cur ? '<strong>Current project:</strong> ' + esc(cur.title) + ' <span class="small muted">(' + PROJ_STATUS[projOf(cur.id).status] + ')</span>' : '<span class="muted">No current project chosen yet.</span>') + '</div></div>' +
      '<div class="row" style="margin:1rem 0"><label class="small"><input type="checkbox" id="pf-lens" data-change="pfilter" data-key="onlyLens"' + (pf.onlyLens ? ' checked' : '') + '> Only this path</label>' +
      '<label class="small">Source ' + select('pf-src', [['any', 'All'], ['real', 'Real business (hypothetical)'], ['public', 'Public data']], pf.source, 'data-change="pfilter" data-key="source"') + '</label>' +
      '<label class="small">Coding ' + select('pf-cod', [['any', 'Any'], ['none', 'Little or none']], pf.coding, 'data-change="pfilter" data-key="coding"') + '</label></div>' +
      (list.length ? '<div class="stack">' + list.map(projectCard).join('') + '</div>' : '<div class="card">No projects match. Untick “Only this path” to see them all.</div>');
  }
  function projectCard(p, forceOpen, extra, label) {
    var st = projOf(p.id), isCur = state.currentProject === p.id, flat = !!label;
    var head = (label ? '<span class="small muted steplabel">' + esc(label) + '</span>' : '') + esc(p.title) + ' ' + tag('', p.source === 'real' ? 'Real business (hypothetical)' : 'Public data') + ' ' + tag('', PROJ_STATUS[st.status]) + (isCur ? ' ' + tag('strong', 'Current') : '');
    return (flat ? '<div class="card"><h2 class="projhead">' + head + '</h2><div class="stack" style="margin-top:.75rem">' : '<details' + (isCur || forceOpen ? ' open' : '') + '><summary>' + head + '</summary><div class="stack" style="margin-top:.75rem">') +
      '<p><strong>Question:</strong> ' + esc(p.q) + '</p>' +
      '<p class="small"><strong>Duration (rough estimate):</strong> ' + esc(p.dur) + (p.r ? ' · <strong>Planning ratings</strong> fit ' + p.r[0] + ' / finance ' + p.r[1] + ' / communication ' + p.r[2] + ' / coding ' + p.r[3] : '') + '</p>' +
      '<p class="small"><strong>Data needed:</strong> ' + esc(p.data) + '</p>' +
      '<div class="small"><strong>Steps</strong><ol>' + p.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' +
      '<p class="small"><strong>Deliverable:</strong> ' + esc(p.deliver) + '</p>' +
      '<p class="small"><strong>Supports paths:</strong> ' + p.careers.map(function (c) { return '<a href="#/role/' + c + '">' + esc(byId(D.roles, c).title) + '</a>'; }).join(', ') + '</p>' +
      (p.honest ? '<div class="note small">' + esc(p.honest) + '</div>' : '') +
      (p.source === 'real' ? '<p class="small muted"><strong>Impact measures</strong> (only record actuals, with denominator and window): accounts analyzed, data coverage, gross-margin baseline, overdue invoice share, concentration, quote win rate, forecast error, cycle time, recommendations accepted.</p>' : '') +
      (extra || '') +
      '<div class="row"><label class="small">Status ' + select('ps-' + p.id, Object.keys(PROJ_STATUS).map(function (k) { return [k, PROJ_STATUS[k]]; }), st.status, 'data-change="projStatus" data-id="' + p.id + '"') + '</label>' +
      (isCur ? '<button class="btn ghost small" data-action="clearProject">Stop focusing on this</button>' : '<button class="btn small" data-action="chooseProject" data-id="' + p.id + '">Make this my current project</button>') + '</div>' +
      (st.status === 'inProgress' || st.status === 'completed' ?
        '<div class="card stack"><h3>Reflection</h3>' + [['energized', 'What energized me'], ['drained', 'What drained me'], ['learned', 'What I learned']].map(function (f) {
          return '<label class="field">' + f[1] + '<textarea id="rf-' + p.id + '-' + f[0] + '" data-change="reflect" data-id="' + p.id + '" data-field="' + f[0] + '">' + esc(st.reflection[f[0]]) + '</textarea></label>';
        }).join('') + '<p class="small muted">No accomplishments are claimed automatically — add verified results to your résumé yourself.</p></div>' : '') +
      '</div>' + (flat ? '</div>' : '</details>');
  }

  function viewLearning() {
    var role = byId(D.roles, lensId()), L = learningFor(role.id), O = learningFor(role.id, true);
    function item(l) {
      var st = state.learning[l.id] || 'notStarted';
      return '<div class="card stack"><div class="row between"><h3>' + esc(l.topic) + '</h3>' + tag('unv', 'Unverified — check provider, price and link') + '</div>' +
        '<p class="small">Fills: ' + l.skills.map(function (s) { return esc(skillOf(s).name); }).join(', ') + '</p><p class="small muted">Put it to use: ' + esc(l.apply) + '</p>' +
        '<label class="small">Status ' + select('ls-' + l.id, [['notStarted', 'Not started'], ['inProgress', 'In progress'], ['done', 'Done']], st, 'data-change="learnStatus" data-id="' + l.id + '"') + '</label></div>';
    }
    return '<h1>Learning plan</h1><p class="lede">Learn just in time, for a project you’re about to do. You don’t need every certificate, and most junior roles don’t require a master’s degree — check each posting.</p>' + roleSelect('Learning for') +
      '<h2>Highest leverage first</h2><div class="grid cols2">' + L.slice(0, 3).map(item).join('') + '</div>' +
      (L.length > 3 ? '<details style="margin-top:1rem"><summary>More topics (' + (L.length - 3) + ')</summary><div class="grid cols2" style="margin-top:.75rem">' + L.slice(3).map(item).join('') + '</div></details>' : '') +
      (O.length ? '<details style="margin-top:1rem"><summary>Optional certifications (not required)</summary><p class="small muted" style="margin-top:.5rem">These are topic suggestions, not credentials you hold. Don’t take them all.</p><div class="grid cols2">' + O.map(item).join('') + '</div></details>' : '');
  }

  function viewPlan() {
    var weeks = [1, 2, 3, 4], done = D.tasks.filter(taskDone).length;
    var role = byId(D.roles, lensId()), rows = topRoles(), cats = {};
    rows.concat([{ role: role }]).forEach(function (r) { r.role.cats.forEach(function (c) { cats[c] = 1; }); });
    var A = function (k, label, type, extra) { return '<label class="field">' + label + '<input type="' + (type || 'text') + '" id="ap-' + k + '" ' + (extra || '') + '></label>'; };
    return '<h1>Action plan &amp; job tracker</h1><p class="lede">Keep applying while you build skills. The plan is a guide — adapt it, skip things, take longer.</p>' +
      '<div class="card"><progress max="' + D.tasks.length + '" value="' + done + '" aria-label="Plan progress"></progress><p class="small">' + done + ' of ' + D.tasks.length + ' steps done</p></div>' +
      weeks.map(function (w) {
        return '<div class="week"><h3>Week ' + w + '</h3><div class="card">' + D.tasks.filter(function (t) { return t.week === w; }).map(function (t) {
          return '<label class="check"><input type="checkbox" id="task-' + t.id + '" data-change="task" data-id="' + t.id + '"' + (taskDone(t) ? ' checked' : '') + (t.auto ? ' disabled' : '') + '><span>' + esc(t.text) + (t.auto ? ' <span class="tag">Tracks itself</span>' : '') + ' ' + taskGo(t) + '</span></label>';
        }).join('') + '</div></div>';
      }).join('') +
      '<h2 id="job-search" class="res-head">Job search</h2><h3 id="find-roles" tabindex="-1">Find roles</h3><div class="card stack"><div class="note small">Official employer posting is the source of truth. Verify graduation window, start date, location, work authorization and experience on the employer’s careers page before applying. Anything below is a lead, not a confirmed opening.</div>' +
      '<p class="small"><strong>Search separate titles</strong> for ' + esc(role.title) + ':</p><ul class="small">' + role.titles.map(function (t) {
        return '<li>' + esc(t) + ' — <a href="https://www.linkedin.com/jobs/search/?keywords=' + encodeURIComponent(t) + '" target="_blank" rel="noopener noreferrer">LinkedIn</a> · <a href="https://www.indeed.com/jobs?q=' + encodeURIComponent(t) + '" target="_blank" rel="noopener noreferrer">Indeed</a></li>';
      }).join('') + '</ul><p class="small muted">Also try: your school’s career services / Handshake, Glassdoor, ZipRecruiter, eFinancialCareers, Built In, Wellfound, CFA Institute Career Center, and employer career pages.</p>' +
      '<details><summary>Eligibility checklist</summary><ul class="small"><li>Accepts recent graduates or 0–2 years’ experience (not student-only)?</li><li>Start date works (immediate or early 2027)?</li><li>Location and work arrangement fit?</li><li>Work authorization requirements met?</li><li>Coding required? SQL, Python/R, predictive modeling, large datasets, A/B testing</li><li>Training or mentorship described?</li></ul></details></div>' +
      '<h3 id="my-tracker" class="res-gap" tabindex="-1">My tracker</h3><div class="card stack">' + (state.apps.length ? state.apps.map(appRow).join('') : '<p class="muted">Nothing here yet. No postings are pre-loaded — add ones you’ve verified.</p>') + '</div>' +
      '<details open style="margin-top:1rem"><summary>Add an application</summary><form data-submit="addApp" class="stack" style="margin-top:.75rem"><div class="grid cols3">' +
      A('employer', 'Employer*', 'text', 'required') + A('title', 'Title*', 'text', 'required') + A('url', 'Link', 'url') +
      '<label class="field">Status' + select('ap-status', APP_STATUS.map(function (s) { return [s, s]; }), 'Saved', '') + '</label></div>' +
      '<details><summary>More details (optional)</summary><div class="grid cols3" style="margin-top:.75rem">' + appExtra('ap', {}) + '</div></details>' +
      '<div><button class="btn">Add to tracker</button></div></form></details>' +
      '<h2 id="resources" class="res-head" tabindex="-1">Resources</h2><h3>Employer watchlist</h3><p class="small muted">For paths you’re looking at. Categories, not confirmed openings.</p><div class="stack">' +
      Object.keys(cats).map(function (c) { return '<details><summary>' + esc(D.companies[c].label) + '</summary><p class="small">' + esc(D.companies[c].names.join(' · ')) + '</p></details>'; }).join('') + '</div>' +
      '<h3 class="res-gap">The fintech title trap</h3><div class="card"><p class="small">The same title can mean very different daily work. Don’t rule out fintech — read the posting.</p><ul class="small">' +
      D.titleTrap.map(function (t) { return '<li><strong>' + t[0] + ':</strong> ' + esc(t[1]) + '</li>'; }).join('') + '</ul><p class="small"><strong>Screening signals:</strong> ' + esc(D.screenSignals.join(', ')) + '. These are signals, not automatic disqualifiers.</p>' +
      '<p class="small"><strong>Questions to ask:</strong> ' + esc(D.weekQuestions.join(' ')) + '</p></div>';
  }
  function appExtra(p, v) {
    var f = function (k, label, type) { return '<label class="field">' + label + '<input type="' + (type || 'text') + '" id="' + p + '-' + k + '" value="' + esc(v[k] || '') + '"></label>'; };
    var elig = ['Not checked', 'Accepts recent grads', 'Needs later graduation window', 'Not stated'];
    return f('location', 'Location') + '<label class="field">Graduation eligibility' + select(p + '-elig', elig.map(function (s) { return [s, s]; }), v.elig || 'Not checked', '') + '</label>' +
      f('experience', 'Experience asked') + f('coding', 'Coding notes') + f('verified', 'Date verified on official page', 'date') + f('next', 'Next step') +
      '<label class="field">Notes<textarea id="' + p + '-notes">' + esc(v.notes || '') + '</textarea></label>';
  }
  function appRow(a, i) {
    if (ui.editApp === i) {
      var f = function (k, label, type, req) { return '<label class="field">' + label + '<input type="' + (type || 'text') + '" id="ep-' + k + '" value="' + esc(a[k] || '') + '"' + (req ? ' required' : '') + '></label>'; };
      return '<form class="card stack" data-submit="saveApp" data-i="' + i + '"><h3>Edit application</h3><div class="grid cols3">' + f('employer', 'Employer*', 'text', 1) + f('title', 'Title*', 'text', 1) + f('url', 'Link', 'url') +
        '<label class="field">Status' + select('ep-status', APP_STATUS.map(function (s) { return [s, s]; }), a.status, '') + '</label><label class="field">How did it end? <span class="small muted">(for closed ones)</span>' + select('ep-outcome', OUTCOME_OPTS, a.outcome || '', '') + '</label>' + appExtra('ep', a) + '</div>' +
        '<div class="row"><button class="btn">Save</button><button type="button" class="link" data-action="cancelEdit">Cancel</button></div></form>';
    }
    return '<div class="card stack"><div class="row between"><strong>' + esc(a.employer) + ' — ' + esc(a.title) + '</strong>' +
      select('as-' + i, APP_STATUS.map(function (s) { return [s, s]; }), a.status, 'data-change="appStatus" data-i="' + i + '" aria-label="Status"') + (a.status === 'Closed' ? select('ao-' + i, OUTCOME_OPTS, a.outcome || '', 'data-change="appOutcome" data-i="' + i + '" aria-label="How it ended"') : '') + '</div>' +
      '<p class="small muted">' + [a.location, a.elig, a.experience, a.coding && 'Coding: ' + a.coding, a.verified ? 'Verified ' + a.verified : 'Not yet verified'].filter(Boolean).map(esc).join(' · ') + '</p>' +
      (a.url ? '<p class="small"><a href="' + esc(/^https?:/i.test(a.url) ? a.url : '#') + '" target="_blank" rel="noopener noreferrer">Official posting</a></p>' : '') +
      (a.next ? '<p class="small"><strong>Next:</strong> ' + esc(a.next) + '</p>' : '') + (a.notes ? '<p class="small">' + esc(a.notes) + '</p>' : '') +
      '<div class="row"><button class="link" data-action="editApp" data-i="' + i + '">Edit</button><button class="link danger" data-action="delApp" data-i="' + i + '">Remove</button></div></div>';
  }


  /* ---------- guided flow: one thing per screen ---------- */
  var STEPS = [['discover', 'Discover', 'Tell us what you like'], ['narrow', 'Narrow', 'Pick 2–3 paths'], ['build', 'Build', 'Plan, courses, projects'], ['apply', 'Apply', 'Update your résumé']];
  var SCALE = [[1, '😖', 'Nope'], [2, '🙁', 'Not really'], [3, '😐', 'It’s fine'], [4, '🙂', 'Like it'], [5, '😍', 'Love it']];
  function stepStrip(cur) {
    var ci = STEPS.map(function (s) { return s[0]; }).indexOf(cur === 'improve' ? 'build' : cur);
    return '<nav class="steps" aria-label="Your progress"><ol>' + STEPS.map(function (s, i) {
      return '<li' + (i === ci ? ' aria-current="step"' : '') + (i < ci ? ' class="done"' : '') + '><button class="stepbtn" data-action="gStep" data-id="' + s[0] + '"><span class="n" aria-hidden="true">' + (i < ci ? '✓' : i + 1) + '</span><span class="t"><strong>' + s[1] + '</strong><span class="small muted">' + s[2] + '</span></span></button></li>';
    }).join('') + '</ol></nav>';
  }
  function viewGuide() {
    var g = state.guide, acts = activities(), html = stepStrip(g.step);
    if (g.step === 'discover') {
      var i = Math.min(g.q, acts.length - 1), a = acts[i], p = state.prefs[a.id] || {};
      if (i === 0 && !state.prefilled && summaryCtx().answered === 0) html += '<p class="small muted">Have a profile file from your mentor? <button class="link" data-action="pickImport">Import it first</button>. It stays on this device.</p>';
      html += '<section class="card hero big" aria-labelledby="q"><p class="small muted">Question ' + (i + 1) + ' of ' + acts.length + ' · there are no wrong answers</p>' +
        '<h1 id="q">How would you feel about this at work?</h1><p class="bigq"><strong>' + esc(a.label) + '</strong></p><p class="muted">' + esc(a.hint || '') + '</p>' +
        '<div class="emojis" role="group" aria-label="' + esc(a.label) + '">' + SCALE.map(function (o) {
          return '<button class="emo' + (p.desired === o[0] ? ' on' : '') + '" data-action="gAnswer" data-id="' + a.id + '" data-v="' + o[0] + '" aria-pressed="' + (p.desired === o[0]) + '"><span aria-hidden="true">' + o[1] + '</span>' + o[2] + '</button>';
        }).join('') + '</div>' +
        '<div class="qrow">' + (i > 0 ? '<button class="link" data-action="gBack">← Back</button>' : '<span></span>') + '<button class="link" data-action="gAnswer" data-id="' + a.id + '" data-v="u">🤷 Not sure — skip</button></div></section>';
    } else if (g.step === 'narrow') {
      var all = ranking(), rows = g.showAll ? all : all.slice(0, 3);
      html += '<h1>' + (g.showAll ? 'All ' + all.length + ' paths' : 'Your best-fit paths right now') + '</h1><p class="lede">Choose up to three to focus on (' + state.focus.length + ' of 3 chosen). You can change this any time.</p>' +
        '<p class="small muted">Bars show what each job is mostly about — a rough estimate, not a promise.</p><div class="cards3">' + rows.map(function (r) {
        var on = state.focus.indexOf(r.roleId) > -1;
        return '<article class="card pathcard' + (on ? ' picked' : '') + '"><h2>' + esc(r.role.title) + '</h2>' + tag(r.tier === 'strong' ? 'strong' : '', TIER[r.tier]) +
          roleShape(r.role) + (g.showAll ? '' : '<p class="small muted">' + esc(S.explain(r)) + '</p>') +
          '<button class="btn' + (on ? '' : ' ghost') + '" data-action="pin" data-id="' + r.roleId + '" aria-pressed="' + on + '">' + (on ? '✓ Chosen' : 'Choose this path') + '</button> <a class="small" href="#/role/' + r.roleId + '">Learn more</a></article>';
      }).join('') + '</div><div class="navrow"><div class="nl"><button class="link" data-action="gStep" data-id="discover">← Change my answers</button></div>' +
        '<div class="nc"><button class="link" data-action="gAll" aria-pressed="' + !!g.showAll + '">' + (g.showAll ? 'Show only my top 3' : 'Show all ' + all.length + ' paths') + '</button></div>' +
        '<div class="nr"><button class="btn" data-action="gStep" data-id="build"' + (state.focus.length ? '' : ' disabled') + '>Next: build experience →</button></div></div>';
    } else if (g.step === 'improve') {
      var fr = topRoles().map(function (r) { return r.role; }), dr = (g.detail && fr.filter(function (r) { return r.id === g.detail; })[0]) || fr[0], dl = learningFor(dr.id, false)[0], dgaps = gapsFor(dr), dps = projectsFor(dr.id), srcList = dps.filter(function (p) { return p.source === (g.src || 'public'); }), pool = srcList.length ? srcList : dps, dp = byId(pool, (g.proj || {})[dr.id]) || pool[0], dsk = gapsFor(dr)[0];
      var lst = dl ? (state.learning[dl.id] || 'notStarted') : '', pst = dp ? projOf(dp.id).status : '', isCur = dp && state.currentProject === dp.id;
      html += '<nav class="crumbs" aria-label="Breadcrumb"><ol><li><button class="link" data-action="gStep" data-id="build">Build</button></li><li aria-current="page">Fill the gaps</li></ol></nav><h1>Fill the gaps for the jobs you want</h1><p class="lede">Pick a path, then work on its project or course. Update the status as you go, and add what you finish to your résumé.</p>' +
        (fr.length > 1 ? '<div class="row" role="group" aria-label="Choose a path">' + fr.map(function (r) { var on = r.id === dr.id; return '<button class="btn small' + (on ? '' : ' ghost') + '" data-action="gDetail" data-id="' + r.id + '" aria-pressed="' + on + '">' + esc(r.title) + '</button>'; }).join('') + '</div>' : '<h2>' + esc(dr.title) + '</h2>') + '<div class="note info small" role="note" style="margin-top:1rem"><strong>' + esc(dr.title) + '</strong> usually asks for: ' + dr.req.map(function (s) { var shown = skillOf(s).state === 'demonstrated'; return shown ? esc(skillOf(s).name) : '<strong>' + esc(skillOf(s).name) + '</strong>'; }).join(', ') + '. ' + (dgaps.length ? '<span class="muted">Bold = not clearly on your résumé yet.</span>' : 'Your résumé already shows these — nice.') + '</div>' + '<div class="row" style="margin:.75rem 0"><label class="small">Work with ' + select('g-src', [['public', 'Public data (anyone can do this)'], ['real', 'A real business I can access (needs their OK)']], g.src || 'public', 'data-change="gSrc"') + '</label>' +
        (pool.length > 1 ? '<label class="small">Project ' + select('g-proj', pool.map(function (p) { return [p.id, p.title]; }), dp.id, 'data-change="gProj" data-id="' + dr.id + '"') + '</label>' : '') + '</div>' +
        (srcList.length ? '' : '<p class="small muted">No ' + ((g.src || 'public') === 'real' ? 'real-business' : 'public-data') + ' project for this path, so showing the other kind.</p>') +
        '<div class="cards3 start">' +
        (dp ? '<div class="stack">' + projectCard(dp, true, (dp.source === 'real' ? '<details><summary>Share with the business: one-page brief</summary><p class="small muted">Send or read this to the person whose business it is, and ask if they’d like it. Nothing is sent from here.</p><textarea readonly rows="14" aria-label="Project brief">' + esc(projectBrief(dp)) + '</textarea><div class="row"><button class="btn small" data-action="copyBrief" data-id="' + dp.id + '">Copy</button><button class="btn ghost small" data-action="dlBrief" data-id="' + dp.id + '">Download .txt</button></div></details>' : ''), 'Fill the gap · Project') + '</div>' : '') +
        (dl ? '<article class="card pathcard"><p class="small muted">Fill the gap · Course</p><h2>' + esc(dl.topic) + '</h2><p>' + (dsk ? 'This builds <strong>' + esc(dsk.skill.name) + '</strong>.' : '') + '</p><p class="small muted"><strong>Try it:</strong> ' + esc(dl.apply) + '</p><p class="small"><strong>Look for:</strong> a university or extension course, or a well-known free one. <span class="tipwrap"><button type="button" class="tip" aria-describedby="tip-' + dl.id + '" aria-label="Why these?">ⓘ</button><span role="tooltip" id="tip-' + dl.id + '" class="tipbox">Courses from a school, or a recognised free provider, are easier for employers to check and look better on a résumé than an unknown course. Check it’s current and, if you can, that you get a certificate or can list it.</span></span> <a href="https://www.google.com/search?q=' + encodeURIComponent(dl.topic + ' course university extension') + '" target="_blank" rel="noopener noreferrer">Search online ↗</a></p>' +
          '<label class="small">Where are you? ' + select('gl-' + dl.id, [['notStarted', 'Not started'], ['inProgress', 'In progress'], ['done', 'Done']], lst, 'data-change="learnStatus" data-id="' + dl.id + '"') + '</label></article>' : '') +
        '</div><div class="navrow"><div class="nl"><button class="link" data-action="gStep" data-id="build">← Back to my plan</button></div><div class="nc"></div><div class="nr"><button class="btn" data-action="gStep" data-id="apply">I finished something → update résumé</button></div></div>';
    } else if (g.step === 'build') {
      var foc = topRoles();
      html += '<h1>Your plan for each path</h1><p class="lede">Each job asks for certain skills, and your résumé doesn’t show some of them yet. That’s the <strong>gap</strong>. Below is the main skill to build for each path, and how to fill it: <strong>make</strong> a small project that proves it, or take an optional short course to learn it first.</p><div class="cards3">' + foc.map(function (r) {
        var role = r.role, gap = gapsFor(role)[0], lr = learningFor(role.id, false)[0], pr = projectsFor(role.id)[0];
        return '<article class="card pathcard"><h2>' + esc(role.title) + '</h2>' +
          '<ul class="todo"><li><strong>Skill to build:</strong> ' + esc(gap ? gap.skill.name : 'None showing') + '</li>' +
          (lr ? '<li><strong>Optional course:</strong> ' + esc(lr.topic) + ' <span class="small muted">— a short online course or tutorial</span></li>' : '') + (pr ? '<li><strong>Project to make:</strong> ' + esc(pr.title) + ' <span class="small muted">— a small piece of work you can show and list on your résumé</span></li>' : '') + '</ul>' +
          '<button class="btn ghost small" data-action="gImprove" data-id="' + role.id + '">Show me how →</button></article>';
      }).join('') + '</div><div class="navrow"><div class="nl"><button class="link" data-action="gStep" data-id="narrow">← Change paths</button></div><div class="nc"></div><div class="nr"><button class="btn" data-action="gImprove" data-id="">Start improving →</button></div></div>';
    } else {
      html += '<h1>Update your résumé, then recheck</h1><p class="lede">Add only what you really did. Then see where you stand.</p><div class="cards3">' +
        '<article class="card"><h2>Résumé help</h2><p>Find where your search is stalling, and get prompts to improve your résumé.</p>' + '<a class="btn ghost" href="#/readiness">Open résumé help</a>' + '</article>' +
        '<article class="card"><h2>Keep applying</h2><p>Track roles you’ve verified.</p><a class="btn ghost" href="#/plan">Open tracker</a></article></div>' +
        '<div class="navrow"><div class="nl"><button class="link" data-action="gStep" data-id="improve">← Back to improving</button></div></div>';
    }
    return html;
  }

  /* ---------- router / render ---------- */
  function render() {
    var h = (location.hash || '#/guide').replace(/^#\//, ''), parts = h.split('/'), view = parts[0] || 'guide', html;
    var map = { guide: viewGuide, home: viewHome, explore: viewExplore, prefs: viewPrefs, readiness: viewReadiness, projects: viewProjects, learning: viewLearning, plan: viewPlan };
    if (view === 'role') html = viewRole(parts[1]); else html = (map[view] || viewGuide)();
    if (TOOLS[view]) html = '<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="#/home">Dashboard</a></li><li aria-current="page">' + TOOLS[view] + '</li></ol></nav>' + html;
    $('#nav').innerHTML = NAV.map(function (n) { return '<a href="#/' + n[0] + '"' + (n[0] === view ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join('');
    var main = $('#main'); main.innerHTML = html;
    if (ui.focusId) { var el = document.getElementById(ui.focusId); if (el) el.focus(); ui.focusId = null; }
  }
  window.addEventListener('hashchange', function () { ui.moves = {}; render(); window.scrollTo(0, 0); $('#main').focus({ preventScroll: true }); });

  /* ---------- mutations ---------- */
  function withMoves(fn) {
    var before = rankMap(); fn(); var after = rankMap(); ui.moves = {};
    Object.keys(after).forEach(function (id) { var d = before[id] - after[id]; if (d) ui.moves[id] = d; });
    save();
  }
  function snapshot() { var s = JSON.stringify(state); return function () { state = Object.assign(fresh(), JSON.parse(s)); save(); ui.moves = {}; render(); }; }

  document.addEventListener('change', function (e) {
    var el = e.target, c = el.dataset && el.dataset.change; if (el.id === 'importFile') return doImport(el);
    if (!c) return; ui.focusId = el.id || null; var id = el.dataset.id, v = el.value;
    switch (c) {
      case 'desired': withMoves(function () { state.prefs[id] = state.prefs[id] || { importance: 2, constraint: null }; state.prefs[id].desired = v === 'u' ? null : +v; }); break;
      case 'theme': state.theme = THEMES.indexOf(v) > -1 ? v : 'classic'; applyTheme(); save(); return;
      case 'renameCustom': state.custom.forEach(function (c) { if (c.id === id && v.trim()) c.label = v.trim(); }); save(); return;
      case 'importance': withMoves(function () { state.prefs[id].importance = +v; }); break;
      case 'constraint': withMoves(function () { state.prefs[id].constraint = v || null; }); break;
      case 'profile': state.profile[el.dataset.key] = v; save(); return;
      case 'filter': ui.f[el.dataset.key] = v; break;
      case 'pfilter': ui.projFilter[el.dataset.key] = el.type === 'checkbox' ? el.checked : v; break;
      case 'lens': state.lensRole = v; save(); break;
      case 'compare':
        if (el.checked) { if (state.compare.length >= 3) { el.checked = false; toast('You can compare up to three paths. Untick one first.'); return; } state.compare.push(id); }
        else state.compare = state.compare.filter(function (x) { return x !== id; });
        save(); break;
      case 'skillState': state.skills[id] = Object.assign({}, state.skills[id], { state: v }); save(); break;
      case 'skillNote': state.skills[id] = Object.assign({}, state.skills[id], { note: v }); save(); return;
      case 'gSrc': state.guide.src = v; save(); break;
      case 'gProj': state.guide.proj = state.guide.proj || {}; state.guide.proj[id] = v; save(); break;
      case 'resumeNotes': state.resumeNotes = v; save(); return;
      case 'projStatus': var p = clone(projOf(id)); p.status = v; state.projects[id] = p; save(); break;
      case 'reflect': var q = clone(projOf(id)); q.reflection[el.dataset.field] = v; state.projects[id] = q; save(); return;
      case 'weekly': state.weeklyHours = Math.max(1, Math.min(60, +v || 5)); save(); return;
      case 'mentorOpt': ui.mentor[el.dataset.key] = el.checked; ui.mentor.open = true; ui.focusId = null; break;
      case 'learnStatus': state.learning[id] = v; save(); break;
      case 'task': if (el.checked) state.tasks[id] = true; else delete state.tasks[id]; save(); break;
      case 'appStatus': var wasClosed = state.apps[+el.dataset.i].status === 'Closed'; state.apps[+el.dataset.i].status = v; save(); if (wasClosed || v === 'Closed') break; return;
      case 'appOutcome': state.apps[+el.dataset.i].outcome = v; save(); return;
      case 'uiRole': ui.rhRole = v; break;
      case 'uiOther': ui.rhOther = v.slice(0, 100); break;
      case 'uiEmployer': ui.rhEmployer = v.slice(0, 100); break;
      case 'uiPosting': ui.posting = v.slice(0, 20000); break;
      case 'searchStage': state.searchStage = oneOfStage(v); save(); break;
    }
    render();
  });

  document.addEventListener('submit', function (e) {
    var f = e.target.dataset.submit; if (!f) return; e.preventDefault();
    if (f === 'addCustom') {
      var name = $('#customName').value.trim(); if (!name) return;
      var id = 'custom' + Date.now(); state.custom.push({ id: id, label: name });
      state.prefs[id] = { desired: null, importance: 2, constraint: null, source: 'Added by you.' }; save(); render(); toast('Added. It’s saved as a note and doesn’t affect ranking (no role data for it).');
    }
    if (f === 'saveApp') {
      var ix = +e.target.dataset.i, ge = function (k) { return ((document.getElementById('ep-' + k)) || {}).value || ''; }, cur = state.apps[ix];
      if (cur) { ['employer', 'title', 'url'].forEach(function (k) { cur[k] = ge(k).trim(); }); ['status', 'outcome', 'location', 'elig', 'experience', 'coding', 'verified', 'next', 'notes'].forEach(function (k) { cur[k] = ge(k); }); }
      ui.editApp = null; save(); render(); toast('Saved.'); return;
    }
    if (f === 'addApp') {
      var g = function (k) { return ($('#ap-' + k) || {}).value || ''; };
      state.apps.unshift({ employer: g('employer').trim(), title: g('title').trim(), url: g('url').trim(), location: g('location'), elig: g('elig'), experience: g('experience'), coding: g('coding'), verified: g('verified'), next: g('next'), notes: g('notes'), status: g('status') || 'Saved' });
      save(); render(); toast('Added to your tracker.');
    }
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]'); if (!el) return; var a = el.dataset.action, id = el.dataset.id;
    switch (a) {
      case 'gStep': state.guide.step = id; if (id !== 'improve') state.guide.detail = null; save(); render(); window.scrollTo(0, 0); break;
      case 'copyBrief':
        var bt = projectBrief(byId(D.projects, id));
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(bt).then(function () { toast('Brief copied.'); }, function () { toast('Couldn’t copy — select the text and copy it yourself.'); });
        else toast('Select the text and copy it yourself.');
        return;
      case 'dlBrief':
        var bp = byId(D.projects, id), bl = new Blob([projectBrief(bp)], { type: 'text/plain' }), ba = document.createElement('a');
        ba.href = URL.createObjectURL(bl); ba.download = 'project-brief-' + id + '.txt'; document.body.appendChild(ba); ba.click(); ba.remove();
        setTimeout(function () { URL.revokeObjectURL(ba.href); }, 1000); return;
      case 'gImprove': state.guide.step = 'improve'; state.guide.detail = id || null; save(); render(); window.scrollTo(0, 0); break;
      case 'gDetail': state.guide.detail = id || null; save(); render(); window.scrollTo(0, 0); break;
      case 'goTo':
        if (id.charAt(0) === '#') { var tg = document.getElementById(id.slice(1)); if (tg) { tg.scrollIntoView({ block: 'start' }); tg.focus({ preventScroll: true }); } else { location.hash = '#/plan'; setTimeout(function () { var t2 = document.getElementById(id.slice(1)); if (t2) { t2.scrollIntoView({ block: 'start' }); t2.focus({ preventScroll: true }); } }, 50); } return; }
        state.guide.step = id; state.guide.detail = null; save();
        if (location.hash === '#/guide') { render(); window.scrollTo(0, 0); } else location.hash = '#/guide';
        return;
      case 'gAll': state.guide.showAll = !state.guide.showAll; save(); render(); break;
      case 'gBack': state.guide.q = Math.max(0, state.guide.q - 1); save(); render(); break;
      case 'gAnswer':
        withMoves(function () { state.prefs[id] = state.prefs[id] || { importance: 2, constraint: null, source: '' }; state.prefs[id].desired = el.dataset.v === 'u' ? null : +el.dataset.v; });
        if (state.guide.q + 1 >= activities().length) state.guide.step = 'narrow'; else state.guide.q++;
        save(); render(); window.scrollTo(0, 0); break;
      case 'pin':
        if (state.focus.indexOf(id) > -1) state.focus = state.focus.filter(function (x) { return x !== id; });
        else if (state.focus.length >= 3) { toast('Focus on up to three paths. Unpin one first.'); return; } else state.focus.push(id);
        save(); render(); break;
      case 'setLens': state.lensRole = id; save(); if (el.tagName === 'A') return; toast('Readiness, Projects and Learning now follow this path.'); break;
      case 'clearFilters': ui.f = { sort: 'match', coding: 'any', client: 'any', finance: 'any', coord: 'any', coordExt: 'any', ready: 'any', family: 'any' }; render(); break;
      case 'resetPrefs':
        if (!confirm('Reset your preferences to the starting point? Your current answers will be replaced (you can undo right after).')) return;
        var u = snapshot(); withMoves(function () { state.prefs = clone(D.seedPrefs); state.custom = []; state.hidden = []; }); render(); toast('Preferences reset.', u); break;
      case 'toggleEdit': ui.editing = ui.editing === id ? null : id; ui.focusId = 'edit-' + id; render(); break;
      case 'delAct': ui.editing = null; var u2 = snapshot(); withMoves(function () {
          if (id.indexOf('custom') === 0) { state.custom = state.custom.filter(function (c) { return c.id !== id; }); delete state.prefs[id]; }
          else if (state.hidden.indexOf(id) < 0) state.hidden.push(id);
        }); render(); toast('Removed — it no longer affects your ranking.', u2); break;
      case 'restoreAct': withMoves(function () { state.hidden = state.hidden.filter(function (x) { return x !== id; }); }); render(); break;
      case 'chooseProject':
        var curP = state.currentProject && projOf(state.currentProject).status === 'inProgress' && state.currentProject !== id;
        if (curP && !confirm('You already have a project in progress. Switch focus anyway? Its progress is kept.')) return;
        state.currentProject = id; var pp = clone(projOf(id)); if (pp.status === 'idea') pp.status = 'proposed'; state.projects[id] = pp; save(); render(); break;
      case 'clearProject': state.currentProject = null; save(); render(); break;
      case 'editApp': ui.editApp = +el.dataset.i; render(); var ee = document.getElementById('ep-employer'); if (ee) ee.focus(); break;
      case 'cancelEdit': ui.editApp = null; render(); break;
      case 'delApp': var u3 = snapshot(); state.apps.splice(+el.dataset.i, 1); save(); render(); toast('Removed from tracker.', u3); break;
      case 'undo': if (ui.undo) { ui.undo(); $('#toast').className = ''; ui.undo = null; } break;
      case 'export': doExport(); return;
      case 'pickImport': document.getElementById('importFile').click(); return;
      case 'copySummary':
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(summaryText()).then(function () { toast('Summary copied.'); }, function () { toast('Couldn’t copy. Use Download instead.'); });
        else toast('Couldn’t copy. Use Download instead.'); return;
      case 'useStage': state.searchStage = oneOfStage(id); save(); render(); return;
      case 'copyPrompt':
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(promptText(id)).then(function () { toast('Prompt copied. Paste it into your AI and attach your résumé.'); }, function () { toast('Couldn’t copy. Open the preview and copy it yourself.'); });
        else toast('Couldn’t copy. Open the preview and copy it yourself.'); return;
      case 'dlSummary': download('career-compass-summary-' + new Date().toISOString().slice(0, 10) + '.txt', summaryText(), 'text/plain'); toast('Summary downloaded.'); return;
      case 'resetAll':
        if (!confirm('Erase ALL your answers, notes, tracker entries and progress in this browser? Consider exporting first. You can undo right after.')) return;
        var u4 = snapshot(); state = fresh(); ui.moves = {}; save(); render(); toast('Everything reset.', u4); break;
    }
  });

  /* ---------- export / import ---------- */
  var APP_VERSION = '2026-11-24';
  function download(name, text, type) {
    var blob = new Blob([text], { type: type }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function doExport() {
    state.lastBackup = new Date().toISOString(); save();
    download('career-compass-backup-' + state.lastBackup.slice(0, 10) + '.json', JSON.stringify(CCUserData.envelope(state, 'backup', APP_VERSION), null, 2), 'application/json');
    render(); toast('Backup downloaded. It contains your personal notes, so keep it private.');
  }
  function summaryCtx() {
    var acts = activities();
    return { planDone: D.tasks.filter(taskDone).length, planTotal: D.tasks.length, totalQuestions: acts.length,
      answered: acts.filter(function (x) { return state.prefs[x.id] && state.prefs[x.id].desired != null; }).length };
  }
  function summaryText() { return CCUserData.mentorSummary(state, D, ui.mentor, summaryCtx()); }
  function doImport(input) {
    var file = input.files && input.files[0]; if (!file) return;
    if (file.size > CCUserData.MAX_FILE_CHARS) { toast('That file is too large to be a Career Compass file.'); input.value = ''; return; }
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var res = CCUserData.parseImport(String(rd.result), fresh(), D);
        if (!confirm('Import this file and replace what’s currently in this browser? You can undo right after.')) { input.value = ''; return; }
        var u = snapshot(); state = res.state; save(); ui.moves = {}; applyTheme(); render(); toast(res.kind === 'profile' ? 'Profile imported. It stays on this device. You can delete the file now.' : 'Backup restored.', u);
      } catch (err) { toast('Couldn’t import: ' + err.message + '.'); }
      input.value = '';
    };
    rd.readAsText(file);
  }

  function applyTheme() { if (THEMES.indexOf(state.theme) < 0) state.theme = 'classic'; document.documentElement.dataset.theme = state.theme; var t = $('#theme'); if (t) t.value = state.theme; }
  applyTheme();
  render();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* optional */ }
})();
