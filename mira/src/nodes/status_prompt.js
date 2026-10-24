//@uses core,csv,dates,board,timeline,llm,render
const ctx = $input.first().json.ctx;
const tasks = loadTasks(ctx.data.board_csv);
const asOf = asOfMs(ctx);
const f = taskFacts(tasks, asOf, ctx.sprint);
if (ctx.sprint && !f.scope.length) {
  ctx.no_llm = true;
  ctx.response_md = '# Weekly status report: ' + ctx.sprint + '\n\nThe task board has no tasks in ' + ctx.sprint + '. No report was generated.\n\nSprints on the board: ' + uniq(tasks.map(function (t) { return t.sprint; })).join(', ') + '.';
  ctx.grounding = { agent: 'Status Reporter', warnings: [], dropped: [], metrics: { sprint_found: false } };
  return [{ json: { ctx: ctx, skip: true, request_body: {}, llm_url: ctx.cfg.llm_url } }];
}
const h = healthOf(f);
const pick = function (arr) { return arr.map(function (t) { return { id: t.id, name: t.name, owner: t.assignee, sprint: t.sprint, due: fmt(t.dueMs), status: t.status }; }); };
const sc = f.scope;
const facts = {
  as_of: fmtDay(asOf), sprint_scope: ctx.sprint, counts_scope: f.counts_scope, counts_board: f.counts_all,
  health: { level: h.level, reasons: h.reasons },
  completed_in_scope: pick(sc.filter(function (t) { return t.status === 'Done'; })),
  in_progress_in_scope: pick(sc.filter(function (t) { return t.status === 'In Progress'; })),
  todo_in_scope: pick(sc.filter(function (t) { return t.status === 'To Do'; })),
  blocked_on_board: pick(f.blocked), overdue_on_board: f.overdue.map(function (t) { return { id: t.id, name: t.name, days_overdue: t.days_overdue }; }),
  due_within_7_days: f.dueSoon.map(function (t) { return { id: t.id, name: t.name, days_to_due: t.days_to_due, status: t.status }; })
};
ctx.facts_ids = tasks.map(function (t) { return t.id; });
const system = __PROMPT_STATUS__;
ctx.llm_t0 = Date.now(); ctx.llm_agent = 'status';
return [{ json: { ctx: ctx, skip: false, request_body: buildReq(ctx, system, { facts: facts }), llm_url: ctx.cfg.llm_url } }];
