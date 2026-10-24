//#section core
function nowMs() { return Date.now(); }
function uid(n) { var s = '', h = '0123456789abcdef'; for (var i = 0; i < n; i++) s += h[Math.floor(Math.random() * 16)]; return s; }
function addSpan(ctx, name, type, t0, t1, input, output, attrs) {
  ctx.spans.push({ id: uid(16), name: name, type: type, t0: t0, t1: t1, input: (input === undefined ? null : input), output: (output === undefined ? null : output), attrs: attrs || {} });
}
function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9%.]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function wordCount(s) { var t = String(s || '').trim(); return t ? t.split(/\s+/).length : 0; }
function uniq(a) { return Array.from(new Set(a)); }
//#section csv
function parseCSV(text) {
  var rows = [], row = [], cur = '', q = false, s = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  for (var i = 0; i < s.length; i++) {
    var c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  rows = rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
  if (!rows.length) return [];
  var head = rows[0].map(function (h) { return String(h).trim(); });
  return rows.slice(1).map(function (r) { var o = {}; head.forEach(function (h, i) { o[h] = (r[i] == null ? '' : String(r[i])).trim(); }); return o; });
}
//#section dates
var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function pd(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim()); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; }
function addDays(ms, d) { return ms + d * 86400000; }
function diffDays(a, b) { return Math.round((a - b) / 86400000); }
function fmt(ms) { if (isNaN(ms)) return 'unknown'; var d = new Date(ms); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
function fmtDay(ms) { if (isNaN(ms)) return 'unknown'; return DAYS[new Date(ms).getUTCDay()] + ' ' + fmt(ms); }
function asOfMs(ctx) { return pd(ctx.as_of); }
function startMs(ctx) { return pd(ctx.project_start); }
//#section board
function loadTasks(csv) {
  return parseCSV(csv).filter(function (r) { return r.task_id; }).map(function (r) {
    return { id: r.task_id, name: r.task_name, status: r.status, assignee: r.assignee, priority: r.priority, sprint: r.sprint, due: r.due_date, dueMs: pd(r.due_date), labels: r.labels, description: r.description };
  });
}
function countBy(tasks) {
  var c = { 'Done': 0, 'In Progress': 0, 'To Do': 0, 'Blocked': 0 };
  tasks.forEach(function (t) { c[t.status] = (c[t.status] || 0) + 1; });
  c.Total = tasks.length;
  return c;
}
function blockedReason(t) { var m = /BLOCKED:\s*(.*)$/i.exec(t.description || ''); return m ? m[1].trim() : (t.description || ''); }
function taskFacts(tasks, asOfMs, sprint) {
  var open = function (t) { return t.status !== 'Done'; };
  var inScope = sprint ? tasks.filter(function (t) { return t.sprint === sprint; }) : tasks;
  var overdue = tasks.filter(function (t) { return open(t) && t.dueMs < asOfMs; }).map(function (t) { return Object.assign({}, t, { days_overdue: diffDays(asOfMs, t.dueMs) }); });
  var blocked = tasks.filter(function (t) { return t.status === 'Blocked'; }).map(function (t) { return Object.assign({}, t, { days_to_due: diffDays(t.dueMs, asOfMs), reason: blockedReason(t) }); });
  var dueSoon = tasks.filter(function (t) { return open(t) && t.status !== 'Blocked' && t.dueMs >= asOfMs && diffDays(t.dueMs, asOfMs) <= 7; }).map(function (t) { return Object.assign({}, t, { days_to_due: diffDays(t.dueMs, asOfMs) }); });
  var atRisk = [];
  blocked.forEach(function (t) { atRisk.push({ id: t.id, name: t.name, status: t.status, assignee: t.assignee, sprint: t.sprint, due: t.due, kind: 'Blocked', reason: 'Blocked: ' + t.reason + ' (due ' + fmt(t.dueMs) + ', ' + t.days_to_due + ' days from the as-of date)' }); });
  overdue.forEach(function (t) { if (t.status !== 'Blocked') atRisk.push({ id: t.id, name: t.name, status: t.status, assignee: t.assignee, sprint: t.sprint, due: t.due, kind: 'Overdue', reason: 'Overdue by ' + t.days_overdue + ' days: due ' + fmt(t.dueMs) + ' and status is ' + t.status }); });
  dueSoon.forEach(function (t) { atRisk.push({ id: t.id, name: t.name, status: t.status, assignee: t.assignee, sprint: t.sprint, due: t.due, kind: 'Due soon', reason: 'Due in ' + t.days_to_due + ' days (' + fmt(t.dueMs) + ') and status is ' + t.status }); });
  return { all: tasks, scope: inScope, sprint: sprint || null, counts_all: countBy(tasks), counts_scope: countBy(inScope), overdue: overdue, blocked: blocked, dueSoon: dueSoon, atRisk: atRisk };
}
var HEALTH_RULE = 'GREEN: no blocked, overdue or soon-due open tasks. AMBER: at least one blocked task, one overdue open task, or an In Progress task due within 7 days. RED: 2 or more overdue open tasks, or a blocked task due within 14 days.';
function healthOf(f) {
  var reasons = [], level = 'GREEN';
  if (f.blocked.length) { level = 'AMBER'; reasons.push(f.blocked.length + ' blocked task(s): ' + f.blocked.map(function (t) { return t.id; }).join(', ')); }
  if (f.overdue.length) { level = 'AMBER'; reasons.push(f.overdue.length + ' overdue open task(s): ' + f.overdue.map(function (t) { return t.id; }).join(', ')); }
  var soonIP = f.dueSoon.filter(function (t) { return t.status === 'In Progress'; });
  if (soonIP.length) { level = 'AMBER'; reasons.push(soonIP.length + ' In Progress task(s) due within 7 days: ' + soonIP.map(function (t) { return t.id; }).join(', ')); }
  var blockedNear = f.blocked.filter(function (t) { return t.days_to_due <= 14; });
  if (f.overdue.length >= 2 || blockedNear.length) level = 'RED';
  if (!reasons.length) reasons.push('No blocked, overdue or soon-due open tasks');
  return { level: level, reasons: reasons, rule: HEALTH_RULE };
}
//#section timeline
function loadTimeline(csv) {
  return parseCSV(csv).filter(function (r) { return r.phase; }).map(function (r) {
    return { phase: +r.phase, name: r.phase_name, start: +r.start_week, end: +r.end_week,
      activities: String(r.key_activities || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean),
      milestones: String(r.milestones_deliverables || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean) };
  });
}
function phaseDates(p, projStartMs) { return { startMs: addDays(projStartMs, (p.start - 1) * 7), endMs: addDays(projStartMs, (p.end - 1) * 7 + 4) }; }
function milestoneList(phases, projStartMs) {
  var out = [];
  phases.forEach(function (p) { var d = phaseDates(p, projStartMs); p.milestones.forEach(function (m) { out.push({ phase: p.phase, phase_name: p.name, milestone: m, dueMs: d.endMs, week: p.end }); }); });
  return out;
}
//#section ukdates
// convert US-style dates ("April 24, 2026", "Apr 24 2026") written by the model into UK style ("24 April 2026")
function ukDates(text) {
  return String(text == null ? '' : text).replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/g, function (m, mo, d, y) { return d + ' ' + mo + ' ' + y; });
}
//#section validate
function taskIdsIn(text) { return uniq(String(text || '').match(/\bT\d{3}\b/g) || []); }
function riskIdsIn(text) { return uniq(String(text || '').match(/\bR\d{2}\b/g) || []); }
function numbersIn(text) { return uniq((String(text || '').replace(/(\d),(?=\d{3}\b)/g, '$1').match(/\d+(?:\.\d+)?%?/g) || [])); }
// numbers that are percentages or >= 25 and absent from the source text: likely invented figures
function ungroundedNumbers(text, sourceText, extraAllowed) {
  var src = numbersIn(sourceText).concat(extraAllowed || []).map(String);
  return numbersIn(text).filter(function (n) {
    var v = parseFloat(n);
    if (/^\d{3}$/.test(n) && String(text).indexOf(',' + n) < 0) return false;
    if (!(n.indexOf('%') >= 0 || v >= 25)) return false;
    if (v >= 2000 && v <= 2100) return false; // years
    return src.indexOf(n) < 0;
  });
}
function sentences(t) { return String(t == null ? '' : t).split(/(?<=[.!?])\s+/).filter(Boolean); }
// remove sentences that contain figures (percentages or numbers >= 25) that are not in the source
function scrub(text, source, extra) {
  var keep = [], removed = [];
  sentences(text).forEach(function (x) { if (ungroundedNumbers(x, source, extra).length) removed.push(x); else keep.push(x); });
  return { text: keep.join(' ').trim(), removed: removed };
}
function strip(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
//#section render
function cell(c) { return String(c == null ? '' : c).replace(/\|/g, '/').replace(/\r?\n/g, ' '); }
function mdTable(h, rows) {
  if (!rows.length) return '_None._';
  return '| ' + h.join(' | ') + ' |\n|' + h.map(function () { return '---'; }).join('|') + '|\n' + rows.map(function (r) { return '| ' + r.map(cell).join(' | ') + ' |'; }).join('\n');
}
function taskRows(ts) { return ts.map(function (t) { return [t.id, t.name, t.status, t.assignee, t.sprint, fmt(t.dueMs)]; }); }
var TASK_HEAD = ['ID', 'Task', 'Status', 'Owner', 'Sprint', 'Due'];
//#section llm
function parseLLM(resp) {
  if (!resp || resp.error || !resp.choices || !resp.choices[0]) {
    var msg = (resp && resp.error && (resp.error.message || resp.error)) || 'no response from the model';
    return { ok: false, error: String(msg).slice(0, 300), usage: { input: 0, output: 0 }, obj: null };
  }
  var content = (resp.choices[0].message && resp.choices[0].message.content) || '';
  var obj = null;
  try { obj = JSON.parse(content); } catch (e) { var m = /\{[\s\S]*\}/.exec(content); if (m) { try { obj = JSON.parse(m[0]); } catch (e2) { obj = null; } } }
  var u = resp.usage || {};
  return { ok: !!obj, obj: obj, raw: content, error: obj ? null : 'model output was not valid JSON', usage: { input: u.prompt_tokens || 0, output: u.completion_tokens || 0 }, model: resp.model };
}
function recordLLM(ctx, name, t0, req, parsed) {
  var t1 = Date.now();
  parsed.usage = { input: Number(parsed.usage && parsed.usage.input) || 0, output: Number(parsed.usage && parsed.usage.output) || 0 };
  var cost = (parsed.usage.input * ctx.cfg.price_in_per_m + parsed.usage.output * ctx.cfg.price_out_per_m) / 1e6;
  ctx.usage.input += parsed.usage.input; ctx.usage.output += parsed.usage.output; ctx.usage.cost += cost; ctx.usage.calls += 1;
  addSpan(ctx, name, 'generation', t0, t1, req.messages, parsed.ok ? parsed.obj : { error: parsed.error }, { model: parsed.model || req.model, in: parsed.usage.input, out: parsed.usage.output, cost: cost, status: parsed.ok ? 'ok' : 'error' });
  ctx.agents_used.push(name);
}
function buildReq(ctx, system, userObj) {
  return { model: ctx.cfg.model, temperature: 0, response_format: { type: 'json_object' }, max_tokens: ctx.cfg.max_tokens,
    messages: [{ role: 'system', content: system }, { role: 'user', content: typeof userObj === 'string' ? userObj : JSON.stringify(userObj) }] };
}
