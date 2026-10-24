//@uses core,csv,board,llm
const ctx = $input.first().json.ctx;
const risks = ctx.data.risks_csv ? parseCSV(ctx.data.risks_csv).map(function (r) { return { risk_id: r.risk_id, category: r.category, risk: r.risk_challenge, impact: r.impact, mitigation: r.mitigation_strategy }; }) : [];
const tasks = ctx.data.board_csv ? loadTasks(ctx.data.board_csv).map(function (t) { return { id: t.id, name: t.name, status: t.status, labels: t.labels, sprint: t.sprint, due: t.due }; }) : [];
const mode = 'assessment'; // top-risk requests use the full assessment; code ranks the result
const input = { mode: mode, description: ctx.data.description, risks: risks, tasks: tasks, request: mode === 'assessment' && ctx.intent === 'top_risks' ? 'Assess every risk in the register against the project description and the task board.' : ctx.request };
const system = __PROMPT_RISK__;
ctx.llm_t0 = Date.now(); ctx.llm_agent = 'risk';
return [{ json: { ctx: ctx, request_body: buildReq(ctx, system, input), llm_url: ctx.cfg.llm_url } }];
