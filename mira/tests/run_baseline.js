// Runs the 12 baseline inputs through a running Mira workflow (n8n webhook) and checks each output.
// Usage: node tests/run_baseline.js [--url http://localhost:5678/webhook/mira] [--label stub|real] [--stub http://127.0.0.1:4010]
//        node tests/run_baseline.js --extra      (adds hallucination-injection, bad-model and input-handling tests; needs the stub server)
const fs = require('fs'); const path = require('path');
const { CHECKS } = require('./checks.js');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const URL_ = arg('--url', 'http://localhost:5678/webhook/mira'); const LABEL = arg('--label', 'real'); const STUB = arg('--stub', 'http://127.0.0.1:4010');
const outDir = path.join(__dirname, 'out'); fs.mkdirSync(outDir, { recursive: true });
const inputs = {};
fs.readFileSync(path.join(__dirname, '../data/eval_mira_inputs.txt'), 'utf8').split(/\r?\n/).forEach(l => { const m = /^(T\d+):\s*(.*)$/.exec(l); if (m) inputs[m[1]] = m[2]; });

const MINI = process.argv.includes('--mini');
async function ask(input, extra) {
  const t0 = Date.now();
  if (MINI) { const { run } = require('./mini_runner.js'); try { const rr = await run(path.join(__dirname, 'mira_workflow_test.json'), Object.assign({ input }, extra || {})); return Object.assign({ http: 200, wall_ms: Date.now() - t0 }, rr.result); } catch (e) { return { http: 500, wall_ms: Date.now() - t0, output: 'ENGINE ERROR in node ' + e.node + ': ' + e.message }; } }
  const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ input }, extra || {})) });
  const txt = await r.text(); let j; try { j = JSON.parse(txt); } catch (e) { j = { output: txt, error: 'non-JSON response' }; }
  if (Array.isArray(j)) j = j[0];
  return Object.assign({ http: r.status, wall_ms: Date.now() - t0 }, j);
}
async function mode(m) { if (LABEL === 'stub' || MINI) await fetch(STUB + '/mode', { method: 'POST', body: JSON.stringify({ mode: m }) }); }

