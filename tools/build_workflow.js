// Generates the n8n workflow JSON from src/ (code nodes), prompts/ and data/.
// Usage: node tools/build_workflow.js [prod|test]
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const mode = process.argv[2] || 'prod';
const TEST = mode === 'test';

const lib = fs.readFileSync(path.join(root, 'src/lib.js'), 'utf8');
const sections = {};
lib.split(/^\/\/#section /m).slice(1).forEach(b => { const i = b.indexOf('\n'); sections[b.slice(0, i).trim()] = b.slice(i + 1); });
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const J = s => JSON.stringify(s);

const PROMPTS = {
  ORCH: rd('prompts/orchestrator.md'), PLANNER: rd('prompts/planner.md'), RISK: rd('prompts/risk.md'),
  STATUS: rd('prompts/status.md'), UPDATE: rd('prompts/update.md'), TRACKER: rd('prompts/tracker.md'),
};
const DATA = {
  D_DESC: rd('data/project_description.txt').trim(), D_TIMELINE: rd('data/project_timeline.csv'),
  D_RISKS: rd('data/project_risks.csv'), D_BOARD: rd('data/sample_task_board.csv'),
};
const LLM_URL = TEST ? 'http://127.0.0.1:4010/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
const LF_HOST = TEST ? 'http://127.0.0.1:4010' : 'https://cloud.langfuse.com';

function codeFor(file) {
  let src = rd('src/nodes/' + file + '.js');
  const m = /^\/\/@uses[ \t]*(.*)$/m.exec(src);
  const uses = (m && m[1] ? m[1].split(',').map(s => s.trim()).filter(Boolean) : []);
  src = src.replace(/^\/\/@uses.*\n/, '');
  Object.keys(PROMPTS).forEach(k => { src = src.split('__PROMPT_' + k + '__').join(J(PROMPTS[k].trim())); });
  Object.keys(DATA).forEach(k => { src = src.split('__' + k + '__').join(J(DATA[k])); });
  src = src.split('__LLM_URL__').join(LLM_URL).split('__LF_HOST__').join(LF_HOST).split('__TRACING__').join('true');
  const header = '// ' + file + ' (generated from src/nodes; edit prompts and logic there or here)\n';
  const DEPS = { board: ['core', 'csv', 'dates'], timeline: ['csv', 'dates'], render: ['dates'], llm: ['core'], validate: ['core'] };
  const ORDER = ['core', 'csv', 'dates', 'ukdates', 'board', 'timeline', 'validate', 'render', 'llm'];
  const want = new Set(); uses.forEach(u => { want.add(u); (DEPS[u] || []).forEach(d => want.add(d)); });
  const libs = ORDER.filter(u => want.has(u)).map(u => { if (!sections[u]) throw new Error('missing section ' + u); return '// --- shared: ' + u + ' ---\n' + sections[u]; }).join('\n');
  return header + (libs ? libs + '\n// --- node logic ---\n' : '') + src;
}

let idn = 0;
const nodes = [];
const pos = {};
function add(node, x, y) { node.id = 'n' + (++idn).toString().padStart(2, '0') + '-' + Buffer.from(node.name).toString('hex').slice(0, 8); node.position = [x, y]; nodes.push(node); pos[node.name] = [x, y]; return node; }
const code = (name, file, x, y) => add({ parameters: { jsCode: codeFor(file) }, type: 'n8n-nodes-base.code', typeVersion: 2, name }, x, y);

const X = i => 260 + i * 260;
// ---- triggers
add({ parameters: { public: true, mode: 'hostedChat', options: { title: 'Mira', subtitle: 'Project intelligence assistant: plans, risks, status', inputPlaceholder: 'Ask for a plan, risk assessment, status report, blockers, milestones or a stakeholder update', allowFileUploads: true, allowedFilesMimeTypes: 'text/csv,text/plain', responseMode: 'lastNode' } }, type: '@n8n/n8n-nodes-langchain.chatTrigger', typeVersion: 1.1, name: 'Chat in', webhookId: 'a1f0c2de-4b7a-4c1e-9a55-6d3e0f0a1b01' }, X(0), 200);
add({ parameters: { httpMethod: 'POST', path: 'mira', responseMode: 'lastNode', options: {} }, type: 'n8n-nodes-base.webhook', typeVersion: 2, name: 'API in (webhook)', webhookId: 'a1f0c2de-4b7a-4c1e-9a55-6d3e0f0a1b02' }, X(0), 400);
code('Config', 'config', X(1), 300);
code('Normalize request', 'normalize', X(2), 300);
code('Orchestrator: build prompt', 'orch_prompt', X(3), 300);

const ifSkip = { parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, conditions: [{ id: 'c1', leftValue: '={{ $json.skip === true }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }, type: 'n8n-nodes-base.if', typeVersion: 2.2, name: 'Answer ready without a model call?' };
add(ifSkip, X(4), 300);
add({ parameters: { method: 'POST', url: '={{ $json.llm_url }}', authentication: 'predefinedCredentialType', nodeCredentialType: 'openAiApi', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.request_body) }}', options: { timeout: 90000 } }, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, name: 'LLM call (OpenAI)', credentials: { openAiApi: { id: TEST ? 'cred-openai' : 'SET_ME', name: 'OpenAI account' } }, retryOnFail: true, maxTries: 2, waitBetweenTries: 1500, onError: 'continueRegularOutput' }, X(5), 360);
code('Restore context', 'restore', X(6), 360);

function switchNode(name, values, x, y) {
  return add({ parameters: { rules: { values: values.map((v, i) => ({ conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: 's' + i, leftValue: v.left, rightValue: v.value, operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renamedOutput: true, outputKey: v.value })) }, options: {} }, type: 'n8n-nodes-base.switch', typeVersion: 3.2, name }, x, y);
}
const agents = ['orchestrator', 'planner', 'risk', 'status', 'tracker', 'update'];
switchNode('Which agent replied?', agents.map(a => ({ left: '={{ $json.agent }}', value: a })), X(7), 360);
code('Orchestrator: route', 'orch_route', X(8), 100);
const routes = ['plan', 'risk', 'status', 'counts', 'at_risk', 'milestones', 'update', 'insufficient', 'unclear'];
switchNode('Route request', routes.map(r => ({ left: '={{ $json.ctx.route }}', value: r })), X(9), 100);

// specialists
const YR = { plan: 0, risk: 160, status: 320, counts: 480, at_risk: 640, milestones: 800, update: 960, insufficient: 1120, unclear: 1240 };
code('Planner: build prompt', 'planner_prompt', X(10), YR.plan - 60);
code('Risk: build prompt', 'risk_prompt', X(10), YR.risk);
code('Status: compute and prompt', 'status_prompt', X(10), YR.status + 40);
code('Task counts (code)', 'counts', X(10), YR.counts + 40);
code('Tracker: compute and prompt', 'atrisk_prompt', X(10), YR.at_risk + 40);
code('Upcoming milestones (code)', 'milestones', X(10), YR.milestones + 40);
code('Update: compute and prompt', 'update_prompt', X(10), YR.update + 40);
code('Insufficient input', 'insufficient', X(10), YR.insufficient);
code('Unclear request', 'unclear', X(10), YR.unclear + 40);
code('Planner: validate and render', 'planner_render', X(8), 600);
code('Risk: validate and render', 'risk_render', X(8), 760);
code('Status: validate and render', 'status_render', X(8), 920);
code('Tracker: validate and render', 'atrisk_render', X(8), 1080);
code('Update: validate and render', 'update_render', X(8), 1240);

code('Finalize and build trace', 'finalize', X(12), 700);
add({ parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, conditions: [{ id: 'c2', leftValue: '={{ $json.tracing_enabled === true }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }, type: 'n8n-nodes-base.if', typeVersion: 2.2, name: 'Tracing on?' }, X(13), 700);
add({ parameters: { method: 'POST', url: '={{ $json.langfuse_url }}', authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth', sendHeaders: true, headerParameters: { parameters: [{ name: 'x-langfuse-ingestion-version', value: '4' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.trace_payload) }}', options: { timeout: 15000 } }, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, name: 'Langfuse trace', credentials: { httpBasicAuth: { id: TEST ? 'cred-lf' : 'SET_ME', name: 'Langfuse' } }, onError: 'continueRegularOutput' }, X(14), 640);
code('Respond', 'respond', X(15), 700);

// sticky notes
const sticky = (name, content, x, y, w, h, color) => add({ parameters: { content, height: h, width: w, color }, type: 'n8n-nodes-base.stickyNote', typeVersion: 1, name }, x, y);
sticky('Note: overview', '## Mira\nOrchestrator routes each request to a specialist.\n\n**Agents:** Orchestrator, Planner, Risk Assessor, Status Reporter (status report and stakeholder update), Milestone Tracker.\n\n**Credentials to set:** OpenAI (node "LLM call (OpenAI)") and Langfuse basic auth (node "Langfuse trace": public key as user, secret key as password).\n\n**Settings:** edit the node "Config" (model, prices, as-of date, Langfuse region).', X(0) - 40, -140, 520, 260, 4);
sticky('Note: guardrails', '### Grounding guardrails\nCounts, tables, dates and health are computed by code. The model writes narrative only, and every task id, risk id, phase and milestone it returns is checked against the source files before output.', X(8) - 20, 560, 560, 120, 3);

// ---- connections
const conns = {};
function link(a, b, out = 0) { conns[a] = conns[a] || { main: [] }; while (conns[a].main.length <= out) conns[a].main.push([]); conns[a].main[out].push({ node: b, type: 'main', index: 0 }); }
link('Chat in', 'Config'); link('API in (webhook)', 'Config');
link('Config', 'Normalize request'); link('Normalize request', 'Orchestrator: build prompt');
['Orchestrator: build prompt', 'Planner: build prompt', 'Risk: build prompt', 'Status: compute and prompt', 'Tracker: compute and prompt', 'Update: compute and prompt'].forEach(n => link(n, 'Answer ready without a model call?'));
link('Answer ready without a model call?', 'Finalize and build trace', 0);
link('Answer ready without a model call?', 'LLM call (OpenAI)', 1);
link('LLM call (OpenAI)', 'Restore context'); link('Restore context', 'Which agent replied?');
link('Which agent replied?', 'Orchestrator: route', 0);
link('Which agent replied?', 'Planner: validate and render', 1);
link('Which agent replied?', 'Risk: validate and render', 2);
link('Which agent replied?', 'Status: validate and render', 3);
link('Which agent replied?', 'Tracker: validate and render', 4);
link('Which agent replied?', 'Update: validate and render', 5);
link('Orchestrator: route', 'Route request');
const rt = ['Planner: build prompt', 'Risk: build prompt', 'Status: compute and prompt', 'Task counts (code)', 'Tracker: compute and prompt', 'Upcoming milestones (code)', 'Update: compute and prompt', 'Insufficient input', 'Unclear request'];
rt.forEach((n, i) => link('Route request', n, i));
['Task counts (code)', 'Upcoming milestones (code)', 'Insufficient input', 'Unclear request', 'Planner: validate and render', 'Risk: validate and render', 'Status: validate and render', 'Tracker: validate and render', 'Update: validate and render'].forEach(n => link(n, 'Finalize and build trace'));
link('Finalize and build trace', 'Tracing on?');
link('Tracing on?', 'Langfuse trace', 0); link('Tracing on?', 'Respond', 1);
link('Langfuse trace', 'Respond');

const wf = { id: 'miraWorkflow0001', name: TEST ? 'Mira (test build)' : 'Mira: AI-Powered Project Intelligence Assistant', nodes, connections: conns, active: false, settings: { executionOrder: 'v1' }, versionId: 'mira-1', meta: { templateCredsSetupCompleted: false }, tags: [], pinData: {} };
const out = TEST ? path.join(root, 'tests/mira_workflow_test.json') : path.join(root, 'workflow/mira_workflow.json');
fs.writeFileSync(out, JSON.stringify(wf, null, 2));
console.log('wrote', out, nodes.length, 'nodes', fs.statSync(out).size, 'bytes');
