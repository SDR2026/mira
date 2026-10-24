//@uses core,llm
const inp = $input.first().json;
const ctx = inp.ctx;
const parsed = parseLLM(inp.resp);
recordLLM(ctx, 'Orchestrator', ctx.llm_t0, inp.request_body, parsed);
const t0 = Date.now();
const text = ctx.request;
const INTENTS = ['plan', 'risk_assessment', 'top_risks', 'status_report', 'status_counts', 'at_risk_tasks', 'upcoming_milestones', 'stakeholder_update', 'unclear'];
function ruleIntent(t) {
  if (/stakeholder|e-?mail|update (for|to)|\bmemo\b/i.test(t)) return 'stakeholder_update';
  if (/top\s*\d*\s*risks?|biggest risks?|main risks?|key risks?/i.test(t)) return 'top_risks';
  if (/blocked|at risk|miss(ing)?\b.*deadline|overdue/i.test(t)) return 'at_risk_tasks';
  if (/risk/i.test(t)) return 'risk_assessment';
  if (/milestone|coming up|upcoming/i.test(t)) return 'upcoming_milestones';
  if (/how many|\bcount|done, in progress|summari[sz]e.*status/i.test(t)) return 'status_counts';
  if (/status/i.test(t)) return 'status_report';
  if (/\bplan\b/i.test(t)) return 'plan';
  return 'unclear';
}
let intent, intent_source;
if (parsed.ok && parsed.obj && INTENTS.indexOf(parsed.obj.intent) >= 0) { intent = parsed.obj.intent; intent_source = 'llm'; }
else { intent = ruleIntent(text); intent_source = 'rules (model output unusable: ' + (parsed.error || 'invalid label') + ')'; }
if (!text) intent = 'unclear';
// Sprint comes from the request text only, never from the model
let sprint = null;
const sm = /sprint\s*(\d+)/i.exec(text);
if (sm) sprint = 'Sprint ' + sm[1];
let audience = ctx.audience;
if (!audience && parsed.ok && parsed.obj && ['leadership', 'engineering', 'client'].indexOf(parsed.obj.audience) >= 0) audience = parsed.obj.audience;
if (!audience) { const am = /\b(engineering|client|leadership|executive)\b/i.exec(text); audience = am ? (am[1].toLowerCase() === 'executive' ? 'leadership' : am[1].toLowerCase()) : 'leadership'; }
// which project does the request refer to?
const sup = ctx.supplied; const hasSup = Object.keys(sup).length > 0;
const refAbcde = /abcde|ai adoption|sample (task )?board|provided (project )?(description|data|files?)|task board|risk (data|csv)|project (timeline|description)|the timeline/i.test(text);
const dataIntents = ['top_risks', 'status_counts', 'at_risk_tasks', 'upcoming_milestones', 'stakeholder_update'];
let ref;
if (hasSup) ref = 'inline'; else if (refAbcde) ref = 'abcde'; else if (dataIntents.indexOf(intent) >= 0) ref = 'abcde'; else if (wordCount(text) >= 60) ref = 'inline'; else ref = 'none';
let data = { description: '', timeline_csv: '', risks_csv: '', board_csv: '' };
if (ref === 'abcde') data = Object.assign({}, ctx.cfg.data);
else if (ref === 'inline') data = { description: sup.description || (wordCount(text) >= 60 ? text : ''), timeline_csv: sup.timeline_csv || '', risks_csv: sup.risks_csv || '', board_csv: sup.board_csv || '' };
// sufficiency gate: no model call is made when the input cannot support the output
const NEEDS = {
  plan: [function (d) { return wordCount(d.description) >= 25; }, ['Project scope (what is being built and for whom)', 'Goals and success measures', 'Deliverables', 'Timeline or deadline', 'Team size and roles']],
  risk_assessment: [function (d) { return wordCount(d.description) >= 25 || !!d.risks_csv; }, ['Project description (what is being built, for whom, in which domain)', 'Scope and goals', 'Timeline', 'Team and stakeholders', 'Technology, data and constraints']],
  top_risks: [function (d) { return !!d.risks_csv; }, ['A risk register (CSV with risk_id, category, risk_challenge, impact, mitigation_strategy)']],
  status_report: [function (d) { return !!d.board_csv; }, ['A task board export (CSV with task_id, task_name, status, assignee, priority, sprint, due_date)', 'The sprint or week to report on']],
  status_counts: [function (d) { return !!d.board_csv; }, ['A task board export (CSV with task_id, task_name, status, assignee, priority, sprint, due_date)']],
  at_risk_tasks: [function (d) { return !!d.board_csv; }, ['A task board export (CSV with task_id, task_name, status, assignee, priority, sprint, due_date)']],
  upcoming_milestones: [function (d) { return !!d.timeline_csv; }, ['A project timeline (CSV with phase, phase_name, start_week, end_week, key_activities, milestones_deliverables)']],
  stakeholder_update: [function (d) { return !!d.board_csv; }, ['A task board export (CSV with task_id, task_name, status, assignee, priority, sprint, due_date)', 'The sprint to report on']]
};
const ROUTE = { plan: 'plan', risk_assessment: 'risk', top_risks: 'risk', status_report: 'status', status_counts: 'counts', at_risk_tasks: 'at_risk', upcoming_milestones: 'milestones', stakeholder_update: 'update', unclear: 'unclear' };
let route = ROUTE[intent], missing = [];
if (intent !== 'unclear') {
  const n = NEEDS[intent];
  if (!n[0](data)) { route = 'insufficient'; missing = n[1]; }
}
ctx.intent = intent; ctx.intent_source = intent_source; ctx.sprint = sprint; ctx.audience = audience; ctx.project_ref = ref; ctx.route = route; ctx.missing = missing;
ctx.data = (route === 'insufficient' || route === 'unclear') ? {} : data;
addSpan(ctx, 'Router and sufficiency gate', 'span', t0, Date.now(), { request: text }, { intent: intent, intent_source: intent_source, route: route, project_ref: ref, sprint: sprint, missing: missing });
return [{ json: { ctx: ctx } }];