(async () => {
  const rows = []; const EXTRA = process.argv.includes('--extra');
  const ids = Object.keys(inputs);
  await mode('ok');
  for (const id of ids) {
    const r = await ask(inputs[id]);
    const chk = r.output ? CHECKS[id](r.output) : { pass: false, found: [], failed: ['no output: ' + JSON.stringify(r).slice(0, 200)] };
    rows.push({ id, input: inputs[id], route: r.route, intent: r.intent, output: r.output, found: chk.found, failed: chk.failed, pass: chk.pass, grounding_status: r.grounding_status, grounding: r.grounding, usage: r.usage, latency_ms: r.latency_ms, trace_id: r.trace_id, agents: r.agents_used });
    console.log(id, chk.pass ? 'PASS' : 'FAIL', '| route', r.route, '| llm calls', r.usage && r.usage.calls, '|', chk.failed.join('; '));
  }
  fs.writeFileSync(path.join(outDir, 'results_' + LABEL + '.json'), JSON.stringify(rows, null, 2));
  let md = '# Mira baseline results (' + LABEL + ')\n\nRun: ' + new Date().toISOString() + '\n\n| Test | Route | Pass | LLM calls | Tokens in/out | Est. cost USD | Latency ms | Grounding | Failed criteria |\n|---|---|---|---|---|---|---|---|---|\n';
  rows.forEach(r => { md += `| ${r.id} | ${r.route} | ${r.pass ? 'Pass' : 'FAIL'} | ${r.usage ? r.usage.calls : ''} | ${r.usage ? r.usage.input + '/' + r.usage.output : ''} | ${r.usage ? r.usage.cost.toFixed(5) : ''} | ${r.latency_ms} | ${r.grounding_status} | ${r.failed.join('; ')} |\n`; });
  md += '\n';
  rows.forEach(r => { md += `## ${r.id}\n\n**Input:** ${r.input}\n\n**Expected elements present:** ${r.found.join('; ') || 'none'}\n\n**Missing or violated:** ${r.failed.join('; ') || 'none'}\n\n**Hallucination detected by checker:** ${r.failed.some(f => /NOT|invent|unknown/i.test(f)) ? 'YES' : 'No'}\n\n**Result:** ${r.pass ? 'Pass' : 'FAIL'}\n\n<details><summary>Full output</summary>\n\n${r.output}\n\n</details>\n\n`; });
  fs.writeFileSync(path.join(outDir, 'results_' + LABEL + '.md'), md);
  const passN = rows.filter(r => r.pass).length; console.log(`\nBASELINE: ${passN}/${rows.length} passed`);
  let extraFail = 0;
  if (EXTRA) {
    console.log('\n--- extra tests (stub required) ---');
    const ex = [];
    const T = (name, ok, note) => { ex.push({ name, ok, note }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (note ? ' | ' + note : '')); if (!ok) extraFail++; };
    // 1. hallucination injection: guardrails must strip invented content
    await mode('hallucinate');
    let r = await ask(inputs.T1); T('H1 plan: invented objective, phase 9, figures stripped', CHECKS.T1(r.output).pass, CHECKS.T1(r.output).failed.join('; ') + ' | grounding ' + r.grounding_status);
    T('H1b plan: grounding flagged REVIEW', r.grounding_status === 'REVIEW');
    r = await ask(inputs.T3); T('H2 risk: unknown risk ids / derived risk stripped', CHECKS.T3(r.output).pass, CHECKS.T3(r.output).failed.join('; ') + ' | ' + r.grounding_status);
    r = await ask(inputs.T7); T('H3 top risks: invalid id replaced, still 3 valid', CHECKS.T7(r.output).pass, CHECKS.T7(r.output).failed.join('; '));
    r = await ask(inputs.T5); T('H4 status: unknown task id and % stripped', CHECKS.T5(r.output).pass, CHECKS.T5(r.output).failed.join('; ') + ' | ' + r.grounding_status);
    r = await ask(inputs.T12); T('H5 email: Sprint 3 mention / T007 stripped', CHECKS.T12(r.output).pass, CHECKS.T12(r.output).failed.join('; '));
    // 2. model returns garbage: deterministic parts must survive
    await mode('garbage');
    r = await ask(inputs.T10); T('G1 garbage model: counts (code) still correct', CHECKS.T10(r.output).pass, 'route ' + r.route);
    r = await ask(inputs.T5); T('G2 garbage model: status tables still correct', CHECKS.T5(r.output).pass, CHECKS.T5(r.output).failed.join('; '));
    r = await ask(inputs.T8); T('G3 garbage model: blockers still found (rules fallback + code)', CHECKS.T8(r.output).pass, CHECKS.T8(r.output).failed.join('; '));
    // 3. model API down
    await mode('error');
    r = await ask(inputs.T11); T('E1 model API down: milestones (code only) still answered', CHECKS.T11(r.output).pass, 'route ' + r.route);
    r = await ask(inputs.T6); T('E2 model API down: no-data status still refuses', CHECKS.T6(r.output).pass);
    r = await ask(inputs.T8); T('E3 model API down: blockers answered from code (no crash)', CHECKS.T8(r.output).pass, 'route ' + r.route);
    r = await ask(inputs.T1); T('E4 model API down: plan still has timeline phases', CHECKS.T1(r.output).failed.length <= 1, CHECKS.T1(r.output).failed.join('; '));
    r = await ask(inputs.T12); T('E5 model API down: email draft does not crash', /Subject|Sprint 2/.test(r.output || ''));
    await mode('ok');
    // 4. input handling
    r = await ask(''); T('I1 empty request -> clarification', /clearer request/.test(r.output || ''));
    r = await ask('hello there'); T('I2 unrelated text -> clarification', /clearer request/.test(r.output || ''), r.route);
    r = await ask('Generate a weekly status report', { task_board_csv: fs.readFileSync(path.join(__dirname, '../data/sample_task_board.csv'), 'utf8').split('\n').slice(0, 8).join('\n') });
    T('I3 inline CSV in request body is used (7 tasks)', /Task status|Weekly status report/.test(r.output || '') && /\(7 tasks\)/.test(r.output || ''), (r.output || '').split('\n')[0]);
    r = await ask('What are the blocked tasks?', { as_of: '2026-05-30' }); T('I4 as_of override changes the result (T024 overdue)', /Overdue/.test(r.output || '') && /T024/.test(r.output || ''));
    r = await ask('Generate a weekly status report for Sprint 99 using the sample task board'); T('I5 unknown sprint -> says no tasks', /no tasks in Sprint 99/.test(r.output || ''));
    r = await ask('Generate a stakeholder update email using the sample task board'); T('I6 update without sprint asks which sprint', /sprint needed/i.test(r.output || ''));
    r = await ask('Generate a project plan for ' + 'a mobile app for field technicians that lets them log repairs and see their schedule. '.repeat(6)); T('I7 long inline description is accepted as project input (route plan)', r.route === 'plan', 'route ' + r.route);
    fs.writeFileSync(path.join(outDir, 'results_extra_' + LABEL + '.json'), JSON.stringify(ex, null, 2));
  }
  process.exit(passN === rows.length && extraFail === 0 ? 0 : 1);
})();
