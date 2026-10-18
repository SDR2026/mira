//@uses core
const ctx = $input.first().json.ctx;
const t0 = Date.now();
ctx.response_md = '# I need a clearer request\n\nI could not tell what you want. Mira can:\n- Generate a **project plan** from a project description and timeline\n- Produce a **risk assessment** or name the **top risks**\n- Write a **weekly status report** for a sprint, or count tasks by status\n- List **blocked or at-risk tasks** and **upcoming milestones**\n- Draft a **stakeholder update email** for a sprint\n\nTell me which one, and which project (for example, the ABCDE Ltd. AI Adoption Project), or attach the CSV or text files.';
ctx.grounding = { agent: 'Orchestrator', warnings: [], dropped: [], metrics: { unclear: true } };
addSpan(ctx, 'Unclear-request response', 'span', t0, Date.now(), { request: ctx.request }, null);
return [{ json: { ctx: ctx } }];
