//@uses core,csv,board,validate,render,llm
const inp = $input.first().json;
const ctx = inp.ctx;
const parsed = parseLLM(inp.resp);
recordLLM(ctx, 'Risk Assessor', ctx.llm_t0, inp.request_body, parsed);
const t0 = Date.now();
const risks = ctx.data.risks_csv ? parseCSV(ctx.data.risks_csv) : [];
const byId = {}; risks.forEach(function (r) { byId[r.risk_id] = r; });
const tasks = ctx.data.board_csv ? loadTasks(ctx.data.board_csv) : [];
const taskIds = tasks.map(function (t) { return t.id; });
const o = parsed.ok ? parsed.obj : {};
const g = { agent: 'Risk Assessor', warnings: [], dropped: [], metrics: {} };
if (!parsed.ok) g.warnings.push('Model output unavailable (' + parsed.error + '). Register values are shown without the relevance column.');
function cleanEvidence(arr) {
  const a = (Array.isArray(arr) ? arr : []).map(String);
  const ok = a.filter(function (x) { return taskIds.indexOf(x) >= 0; });
  if (a.length - ok.length) g.dropped.push((a.length - ok.length) + ' evidence task id(s) not on the board');
  return ok;
}
let md = '';
if (parsed.ok && o.sufficient === false) {
  const miss = (o.missing && o.missing.length) ? o.missing : ['Project description', 'Scope', 'Timeline', 'Team', 'Technology and constraints'];
  md = '# Risk assessment: more detail needed\n\nThe input does not describe a project in enough detail to assess its risks without inventing them. No risk assessment was generated.\n\n**Please provide:**\n' + miss.map(function (m) { return '- ' + m; }).join('\n');
  g.metrics.sufficient = false;
} else if (ctx.intent === 'top_risks') {
  // rank by code from the full assessment: board evidence first (Blocked 3, In Progress 2, To Do 1), then register order
  const stRank = { 'Blocked': 3, 'In Progress': 2, 'To Do': 1 };
  const boardById = {}; if (ctx.data.board_csv) loadTasks(ctx.data.board_csv).forEach(function (t) { boardById[t.id] = t; });
  const seen = {};
  const rawList = (Array.isArray(o.assessments) && o.assessments.length) ? o.assessments : (Array.isArray(o.top_risks) ? o.top_risks.map(function (x) { return { risk_id: x && x.risk_id, relevance: x && x.why, evidence_task_ids: x && x.evidence_task_ids }; }) : []);
  const cand = rawList.filter(function (a) { if (!(a && byId[a.risk_id]) || seen[a.risk_id]) return false; seen[a.risk_id] = 1; return true; });
  if (rawList.length !== cand.length) g.dropped.push('Entries with unknown or repeated risk ids were removed');
  const order = {}; risks.forEach(function (x, i) { order[x.risk_id] = i; });
  let top = cand.map(function (a) {
    const ev = cleanEvidence(a.evidence_task_ids);
    return { risk_id: a.risk_id, why: a.relevance, evidence_task_ids: ev, score: ev.reduce(function (m, id) { return Math.max(m, boardById[id] ? (stRank[boardById[id].status] || 0) : 0); }, 0) };
  });
  top.sort(function (a, b) { return (b.score - a.score) || (order[a.risk_id] - order[b.risk_id]); });
  const basis = 'Risks with a task on the board that concerns them rank first (Blocked, then In Progress, then To Do). Ties follow the order of the risk register. The register has no likelihood or severity scores.';
  if (top.length < 3) {
    const have = {}; top.forEach(function (t) { have[t.risk_id] = 1; });
    const filler = ['R09', 'R01', 'R05'].filter(function (id) { return byId[id] && !have[id]; });
    while (top.length < 3 && filler.length) { const id = filler.shift(); top.push({ risk_id: id, why: 'Added by fallback rule: the board has a task directly concerning this risk (see evidence column).', evidence_task_ids: [] }); }
    g.warnings.push('The model did not return 3 valid risks; fallback ranking was used for the missing places.');
  }
  top = top.slice(0, 3);
  g.metrics.top_returned_valid = top.length;
  md = '# Top 3 risks\n\n**Source:** risk register' + (ctx.data.board_csv ? ' and task board' : '') + '\n\n' + mdTable(['Rank', 'ID', 'Category', 'Risk', 'Potential impact', 'Mitigation', 'Why it ranks here', 'Board evidence'],
    top.map(function (t, i) { const r = byId[t.risk_id]; return [i + 1, r.risk_id, r.category, r.risk_challenge, r.impact, r.mitigation_strategy, strip(t.why), cleanEvidence(t.evidence_task_ids).join(', ') || 'None']; }));
  if (basis) md += '\n\n**Ranking basis:** ' + basis;
} else {
  const ass = {}; (Array.isArray(o.assessments) ? o.assessments : []).forEach(function (a) { if (a && byId[a.risk_id]) ass[a.risk_id] = a; });
  const unknownIds = (Array.isArray(o.assessments) ? o.assessments : []).filter(function (a) { return !(a && byId[a.risk_id]); }).length;
  if (unknownIds) g.dropped.push(unknownIds + ' assessment(s) with an unknown risk id');
  g.metrics.register_risks = risks.length; g.metrics.risks_assessed = Object.keys(ass).length;
  md = '# Risk assessment\n\n**Source:** ' + ((ctx.data.description || '').split(/\r?\n/)[0] || 'project input').slice(0, 120) + (risks.length ? ' and risk register (' + risks.length + ' risks)' : '') + '\n\n';
  if (risks.length) {
    md += '## Risk matrix (from the risk register)\n' + mdTable(['ID', 'Category', 'Risk', 'Potential impact', 'Mitigation', 'Relevance to this project', 'Board evidence'],
      risks.map(function (r) { const a = ass[r.risk_id]; return [r.risk_id, r.category, r.risk_challenge, r.impact, r.mitigation_strategy, a ? strip(a.relevance) : 'Not assessed', a ? (cleanEvidence(a.evidence_task_ids).join(', ') || 'None') : 'None']; })) + '\n\n';
  }
  let der = (Array.isArray(o.derived_risks) ? o.derived_risks : []).map(function (d) {
    const from = (Array.isArray(d.derived_from) ? d.derived_from : []).map(String).filter(function (x) { return x === 'description' || taskIds.indexOf(x) >= 0; });
    return { d: d, from: from };
  });
  const derOk = der.filter(function (x) { return x.from.length && x.d.risk; }).slice(0, 2);
  if (der.length - derOk.length) g.dropped.push((der.length - derOk.length) + ' derived risk(s) without valid support in the input');
  if (derOk.length) md += '## Additional risks derived from project data (not in the risk register)\n_Each is linked to the item that supports it. Mitigations are suggestions._\n\n' + mdTable(['Category', 'Risk', 'Potential impact', 'Suggested mitigation', 'Derived from'], derOk.map(function (x) { return [x.d.category, x.d.risk, x.d.impact, x.d.mitigation, x.from.join(', ')]; })) + '\n\n';
  if (o.overall_note) md += '## Note\n' + strip(o.overall_note) + '\n\n';
  if (!risks.length && !derOk.length) md += '_No risk register was supplied and no risk could be supported by the input._\n';
  md += 'The register has no likelihood or severity scores, so no scores are given.';
}
ctx.response_md = md; ctx.grounding = g;
addSpan(ctx, 'Risk grounding check', 'span', t0, Date.now(), null, g);
return [{ json: { ctx: ctx } }];
