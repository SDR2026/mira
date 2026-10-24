//@uses core
const ctx = $input.first().json.ctx;
const t0 = Date.now();
const TITLES = { plan: 'Project plan', risk_assessment: 'Risk assessment', top_risks: 'Top risks', status_report: 'Weekly status report', status_counts: 'Task status summary', at_risk_tasks: 'Blocked and at-risk tasks', upcoming_milestones: 'Upcoming milestones', stakeholder_update: 'Stakeholder update' };
const WHAT = {
  plan: 'The request does not describe a project in enough detail. A plan written from this would be invented.',
  risk_assessment: 'The request does not describe a project, so any risks listed would be invented.',
  top_risks: 'No risk register is available to rank.',
  status_report: 'No task data is available. Without a task board I cannot state which tasks are done, in progress, blocked or at risk, or any progress figure.',
  status_counts: 'No task data is available, so I cannot count tasks.',
  at_risk_tasks: 'No task data is available, so I cannot say which tasks are blocked or at risk.',
  upcoming_milestones: 'No project timeline is available, so I cannot list milestones.',
  stakeholder_update: 'No task data is available to base an update on.'
};
let md = '# ' + (TITLES[ctx.intent] || 'Request') + ': more information needed\n\n**Insufficient information.** ' + (WHAT[ctx.intent] || '') + ' Nothing was generated.\n\n**Please provide:**\n' + ctx.missing.map(function (m) { return '- ' + m; }).join('\n') + '\n\nIf you mean the ABCDE Ltd. AI Adoption Project, say so and I will use the provided project files.';
ctx.response_md = md;
ctx.grounding = { agent: 'Router and sufficiency gate', warnings: [], dropped: [], metrics: { insufficient: true } };
addSpan(ctx, 'Insufficient-input response', 'span', t0, Date.now(), { intent: ctx.intent }, { missing: ctx.missing });
return [{ json: { ctx: ctx } }];
