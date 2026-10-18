//@uses core,csv,dates,board,llm
const ctx = $input.first().json.ctx;
const tasks = loadTasks(ctx.data.board_csv);
if (!ctx.sprint) {
  ctx.response_md = '# Stakeholder update: sprint needed\n\nWhich sprint should the update cover? Sprints on the board: ' + uniq(tasks.map(function (t) { return t.sprint; })).join(', ') + '. No email was drafted.';
  ctx.grounding = { agent: 'Status Reporter (update)', warnings: [], dropped: [], metrics: { sprint_found: false } };
  return [{ json: { ctx: ctx, skip: true, request_body: {}, llm_url: ctx.cfg.llm_url } }];
}
const sc = tasks.filter(function (t) { return t.sprint === ctx.sprint; });
if (!sc.length) {
  ctx.response_md = '# Stakeholder update: no data for ' + ctx.sprint + '\n\nThe task board has no tasks in ' + ctx.sprint + '. No email was drafted.';
  ctx.grounding = { agent: 'Status Reporter (update)', warnings: [], dropped: [], metrics: { sprint_found: false } };
  return [{ json: { ctx: ctx, skip: true, request_body: {}, llm_url: ctx.cfg.llm_url } }];
}
const asOf = asOfMs(ctx);
const input = { audience: ctx.audience, sprint: ctx.sprint, as_of: fmt(asOf), sprint_complete: sc.every(function (t) { return t.status === 'Done'; }), counts: countBy(sc),
  tasks: sc.map(function (t) { return { id: t.id, name: t.name, status: t.status, owner: t.assignee, due: fmt(t.dueMs), overdue_days: (t.status !== 'Done' && t.dueMs < asOf) ? Math.round((asOf - t.dueMs) / 86400000) : 0 }; }) };
const system = __PROMPT_UPDATE__;
ctx.llm_t0 = Date.now(); ctx.llm_agent = 'update';
return [{ json: { ctx: ctx, skip: false, request_body: buildReq(ctx, system, input), llm_url: ctx.cfg.llm_url } }];
