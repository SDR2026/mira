//@uses core,csv,dates,board,timeline,validate,render,llm
const inp = $input.first().json;
const ctx = inp.ctx;
const parsed = parseLLM(inp.resp);
recordLLM(ctx, 'Milestone Tracker', ctx.llm_t0, inp.request_body, parsed);
const t0 = Date.now();
const flagged = ctx.flagged;
const flaggedIds = flagged.map(function (t) { return t.id; });
const g = { agent: 'Milestone Tracker', warnings: [], dropped: [], metrics: { flagged: flagged.length } };
const o = parsed.ok ? parsed.obj : {};
if (!parsed.ok) g.warnings.push('Model suggestions unavailable (' + parsed.error + '). Flags and reasons are computed from the board.');
const act = {};
(Array.isArray(o.actions) ? o.actions : []).forEach(function (a) {
  if (a && flaggedIds.indexOf(String(a.task_id)) >= 0 && strip(a.suggested_action) && taskIdsIn(a.suggested_action).every(function (x) { return flaggedIds.indexOf(x) >= 0; })) act[a.task_id] = strip(a.suggested_action);
  else g.dropped.push('Suggestion for an unknown or invalid task was removed');
});
const asOf = asOfMs(ctx);
let md = '# Blocked and at-risk tasks\n\n**As of:** ' + fmtDay(asOf) + '  \n**Source:** task board CSV  \n**Rule:** at risk = open task already past its due date, or due within 7 days and not Done. Blocked tasks are always listed.\n\n';
md += mdTable(['ID', 'Task', 'Status', 'Owner', 'Sprint', 'Due', 'Flag', 'Why', 'Suggested action'], flagged.map(function (t) { return [t.id, t.name, t.status, t.assignee, t.sprint, fmt(pd(t.due)), t.kind, t.reason, act[t.id] || 'Not provided']; })) + '\n';
if (ctx.data.timeline_csv) {
  const tasks = loadTasks(ctx.data.board_csv);
  const ms = milestoneList(loadTimeline(ctx.data.timeline_csv), startMs(ctx)).filter(function (m) { return m.dueMs >= asOf && diffDays(m.dueMs, asOf) <= 14; });
  if (ms.length) {
    md += '\n## Milestones due in the next 14 days, with open tasks due by then\n' + mdTable(['Due', 'Milestone or deliverable', 'Open tasks due on or before this date'], ms.map(function (m) { return [fmt(m.dueMs), m.milestone, tasks.filter(function (t) { return t.status !== 'Done' && t.dueMs <= m.dueMs; }).map(function (t) { return t.id + ' (' + t.status + ')'; }).join(', ') || 'None']; })) + '\n';
  }
}
ctx.response_md = md.trim(); ctx.grounding = g;
addSpan(ctx, 'Tracker grounding check', 'span', t0, Date.now(), null, g);
return [{ json: { ctx: ctx } }];
