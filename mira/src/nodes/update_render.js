//@uses core,csv,dates,board,validate,render,llm
const inp = $input.first().json;
const ctx = inp.ctx;
const parsed = parseLLM(inp.resp);
recordLLM(ctx, 'Update Writer', ctx.llm_t0, inp.request_body, parsed);
const t0 = Date.now();
const tasks = loadTasks(ctx.data.board_csv);
const sc = tasks.filter(function (t) { return t.sprint === ctx.sprint; });
const inIds = sc.map(function (t) { return t.id; });
const others = tasks.filter(function (t) { return t.sprint !== ctx.sprint; });
const sprintNo = ctx.sprint.replace(/\D/g, '');
const g = { agent: 'Update Writer', warnings: [], dropped: [], metrics: { sprint_tasks: sc.length } };
const o = parsed.ok ? parsed.obj : {};
if (!parsed.ok) g.warnings.push('Model text unavailable (' + parsed.error + '). A plain factual summary is used.');
const countsTxt = sc.filter(function (t) { return t.status === 'Done'; }).length + ' of ' + sc.length + ' tasks are done';
let paras = (Array.isArray(o.paragraphs) ? o.paragraphs : []).map(strip).filter(Boolean);
// guardrails: no other sprint, no tasks outside the sprint, no other tasks' names
paras = paras.filter(function (p) {
  if (taskIdsIn(p).some(function (x) { return inIds.indexOf(x) < 0; })) { g.dropped.push('Paragraph cited a task outside ' + ctx.sprint); return false; }
  const sp = (p.match(/sprint\s*\d+/gi) || []).map(function (s) { return s.replace(/\D/g, ''); });
  if (sp.some(function (n) { return n !== sprintNo; })) { g.dropped.push('Paragraph mentioned another sprint'); return false; }
  if (others.some(function (t) { return norm(p).indexOf(norm(t.name)) >= 0; })) { g.dropped.push('Paragraph named a task from another sprint'); return false; }
  return true;
});
if (!paras.length) paras = [ctx.sprint + ' status as of ' + fmt(asOfMs(ctx)) + ': ' + countsTxt + '. Details are listed below.'];
paras = paras.map(function (p) { const r = scrub(p, '', [String(sc.length)]); r.removed.forEach(function (x) { g.dropped.push('Sentence with a figure not in the data removed: "' + x.slice(0, 80) + '"'); }); return r.text; }).filter(Boolean);
const sprintDone = sc.every(function (t) { return t.status === 'Done'; });
if (!sprintDone) paras = paras.filter(function (p) { if (/\b(sprint (is |was |has been )?(fully )?(complete|completed|finished|closed)|(completed|finished|closed) (the )?sprint|we have completed .*sprint)/i.test(p)) { g.dropped.push('Paragraph claimed the sprint is complete while tasks are still open'); return false; } return true; });
const openT = sc.filter(function (t) { return t.status !== 'Done'; });
const lead = ctx.sprint + ' status as of ' + fmt(asOfMs(ctx)) + ': ' + countsTxt + (openT.length ? '. Open: ' + openT.map(function (t) { return t.id + ' (' + t.status + (t.dueMs < asOfMs(ctx) ? ', overdue by ' + Math.round((asOfMs(ctx) - t.dueMs) / 86400000) + ' days, due ' + fmt(t.dueMs) : ', due ' + fmt(t.dueMs)) + ')'; }).join('; ') : '') + '.';
paras.unshift(lead);
const subjRaw = strip(o.subject);
const subOk = subjRaw && (subjRaw.match(/sprint\s*\d+/gi) || []).every(function (x) { return x.replace(/\D/g, '') === sprintNo; }) && others.every(function (t) { return norm(subjRaw).indexOf(norm(t.name)) < 0; });
const subject = subOk ? subjRaw : ('Project update: ' + ctx.sprint + ' progress');
const greeting = strip(o.greeting) || 'Hello,';
const closing = strip(o.closing).replace(/\s*(best |kind |warm )?regards,?\s*$/i, '').trim() || 'Please let me know if you would like more detail.';
let md = '# Stakeholder update email (' + ctx.sprint + ', ' + ctx.audience + ' audience)\n\n**Subject:** ' + subject + '\n\n' + greeting + '\n\n' + paras.join('\n\n') + '\n\n**' + ctx.sprint + ' at a glance (as of ' + fmt(asOfMs(ctx)) + ')**\n\n' + mdTable(['ID', 'Task', 'Status', 'Owner', 'Due'], sc.map(function (t) { return [t.id, t.name, t.status, t.assignee, fmt(t.dueMs)]; })) + '\n\n' + closing + '\n\nRegards,  \n[Your name]';
ctx.response_md = md; ctx.grounding = g;
addSpan(ctx, 'Update grounding check', 'span', t0, Date.now(), null, g);
return [{ json: { ctx: ctx } }];
