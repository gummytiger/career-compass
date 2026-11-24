/* Career Compass — transparent, deterministic scoring.
 * Pure functions, no DOM. Works in browser (window.CCScoring) and Node (require).
 *
 * Three things are kept separate:
 *   1. role attributes (how much of each activity the role involves, 1–5, estimates)
 *   2. user interest   (desired intensity 1–5 per activity, or null = unknown)
 *   3. readiness       (what the résumé shows today; never used to exclude)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CCScoring = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STRONG = 0.72;
  var POSSIBLE = 0.5;

  /** similarity of desired intensity vs role intensity, 0..1 */
  function similarity(desired, roleVal) {
    return 1 - Math.abs(desired - roleVal) / 4;
  }

  function scoreRole(role, prefs, activities) {
    var wsum = 0, ssum = 0, known = 0;
    var matches = [], mismatches = [], conflicts = [];

    (activities || []).forEach(function (act) {
      var rv = role.attrs ? role.attrs[act.id] : undefined;
      if (rv == null) return;                       // role value unresearched → excluded
      var p = prefs && prefs[act.id];
      if (!p) return;

      if (p.constraint === 'avoid' && rv >= 4)
        conflicts.push({ id: act.id, label: act.label, kind: 'avoid', roleVal: rv });
      if (p.constraint === 'require' && rv <= 2)
        conflicts.push({ id: act.id, label: act.label, kind: 'require', roleVal: rv });

      if (p.desired == null) return;                // unknown preference → excluded
      var w = p.importance || 2;
      var sim = similarity(p.desired, rv);
      wsum += w; ssum += w * sim; known++;
      var item = { id: act.id, label: act.label, desired: p.desired, roleVal: rv, sim: sim };
      if (sim >= 0.75) matches.push(item);
      else if (sim <= 0.5) mismatches.push(item);
    });

    var base = (role.baselineFit - 1) / 4;          // cold-start hypothesis only
    var pref = wsum > 0 ? ssum / wsum : null;
    var blend = Math.min(1, known / 4);             // 4+ answers → fully preference-driven
    var score = pref == null ? base : blend * pref + (1 - blend) * base;

    var tier = conflicts.length ? 'conflict'
      : score >= STRONG ? 'strong'
      : score >= POSSIBLE ? 'possible' : 'explore';
    var confidence = known >= 6 ? 'higher' : known >= 3 ? 'medium' : 'low';

    matches.sort(function (a, b) { return b.sim - a.sim; });
    mismatches.sort(function (a, b) { return a.sim - b.sim; });

    return {
      roleId: role.id, score: score, tier: tier, known: known, confidence: confidence,
      usedBaselineOnly: pref == null, matches: matches, mismatches: mismatches, conflicts: conflicts
    };
  }

  /** Rank roles. sortBy: 'match' (default) | 'readiness'. Conflicts always sink below others in 'match'. */
  function rankRoles(roles, prefs, activities, sortBy) {
    var rows = roles.map(function (r) {
      var s = scoreRole(r, prefs, activities); s.role = r; return s;
    });
    rows.sort(function (a, b) {
      if (sortBy === 'readiness') {
        return (b.role.readiness - a.role.readiness) || (b.score - a.score) || a.role.title.localeCompare(b.role.title);
      }
      var ca = a.tier === 'conflict' ? 1 : 0, cb = b.tier === 'conflict' ? 1 : 0;
      if (ca !== cb) return ca - cb;
      return (b.score - a.score) || (b.role.baselineFit - a.role.baselineFit) || a.role.title.localeCompare(b.role.title);
    });
    return rows;
  }

  /** One-line, human reason (never a percentage). */
  function explain(row) {
    var bits = [];
    if (row.usedBaselineOnly) return 'Starting hypothesis only — answer a few preferences to personalise this.';
    // Wording is about AMOUNT, so "dislike coding" + "light coding role" reads correctly.
    row.matches.slice(0, 2).forEach(function (m) { bits.push('amount of ' + m.label.toLowerCase() + ' fits what you want'); });
    row.mismatches.slice(0, 1).forEach(function (m) {
      bits.push(m.label.toLowerCase() + (m.roleVal > m.desired ? ' may be more than you want' : ' may be less than you want'));
    });
    row.conflicts.slice(0, 1).forEach(function (c) {
      bits.push(c.kind === 'avoid' ? 'conflicts with your must-avoid: ' + c.label : 'lacks your must-have: ' + c.label);
    });
    return bits.length ? bits.join('; ') + '.' : 'Mixed signals so far.';
  }

  return { scoreRole: scoreRole, rankRoles: rankRoles, explain: explain, similarity: similarity, STRONG: STRONG, POSSIBLE: POSSIBLE };
});
