// Stand-in for the OpenAI chat completions API and the Langfuse OTLP endpoint, used only for offline pipeline tests.
// It is NOT a language model. It returns well-formed JSON built from the input so the workflow plumbing, routing,
// guardrails and renderers can be tested. Modes: ok | hallucinate | garbage | error (set with POST /mode).
const http = require('http'); const fs = require('fs'); const path = require('path');
let MODE = 'ok'; const traces = [];
const outDir = path.join(__dirname, 'out'); fs.mkdirSync(outDir, { recursive: true });

function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }
function classify(text) {
  let intent = 'unclear';
  if (/stakeholder|e-?mail|update (for|to)/i.test(text)) intent = 'stakeholder_update';
  else if (/top\s*\d*\s*risks?/i.test(text)) intent = 'top_risks';
  else if (/blocked|at risk|miss.*deadline|overdue/i.test(text)) intent = 'at_risk_tasks';
  else if (/risk/i.test(text)) intent = 'risk_assessment';
  else if (/milestone|coming up|upcoming/i.test(text)) intent = 'upcoming_milestones';
  else if (/how many|done, in progress/i.test(text)) intent = 'status_counts';
  else if (/status/i.test(text)) intent = 'status_report';
  else if (/\bplan\b/i.test(text)) intent = 'plan';
  const sp = /sprint\s*(\d+)/i.exec(text);
  return { intent, sprint: sp ? 'Sprint ' + sp[1] : null, audience: null, reason: 'stub keyword rules' };
}
function planner(inp) {
  if (words(inp.description) < 25) return { sufficient: false, missing: ['Scope', 'Goals', 'Deliverables', 'Timeline', 'Team size'] };
  const d = inp.description; const obj = [];
  [/reducing delivery delays by 15%/i, /lowering operational costs by 10%/i, /improving service responsiveness/i].forEach(r => { const m = r.exec(d); if (m) obj.push({ text: 'Achieve: ' + m[0], evidence: m[0] }); });
  const scope = ['demand forecasting', 'route optimization', 'inventory management', 'customer support'].filter(s => d.toLowerCase().includes(s));
  const o = { sufficient: true, missing: [], project_summary: 'AI adoption initiative for a logistics and supply chain company.', objectives: obj, scope_areas: scope,
    approach: 'Implemented in phases, starting with an assessment of current workflows and data infrastructure, followed by pilots in targeted departments.',
    phases: (inp.timeline || []).map(p => ({ phase: p.phase, name: p.name, weeks: p.start_week + '-' + p.end_week, key_activities: p.activities, milestones: p.milestones })),
    governance: 'A cross-functional task force of data scientists, IT professionals and business stakeholders oversees deployment.', information_gaps: ['Team size', 'Budget', 'Named owners per phase', 'Calendar dates'] };
  if (MODE === 'hallucinate') { o.objectives.push({ text: 'Increase revenue by 40%', evidence: 'increase revenue by 40%' }); o.phases.push({ phase: 9, name: 'Global Expansion', weeks: '25-30', key_activities: ['Open new markets'], milestones: ['Launch in Asia'] }); o.project_summary += ' Budget is $2,500,000.'; o.phases[0].milestones = ['Board approval received']; }
  return o;
}
function risk(inp) {
  const risks = inp.risks || [];
  if (!inp.description && !risks.length) return { sufficient: false, missing: ['Project description', 'Scope', 'Timeline', 'Team', 'Technology'] };
  const tasks = inp.tasks || [];
  const ev = { R09: ['T024'], R01: ['T006'], R05: ['T025'] };
  if (inp.mode === 'top') {
    const ev2 = { R09: ['T024'], R01: ['T006'], R05: ['T025'], R03: ['T020'] };
    const t = risks.map((r, i) => ({ rank: i + 1, risk_id: r.risk_id, why: 'Register text: ' + r.risk + '.', evidence_task_ids: ev2[r.risk_id] || [] }));
    if (MODE === 'hallucinate') t[1] = { rank: 2, risk_id: 'R99', why: 'Invented risk', evidence_task_ids: ['T777'] };
    return { sufficient: true, missing: [], top_risks: t, ranking_basis: 'Risks with a current board task first (Blocked, then In Progress), then stated impact.' };
  }
  const o = { sufficient: true, missing: [], assessments: risks.map(r => ({ risk_id: r.risk_id, relevance: 'Relevant to the AI adoption scope described (' + r.category + ').', evidence_task_ids: (ev[r.risk_id] || []).filter(id => tasks.some(t => t.id === id)) })), derived_risks: [], overall_note: 'Register risks are assessed against the project description.' };
  if (MODE === 'hallucinate') { o.assessments.push({ risk_id: 'R55', relevance: 'x', evidence_task_ids: ['T555'] }); o.derived_risks.push({ category: 'Weather', risk: 'Hurricane damages warehouse', impact: 'Loss', mitigation: 'Insurance', derived_from: ['T999'] }); }
  else if (tasks.some(t => t.id === 'T024')) o.derived_risks.push({ category: 'Security schedule', risk: 'Security review stays blocked and delays deployment readiness', impact: 'Later pilot and rollout tasks may slip', mitigation: 'Escalate to secure a security team slot', derived_from: ['T024'] });
  return o;
}
function status(inp) {
  const f = inp.facts;
  if (!f || !((f.counts_board || {}).Total)) return { summary: 'No task data was provided.', attention: [], next_actions: [] };
  const att = (f.blocked_on_board || []).map(t => ({ task_id: t.id, note: t.name + ' is blocked.' }));
  (f.overdue_on_board || []).forEach(t => att.push({ task_id: t.id, note: t.name + ' is ' + t.days_overdue + ' days overdue.' }));
  const o = { summary: 'Health is ' + f.health.level + '. ' + f.counts_board.Done + ' of ' + f.counts_board.Total + ' board tasks are done.', attention: att, next_actions: (f.blocked_on_board || []).map(t => ({ task_id: t.id, action: 'Get the blocker on ' + t.name + ' resolved.' })) };
  if (MODE === 'hallucinate') { o.attention.push({ task_id: 'T099', note: 'Fictional task' }); o.summary += ' Progress is 85% complete.'; }
  return o;
}
function update(inp) {
  const t = inp.tasks || [];
  if (!t.length) return { subject: '', greeting: '', paragraphs: ['No task data was provided for this sprint.'], closing: '' };
  const open = t.filter(x => x.status !== 'Done');
  const o = { subject: 'Project update: ' + inp.sprint + ' progress', greeting: 'Dear team,', paragraphs: [inp.sprint + ' status: ' + (t.length - open.length) + ' of ' + t.length + ' tasks are complete.', open.length ? open.map(x => x.name + ' (' + x.id + ') is ' + x.status + ', due ' + x.due + '.').join(' ') : 'All tasks are complete.'], closing: 'Please let me know if you would like more detail.' };
  if (MODE === 'hallucinate') { o.paragraphs.push('Next, in Sprint 3 we will shortlist AI use cases (T007).'); o.subject = 'Sprint 3 kickoff'; }
  return o;
}
function tracker(inp) {
  return { actions: (inp.flagged || []).map(f => ({ task_id: f.id, suggested_action: f.kind === 'Blocked' ? 'Escalate to secure the missing capacity so the task can start.' : 'Confirm the owner can finish the task by the due date, or agree a new date.' })) };
}
function respond(body) {
  const sys = body.messages[0].content, user = body.messages[1].content;
  const inTok = Math.ceil((sys.length + user.length) / 4);
  let content;
  if (MODE === 'garbage') content = 'Sure! Here is your answer, no JSON.';
  else {
    let u; try { u = JSON.parse(user); } catch (e) { u = user; }
    let o;
    if (/request router/.test(sys)) o = classify(String(user));
    else if (/Planner Agent/.test(sys)) o = planner(u);
    else if (/Risk Assessor Agent/.test(sys)) o = risk(u);
    else if (/Status Reporter Agent/.test(sys)) o = status(u);
    else if (/Stakeholder Update Writer/.test(sys)) o = update(u);
    else if (/Milestone Tracker Agent/.test(sys)) o = tracker(u);
    else o = { error: 'unknown agent' };
    content = JSON.stringify(o);
  }
  return { id: 'stub-' + Date.now(), object: 'chat.completion', model: 'gpt-4o-mini-stub', choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }], usage: { prompt_tokens: inTok, completion_tokens: Math.ceil(content.length / 4), total_tokens: inTok + Math.ceil(content.length / 4) } };
}
http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    const send = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.method === 'POST' && req.url === '/mode') { MODE = JSON.parse(b).mode; return send(200, { mode: MODE }); }
    if (req.method === 'GET' && req.url === '/traces') return send(200, traces);
    if (req.method === 'POST' && req.url === '/traces/clear') { traces.length = 0; return send(200, {}); }
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      if (MODE === 'error') return send(500, { error: { message: 'stub forced error' } });
      return send(200, respond(JSON.parse(b)));
    }
    if (req.method === 'POST' && req.url === '/api/public/otel/v1/traces') {
      traces.push({ headers: { auth: !!req.headers.authorization, ver: req.headers['x-langfuse-ingestion-version'] }, body: JSON.parse(b) });
      return send(200, { partialSuccess: {} });
    }
    send(404, { error: 'not found ' + req.url });
  });
}).listen(4010, '127.0.0.1', () => console.log('stub listening on 4010'));
