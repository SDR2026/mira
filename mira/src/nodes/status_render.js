//@uses core,csv,dates,board,timeline,validate,render,llm
const inp = $input.first().json;
const ctx = inp.ctx;
const parsed = parseLLM(inp.resp);
recordLLM(ctx, 'Status Reporter', ctx.llm_t0, inp.request_body, parsed);
const t0 = Date.now();
const tasks = loadTasks(ctx.data.board_csv);
const asOf = asOfMs(ctx);
const f = taskFacts(tasks, asOf, ctx.sprint);
const h = healthOf(f);
const ids = tasks.map(function (t) { return t.id; });
const g = { agent: 'Status Reporter', warnings: [], dropped: [], metrics: {} };
const o = parsed.ok ? parsed.obj : {};
if (!parsed.ok) g.warnings.push('Model narrative unavailable (' + parsed.error + '). Counts, tables and health are computed from the CSV and are complete.');
// narrative guardrail: drop anything that cites a task id that is not on the board
let summary = strip(o.summary);
if (summary && taskIdsIn(summary).some(function (x) { return ids.indexOf(x) < 0; })) { g.dropped.push('Summary cited an unknown task id and was withheld'); summary = ''; }
const okItem = function (x, field) { return x && ids.indexOf(String(x.task_id)) >= 0 && strip(x[field]) && taskIdsIn(x[field]).every(function (y) { return ids.indexOf(y) >= 0; }); };
const attn = (Array.isArray(o.attention) ? o.attention : []).filter(function (x) { return okItem(x, 'note'); }).map(function (x) { return { task_id: x.task_id, note: x.note }; });
const acts = (Array.isArray(o.next_actions) ? o.next_actions : []).filter(function (x) { return okItem(x, 'action'); }).map(function (x) { return { task_id: x.task_id, action: x.action }; });
const rawN = (Array.isArray(o.attention) ? o.attention.length : 0) + (Array.isArray(o.next_actions) ? o.next_actions.length : 0);
if (rawN - attn.length - acts.length) g.dropped.push((rawN - attn.length - acts.length) + ' narrative item(s) cited unknown task ids');
const allowedNums = [];
[f.counts_all, f.counts_scope].forEach(function (c) { Object.keys(c).forEach(function (k) { allowedNums.push(String(c[k])); }); });
f.overdue.forEach(function (t) { allowedNums.push(String(t.days_overdue)); });
const sc1 = function (t) { const r = scrub(t, '', allowedNums); r.removed.forEach(function (x) { g.dropped.push('Sentence with a figure that does not match the computed facts removed: "' + x.slice(0, 80) + '"'); }); return r.text; };
summary = sc1(summary);
attn.forEach(function (x) { x.note = sc1(x.note); });
acts.forEach(function (x) { x.action = sc1(x.action); });
g.metrics.status_counts_computed = f.counts_all;
const scopeName = ctx.sprint || 'whole board';
const sc = f.scope;
const cs = f.counts_scope, ca = f.counts_all;
let md = '# Weekly status report: ' + (ctx.sprint || 'whole task board') + '\n\n';
md += '**As of:** ' + fmtDay(asOf) + '  \n**Scope:** ' + (ctx.sprint ? ctx.sprint + ' (' + sc.length + ' tasks). Board-wide counts and blockers are shown for context.' : 'all ' + tasks.length + ' tasks') + '  \n**Source:** task board CSV (' + tasks.length + ' tasks)\n\n';
md += '## Overall health: ' + h.level + '\n' + h.reasons.map(function (r) { return '- ' + r; }).join('\n') + '\n\n_Rule used: ' + h.rule + '_\n\n';
if (summary) md += '## Summary\n' + summary + '\n\n';
md += '## Task counts\n' + mdTable(['Status', ctx.sprint ? ctx.sprint : 'Whole board', 'Whole board'], ['Done', 'In Progress', 'To Do', 'Blocked', 'Total'].map(function (k) { return [k, ctx.sprint ? cs[k] : ca[k], ca[k]]; })) + '\n\n';
const done = sc.filter(function (t) { return t.status === 'Done'; });
md += '## Completed' + (ctx.sprint ? ' in ' + ctx.sprint : '') + '\n' + (done.length ? mdTable(TASK_HEAD, taskRows(done)) : '_No tasks completed in ' + scopeName + '._') + '\n\n';
if (ctx.sprint) {
  const earlier = tasks.filter(function (t) { return t.status === 'Done' && t.sprint !== ctx.sprint; });
  if (earlier.length) md += '**Completed in other sprints (' + earlier.length + '):** ' + earlier.map(function (t) { return t.id + ' ' + t.name + ' (' + t.sprint + ')'; }).join('; ') + '\n\n';
}
md += '## In progress\n' + (function () { const r = sc.filter(function (t) { return t.status === 'In Progress'; }); return r.length ? mdTable(TASK_HEAD, taskRows(r)) : '_None._'; })() + '\n\n';
md += '## Blocked (whole board)\n' + (f.blocked.length ? mdTable(TASK_HEAD.concat(['Reason']), f.blocked.map(function (t) { return taskRows([t])[0].concat([t.reason]); })) : '_None._') + '\n\n';
md += '## To do' + (ctx.sprint ? ' in ' + ctx.sprint : '') + '\n' + (function () { const r = sc.filter(function (t) { return t.status === 'To Do'; }); return r.length ? mdTable(TASK_HEAD, taskRows(r)) : '_None._'; })() + '\n\n';
md += '## Overdue or at risk (whole board)\n' + mdTable(['ID', 'Task', 'Flag', 'Why'], f.atRisk.map(function (t) { return [t.id, t.name, t.kind, t.reason]; })) + '\n\n';
if (ctx.data.timeline_csv) {
  const ms = milestoneList(loadTimeline(ctx.data.timeline_csv), startMs(ctx)).filter(function (m) { return m.dueMs >= asOf && diffDays(m.dueMs, asOf) <= 14; });
  md += '## Upcoming milestones (next 14 days)\n' + (ms.length ? mdTable(['Due', 'Phase', 'Milestone or deliverable'], ms.map(function (m) { return [fmt(m.dueMs), m.phase + '. ' + m.phase_name, m.milestone]; })) + '\n\n_Dates assume project week 1 starts ' + fmtDay(startMs(ctx)) + '; each milestone falls on the Friday of its phase end week._' : '_No milestones fall in this window._') + '\n\n';
}
const attnShown = attn.filter(function (x) { return strip(x.note); }), actsShown = acts.filter(function (x) { return strip(x.action); });
if (attnShown.length || actsShown.length) {
  md += '## Attention and next actions\n';
  attnShown.forEach(function (x) { md += '- **' + x.task_id + ':** ' + strip(x.note) + '\n'; });
  actsShown.forEach(function (x) { md += '- Next: **' + x.task_id + ':** ' + strip(x.action) + '\n'; });
}
ctx.response_md = md.trim(); ctx.grounding = g;
addSpan(ctx, 'Status grounding check', 'span', t0, Date.now(), null, g);
return [{ json: { ctx: ctx } }];
