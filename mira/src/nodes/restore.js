//@uses
// The single LLM node loses the item context, so take it back from whichever prompt node ran last.
const names = ['Orchestrator: build prompt', 'Planner: build prompt', 'Risk: build prompt', 'Status: compute and prompt', 'Tracker: compute and prompt', 'Update: compute and prompt'];
let best = null;
for (const n of names) {
  try {
    const x = $(n).first();
    if (x && x.json && x.json.ctx && x.json.ctx.llm_t0 && (!best || x.json.ctx.llm_t0 >= best.ctx.llm_t0)) best = x.json;
  } catch (e) { /* node did not run in this execution */ }
}
if (!best) throw new Error('Could not find the prompt that produced this model call');
return [{ json: { ctx: best.ctx, request_body: best.request_body, resp: $input.first().json, agent: best.ctx.llm_agent } }];
