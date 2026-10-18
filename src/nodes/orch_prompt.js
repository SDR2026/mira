//@uses core,llm
const ctx = $input.first().json.ctx;
const system = __PROMPT_ORCH__;
ctx.llm_t0 = Date.now(); ctx.llm_agent = 'orchestrator';
return [{ json: { ctx: ctx, request_body: buildReq(ctx, system, ctx.request || '(empty request)'), llm_url: ctx.cfg.llm_url } }];
