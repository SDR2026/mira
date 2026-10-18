//@uses core,csv,dates,board,llm
const ctx = $input.first().json.ctx;
const tasks = loadTasks(ctx.data.board_csv);
const f = taskFacts(tasks, asOfMs(ctx), null);
ctx.flagged = f.atRisk;
if (!f.atRisk.length) {
  ctx.response_md = '# Blocked and at-risk tasks\n\n**As of:** ' + fmtDay(asOfMs(ctx)) + '\n\nNo task is blocked, overdue or due within 7 days without being done.';
  ctx.grounding = { agent: 'Milestone Tracker', warnings: [], dropped: [], metrics: { flagged: 0 } };
  return [{ json: { ctx: ctx, skip: true, request_body: {}, llm_url: ctx.cfg.llm_url } }];
}
const byId = {}; tasks.forEach(function (t) { byId[t.id] = t; });
const flagged = f.atRisk.map(function (t) { return { id: t.id, name: t.name, status: t.status, owner: t.assignee, sprint: t.sprint, due: fmt(pd(t.due)), kind: t.kind, computed_reason: t.reason, description: byId[t.id].description }; });
const system = __PROMPT_TRACKER__;
ctx.llm_t0 = Date.now(); ctx.llm_agent = 'tracker';
return [{ json: { ctx: ctx, skip: false, request_body: buildReq(ctx, system, { as_of: fmtDay(asOfMs(ctx)), flagged: flagged }), llm_url: ctx.cfg.llm_url } }];
