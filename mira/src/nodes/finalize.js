//@uses core,render,ukdates
const ctx = $input.first().json.ctx;
const t1 = Date.now();
const g = ctx.grounding || { warnings: [], dropped: [], metrics: {} };
const gStatus = (g.warnings && g.warnings.length) || (g.dropped && g.dropped.length) ? 'REVIEW' : 'PASS';
const u = ctx.usage; u.cost = Number(u.cost) || 0; u.input = Number(u.input) || 0; u.output = Number(u.output) || 0;
const srcTxt = ctx.project_ref === 'abcde' ? 'ABCDE sample files' : (ctx.project_ref === 'inline' ? 'files or text supplied in the request' : 'none');
let foot = '\n\n---\n_Mira run ' + ctx.run_id.slice(0, 8) + ' | Agent route: ' + ctx.route + ' | Data: ' + srcTxt + ' | Grounding check: ' + gStatus + ' | LLM calls: ' + u.calls + ' | Tokens: ' + u.input + ' in, ' + u.output + ' out | Est. cost: $' + u.cost.toFixed(5) + '_';
if ((g.warnings || []).length) foot += '\n\n_Grounding notes: ' + g.warnings.join(' ') + '_';
if ((g.dropped || []).length) foot += '\n\n_Removed by guardrails: ' + g.dropped.join('; ') + '_';
if ((ctx.notes || []).length) foot += '\n\n_Input notes: ' + ctx.notes.join(' ') + '_';
const out = ukDates(ctx.response_md) + foot;
const latency = t1 - ctx.t0;
// ---- Langfuse trace (OpenTelemetry JSON) ----
function toNano(ms) { return String(ms) + '000000'; }
function A(k, v) {
  if (typeof v === 'number' && Number.isInteger(v)) return { key: k, value: { intValue: String(v) } };
  if (typeof v === 'number') return { key: k, value: { doubleValue: v } };
  if (typeof v === 'boolean') return { key: k, value: { boolValue: v } };
  return { key: k, value: { stringValue: typeof v === 'string' ? v : JSON.stringify(v) } };
}
const trunc = function (s) { s = typeof s === 'string' ? s : JSON.stringify(s); return s.length > 30000 ? s.slice(0, 30000) + '...[truncated]' : s; };
const rootId = uid(16);
const spans = [];
spans.push({ traceId: ctx.run_id, spanId: rootId, name: 'mira-run', kind: 1, startTimeUnixNano: toNano(ctx.t0), endTimeUnixNano: toNano(t1), status: { code: 1 }, attributes: [
  A('langfuse.trace.name', 'Mira: ' + (ctx.intent || 'request')), A('langfuse.session.id', ctx.session_id), A('langfuse.observation.type', 'span'),
  A('langfuse.observation.input', trunc(ctx.request)), A('langfuse.observation.output', trunc(out)),
  A('langfuse.trace.metadata.intent', String(ctx.intent)), A('langfuse.trace.metadata.route', String(ctx.route)), A('langfuse.trace.metadata.project_ref', String(ctx.project_ref)),
  A('langfuse.trace.metadata.grounding_status', gStatus), A('langfuse.trace.metadata.as_of', ctx.as_of), A('langfuse.trace.metadata.cost_usd', String(u.cost.toFixed(6))), A('langfuse.trace.metadata.latency_ms', String(latency)),
  A('langfuse.trace.metadata.agents', (ctx.agents_used || []).join(', ')) ] });
ctx.spans.forEach(function (s) {
  const at = [A('langfuse.observation.type', s.type === 'generation' ? 'generation' : 'span'), A('langfuse.trace.name', 'Mira: ' + (ctx.intent || 'request')), A('langfuse.session.id', ctx.session_id)];
  if (s.input !== null) at.push(A('langfuse.observation.input', trunc(s.input)));
  if (s.output !== null) at.push(A('langfuse.observation.output', trunc(s.output)));
  if (s.type === 'generation') {
    at.push(A('gen_ai.request.model', String(s.attrs.model || ctx.cfg.model)));
    at.push(A('gen_ai.usage.input_tokens', Number(s.attrs.in || 0)));
    at.push(A('gen_ai.usage.output_tokens', Number(s.attrs.out || 0)));
    at.push(A('langfuse.observation.metadata.cost_usd', String(Number(s.attrs.cost || 0).toFixed(6))));
    at.push(A('langfuse.observation.metadata.status', String(s.attrs.status)));
  }
  spans.push({ traceId: ctx.run_id, spanId: s.id, parentSpanId: rootId, name: s.name, kind: 1, startTimeUnixNano: toNano(s.t0), endTimeUnixNano: toNano(Math.max(s.t1, s.t0)), status: { code: s.attrs && s.attrs.status === 'error' ? 2 : 1 }, attributes: at });
});
const trace_payload = { resourceSpans: [{ resource: { attributes: [A('service.name', ctx.cfg.service_name || 'mira')] }, scopeSpans: [{ scope: { name: 'mira-n8n' }, spans: spans }] }] };
const result = { output: out, route: ctx.route, intent: ctx.intent, project_ref: ctx.project_ref, grounding_status: gStatus, grounding: g, usage: u, latency_ms: latency, trace_id: ctx.run_id, agents_used: ctx.agents_used, as_of: ctx.as_of };
return [{ json: { result: result, trace_payload: trace_payload, tracing_enabled: ctx.cfg.tracing_enabled, langfuse_url: ctx.cfg.langfuse_host + '/api/public/otel/v1/traces' } }];
