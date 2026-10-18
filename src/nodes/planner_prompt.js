//@uses core,csv,timeline,llm
const ctx = $input.first().json.ctx;
const tl = ctx.data.timeline_csv ? loadTimeline(ctx.data.timeline_csv) : [];
const input = {
  description: ctx.data.description,
  timeline: tl.map(function (p) { return { phase: p.phase, name: p.name, start_week: p.start, end_week: p.end, activities: p.activities, milestones: p.milestones }; }),
  request: ctx.request
};
const system = __PROMPT_PLANNER__;
ctx.llm_t0 = Date.now(); ctx.llm_agent = 'planner';
return [{ json: { ctx: ctx, request_body: buildReq(ctx, system, input), llm_url: ctx.cfg.llm_url } }];
