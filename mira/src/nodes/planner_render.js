//@uses core,csv,timeline,validate,render,llm
const inp = $input.first().json;
const ctx = inp.ctx;
const parsed = parseLLM(inp.resp);
recordLLM(ctx, 'Planner', ctx.llm_t0, inp.request_body, parsed);
const t0 = Date.now();
const desc = ctx.data.description || '';
const tl = ctx.data.timeline_csv ? loadTimeline(ctx.data.timeline_csv) : [];
const g = { agent: 'Planner', warnings: [], dropped: [], metrics: {} };
const o = parsed.ok ? parsed.obj : {};
if (!parsed.ok) g.warnings.push('Model output unavailable (' + parsed.error + '). The plan below uses source files only, without model narrative.');
let md = '';
if (parsed.ok && o.sufficient === false) {
  const miss = (o.missing && o.missing.length) ? o.missing : ['Scope', 'Goals', 'Deliverables', 'Timeline', 'Team size'];
  md = '# Project plan: more detail needed\n\nThe input does not contain enough detail to write a plan without inventing content. No plan was generated.\n\n**Please provide:**\n' + miss.map(function (m) { return '- ' + m; }).join('\n');
  g.metrics.sufficient = false;
} else {
  // objectives: keep only those with evidence copied from the description
  const objAll = Array.isArray(o.objectives) ? o.objectives : [];
  const dn = norm(desc);
  const stem = function (w) { return w.replace(/(ing|ed|es|s)$/, ''); };
  const dwords = dn.split(' ').map(stem);
  // evidence passes if it is a literal quote, or if at least 80% of its words (min 3) occur in the description
  const evidenceOk = function (ev) {
    const n = norm(ev); if (dn.indexOf(n) >= 0) return true;
    const ws = n.split(' ').filter(function (w) { return w.length > 2; }).map(stem);
    if (ws.length < 3) return false;
    return ws.filter(function (w) { return dwords.indexOf(w) >= 0; }).length / ws.length >= 0.8;
  };
  const objectives = objAll.filter(function (ob) { return ob && ob.text && ob.evidence && evidenceOk(ob.evidence); }).map(function (ob) { return { text: ob.text, evidence: ob.evidence }; });
  if (objAll.length - objectives.length) g.dropped.push((objAll.length - objectives.length) + ' objective(s) without matching evidence in the description');
  const scopeAll = Array.isArray(o.scope_areas) ? o.scope_areas : [];
  const scope = scopeAll.filter(function (s) { return norm(desc).indexOf(norm(s)) >= 0; });
  if (scopeAll.length - scope.length) g.dropped.push((scopeAll.length - scope.length) + ' scope area(s) not named in the description');
  // phases: the timeline file is authoritative; compare what the model returned
  const llmPh = Array.isArray(o.phases) ? o.phases : [];
  let matched = 0;
  llmPh.forEach(function (lp) {
    const t = tl.filter(function (x) { return x.phase === Number(lp.phase); })[0];
    if (!t) return;
    const nameOk = norm(t.name) === norm(lp.name);
    const msOk = (lp.milestones || []).every(function (m) { return t.milestones.some(function (tm) { return norm(tm) === norm(m); }); });
    if (nameOk && msOk) matched++;
  });
  g.metrics.phases_in_source = tl.length; g.metrics.phases_from_model = llmPh.length; g.metrics.phases_matching_source = matched;
  g.metrics.phase_groundedness = llmPh.length ? Math.round(100 * matched / llmPh.length) / 100 : null;
  if (tl.length && llmPh.length && matched < llmPh.length) g.warnings.push('Model phases differed from the timeline file in ' + (llmPh.length - matched) + ' place(s). The table below is taken from the timeline file.');
  const srcAll = desc + ' ' + (ctx.data.timeline_csv || '');
  const sc1 = function (t) { const r = scrub(t, srcAll, ['24', '6']); r.removed.forEach(function (x) { g.dropped.push('Sentence with figures not in the sources removed: "' + x.slice(0, 80) + '"'); }); return r.text; };
  o.project_summary = sc1(o.project_summary); o.approach = sc1(o.approach); o.governance = sc1(o.governance);
  objectives.forEach(function (ob) { ob.text = sc1(ob.text); });
  g.metrics.objectives_kept = objectives.length; g.metrics.objectives_returned = objAll.length;
  const firstLine = (desc.split(/\r?\n/)[0] || 'project description').slice(0, 120);
  md += '# Project plan\n\n**Source:** ' + firstLine + (tl.length ? ' and project timeline file' : '') + '\n\n';
  if (o.project_summary) md += '## Summary\n' + strip(o.project_summary) + '\n\n';
  const objectivesShown = objectives.filter(function (ob) { return strip(ob.text); });
  if (objectivesShown.length) md += '## Objectives\n' + objectivesShown.map(function (ob) { return '- ' + strip(ob.text) + ' _(source: "' + strip(ob.evidence) + '")_'; }).join('\n') + '\n\n';
  if (scope.length) md += '## Scope areas\n' + scope.map(function (s) { return '- ' + strip(s); }).join('\n') + '\n\n';
  if (o.approach) md += '## Approach\n' + strip(o.approach) + '\n\n';
  if (tl.length) {
    const rows = tl.map(function (p) { return [p.phase, p.name, p.start + ' to ' + p.end, p.activities.join('; '), p.milestones.join('; ')]; });
    const total = Math.max.apply(null, tl.map(function (p) { return p.end; }));
    md += '## Phases, milestones and timeline\n' + mdTable(['Phase', 'Name', 'Weeks', 'Key activities', 'Milestones and deliverables'], rows) + '\n\n';
    md += '## Timeline estimate\nTotal duration: ' + total + ' weeks (week ' + Math.min.apply(null, tl.map(function (p) { return p.start; })) + ' to week ' + total + '), in ' + tl.length + ' phases, as stated in the timeline file. The file gives weeks only; no calendar dates are stated.\n\n';
  } else if (llmPh.length) {
    md += '## Proposed phases (no timeline file was supplied)\n_These phases are not from a source file. Weeks are not stated in the input._\n\n' + mdTable(['Phase', 'Name', 'Key activities', 'Milestones'], llmPh.map(function (p) { return [p.phase, p.name, (p.key_activities || []).join('; '), (p.milestones || []).join('; ')]; })) + '\n\n';
  }
  if (o.governance && norm(o.governance) !== 'not stated') md += '## Governance\n' + strip(o.governance) + '\n\n';
  const gaps = uniq((Array.isArray(o.information_gaps) ? o.information_gaps : []).map(strip).filter(Boolean));
  if (gaps.length) md += '## Information not provided in the sources\n' + gaps.map(function (x) { return '- ' + x; }).join('\n') + '\n';
}
ctx.response_md = md; ctx.grounding = g;
addSpan(ctx, 'Planner grounding check', 'span', t0, Date.now(), null, g);
return [{ json: { ctx: ctx } }];
