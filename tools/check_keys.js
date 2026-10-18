// One-minute check of your OpenAI key and Langfuse keys, before importing the workflow.
// Windows PowerShell:
//   $env:OPENAI_API_KEY="sk-..."; $env:LANGFUSE_PUBLIC_KEY="pk-lf-..."; $env:LANGFUSE_SECRET_KEY="sk-lf-..."
//   $env:LANGFUSE_HOST="https://cloud.langfuse.com"   (US cloud: https://us.cloud.langfuse.com)
//   node tools/check_keys.js
// The keys stay in your shell. Nothing is written to disk.
const host = (process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com').replace(/\/$/, '');
function hex(n) { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16); return s; }
(async () => {
  if (process.env.OPENAI_API_KEY) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Return a JSON object {"ok": true}.' }, { role: 'user', content: 'ping' }] }) });
    const j = await r.json().catch(() => ({}));
    console.log('OpenAI:', r.status, r.ok ? 'OK, reply ' + (j.choices && j.choices[0].message.content) + ', tokens ' + JSON.stringify(j.usage) : JSON.stringify(j).slice(0, 300));
  } else console.log('OpenAI: skipped (OPENAI_API_KEY not set)');
  if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) {
    const now = Date.now(), tid = hex(32), root = hex(16), A = (k, v) => ({ key: k, value: typeof v === 'number' ? { intValue: String(v) } : { stringValue: v } });
    const body = { resourceSpans: [{ resource: { attributes: [A('service.name', 'mira')] }, scopeSpans: [{ scope: { name: 'mira-check' }, spans: [
      { traceId: tid, spanId: root, name: 'mira-key-check', kind: 1, startTimeUnixNano: now + '000000', endTimeUnixNano: (now + 400) + '000000', status: { code: 1 }, attributes: [A('langfuse.trace.name', 'Mira key check'), A('langfuse.observation.type', 'span'), A('langfuse.observation.input', 'ping'), A('langfuse.observation.output', 'pong')] },
      { traceId: tid, spanId: hex(16), parentSpanId: root, name: 'Test generation', kind: 1, startTimeUnixNano: (now + 50) + '000000', endTimeUnixNano: (now + 350) + '000000', status: { code: 1 }, attributes: [A('langfuse.observation.type', 'generation'), A('gen_ai.request.model', 'gpt-4o-mini'), A('gen_ai.usage.input_tokens', 12), A('gen_ai.usage.output_tokens', 5), A('langfuse.observation.input', '{"messages":[{"role":"user","content":"ping"}]}'), A('langfuse.observation.output', '{"role":"assistant","content":"pong"}')] }] }] }] };
    const r = await fetch(host + '/api/public/otel/v1/traces', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-langfuse-ingestion-version': '4', Authorization: 'Basic ' + Buffer.from(process.env.LANGFUSE_PUBLIC_KEY + ':' + process.env.LANGFUSE_SECRET_KEY).toString('base64') }, body: JSON.stringify(body) });
    console.log('Langfuse:', r.status, r.ok ? 'OK. Open Langfuse > Tracing and look for "Mira key check".' : (await r.text()).slice(0, 300));
  } else console.log('Langfuse: skipped (LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY not set)');
})();
