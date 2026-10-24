// Fast in-process executor for the generated workflow JSON (Code, IF, Switch, HTTP nodes).
// It exists only for quick iteration; final verification is done in a real n8n instance.
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
function load(file) { const wf = JSON.parse(fs.readFileSync(file, 'utf8')); const nodes = {}; wf.nodes.forEach(n => nodes[n.name] = n); return { wf, nodes }; }
function evalExpr(expr, json) { const e = String(expr).replace(/^=\{\{\s*/, '').replace(/\s*\}\}$/, ''); return new Function('$json', 'return (' + e + ')')(json); }
async function run(file, body, opts) {
  opts = opts || {};
  const { wf, nodes } = load(file); const out = {};
  const conns = wf.connections;
  const start = 'Config';
  const queue = [{ name: start, items: [{ json: { body: body } }] }]; const trace = [];
  let guard = 0;
  while (queue.length) {
    if (++guard > 200) throw new Error('loop guard');
    const { name, items } = queue.shift(); const n = nodes[name]; trace.push(name);
    let outputs; // array of arrays
    try {
      if (n.type === 'n8n-nodes-base.code') {
        const fn = new AsyncFunction('$input', '$', n.parameters.jsCode);
        const $ = nm => ({ first: () => { if (!out[nm]) throw new Error('Node ' + nm + ' has not run'); return out[nm][0]; }, all: () => out[nm] });
        const ctxThis = { helpers: { getBinaryDataBuffer: async (i, k) => Buffer.from(opts.files && opts.files[k] || '') } };
        const res = await fn.call(ctxThis, { first: () => items[0], all: () => items }, $);
        outputs = [res];
      } else if (n.type === 'n8n-nodes-base.if') {
        const c = n.parameters.conditions.conditions[0]; const v = !!evalExpr(c.leftValue, items[0].json);
        outputs = [v ? items : [], v ? [] : items];
      } else if (n.type === 'n8n-nodes-base.switch') {
        const vals = n.parameters.rules.values; outputs = vals.map(() => []);
        const lv = evalExpr(vals[0].conditions.conditions[0].leftValue, items[0].json);
        const idx = vals.findIndex(v => v.conditions.conditions[0].rightValue === lv); if (idx >= 0) outputs[idx] = items;
      } else if (n.type === 'n8n-nodes-base.httpRequest') {
        const j = items[0].json; let url, body;
        if (n.name === 'LLM call (OpenAI)') { url = j.llm_url; body = JSON.stringify(j.request_body); } else { url = j.langfuse_url; body = JSON.stringify(j.trace_payload); }
        let resp; try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }); const t = await r.text(); try { resp = JSON.parse(t); } catch (e) { resp = { error: t }; } if (!r.ok && !resp.error) resp = { error: { message: 'HTTP ' + r.status } }; } catch (e) { resp = { error: { message: String(e.message) } }; }
        outputs = [[{ json: resp }]];
      } else outputs = [items];
    } catch (e) { e.node = name; throw e; }
    out[name] = outputs.flat().length ? outputs.flat() : (out[name] || []);
    (conns[name] ? conns[name].main : []).forEach((targets, oi) => { const its = outputs[oi] || []; if (its.length) targets.forEach(t => queue.push({ name: t.node, items: its })); });
  }
  return { result: out['Respond'] && out['Respond'][0].json, trace, out };
}
module.exports = { run };
