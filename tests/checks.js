// Automated checks for the 12 baseline tests (T1..T12) plus extra guardrail tests.
// Each check returns { pass, found:[], failed:[] } using the criteria in the problem statement.
const fs = require('fs'); const path = require('path');
const data = p => fs.readFileSync(path.join(__dirname, '../data', p), 'utf8');
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false; const s = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c; }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const h = rows[0]; return rows.slice(1).filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(h.map((k, i) => [k.trim(), (r[i] || '').trim()])));
}
const tasks = parseCSV(data('sample_task_board.csv')); const risks = parseCSV(data('project_risks.csv')); const phases = parseCSV(data('project_timeline.csv'));
const taskIds = tasks.map(t => t.task_id); const riskIds = risks.map(r => r.risk_id);
const counts = { Done: 0, 'In Progress': 0, 'To Do': 0, Blocked: 0 }; tasks.forEach(t => counts[t.status]++);
const lc = s => s.toLowerCase();
const body = out => out.split('\n---\n_Mira run')[0]; // answer without the footer

function mk() { const found = [], failed = []; return { found, failed, must: (n, ok) => (ok ? found : failed).push(n), mustNot: (n, bad) => (bad ? failed : found).push('NOT ' + n) }; }
function done(c) { return { pass: c.failed.length === 0, found: c.found, failed: c.failed }; }
const unknownTaskIds = t => (t.match(/\bT\d{3}\b/g) || []).filter(x => taskIds.indexOf(x) < 0);
const unknownRiskIds = t => (t.match(/\bR\d{2}\b/g) || []).filter(x => riskIds.indexOf(x) < 0);

const CHECKS = {
  T1(out) { const c = mk(), b = body(out), l = lc(b);
    c.must('phases (all 8 phase names)', phases.every(p => l.includes(lc(p.phase_name))));
    c.must('milestones (all timeline milestones)', phases.every(p => p.milestones_deliverables.split(';').every(m => l.includes(lc(m.trim())))));
    c.must('timeline (24 weeks)', /24 weeks/.test(b));
    c.must('grounded goals (15% and 10%)', /15%/.test(b) && /10%/.test(b));
    c.mustNot('invented figures', (b.match(/\d+(\.\d+)?%/g) || []).some(n => !['15%', '10%'].includes(n)) || /\$\s?\d/.test(b));
    c.mustNot('invented phase', /phase 9|global expansion/i.test(b));
    return done(c); },
  T2(out) { const c = mk(), b = body(out), l = lc(b);
    c.must('flagged as insufficient', /insufficient|more detail needed/.test(l));
    c.must('asks for scope', /scope/.test(l)); c.must('asks for timeline', /timeline/.test(l)); c.must('asks for team size', /team size/.test(l));
    c.mustNot('full plan generated', /phase 1|week(s)? 1|milestone/i.test(b) && /\| phase/i.test(l));
    return done(c); },
  T3(out) { const c = mk(), b = body(out);
    c.must('categorized risks (all 10 register ids)', riskIds.every(r => b.includes(r)));
    c.must('categories present', risks.every(r => b.includes(r.category)));
    c.must('relevant to logistics / AI (mentions AI or data in relevance)', /AI|data|logistics|forecast/i.test(b));
    c.mustNot('unknown risk ids', unknownRiskIds(b).length > 0);
    c.mustNot('generic unrelated risks (e.g. weather, pandemic)', /hurricane|weather|pandemic|earthquake/i.test(b));
    return done(c); },
  T4(out) { const c = mk(), b = body(out), l = lc(b);
    c.must('flagged as insufficient', /insufficient|more detail needed/.test(l)); c.must('asks for project details', /project description|scope|timeline/.test(l));
    c.mustNot('invented risks (no risk ids, no risk table)', riskIds.some(r => b.includes(r)) || /\| risk/i.test(b));
    return done(c); },
  T5(out) { const c = mk(), b = body(out);
    c.must('tasks by status sections', /## Completed/.test(b) && /## In progress/.test(b) && /## Blocked/.test(b) && /## To do/.test(b));
    const s3 = tasks.filter(t => t.sprint === 'Sprint 3');
    c.must('actual Sprint 3 task names (all 4)', s3.every(t => b.includes(t.task_name)));
    c.must('blocked T024 shown with its name', b.includes('Security review of AI infrastructure'));
    c.must('overall health', /Overall health: (GREEN|AMBER|RED)/.test(b));
    c.mustNot('unknown task ids', unknownTaskIds(b).length > 0);
    c.mustNot('progress percentages', /\b\d{1,3}\s?% (complete|done)/i.test(b));
    return done(c); },
  T6(out) { const c = mk(), b = body(out), l = lc(b);
    c.must('states no task data available', /no task data/.test(l));
    c.mustNot('fabricated task ids', /\bT\d{3}\b/.test(b)); c.mustNot('fabricated percentages', /\d+\s?%/.test(b));
    c.mustNot('status counts', /done:\s*\d|in progress:\s*\d/i.test(b));
    return done(c); },
  T7(out) { const c = mk(), b = body(out), ids = [...new Set(b.match(/\bR\d{2}\b/g) || [])];
    c.must('exactly 3 distinct register risks', ids.length === 3);
    c.must('risks come from the CSV (names match)', ids.every(id => b.includes(risks.find(r => r.risk_id === id).risk_challenge)));
    c.mustNot('invented risk ids', unknownRiskIds(b).length > 0);
    return done(c); },
  T8(out) { const c = mk(), b = body(out);
    c.must('identifies T024 as Blocked', /T024/.test(b) && /Blocked/.test(b));
    c.must('checks due dates (overdue T006)', /T006/.test(b) && /Overdue/.test(b));
    c.mustNot('unknown task ids', unknownTaskIds(b).length > 0);
    return done(c); },
  T9(out) { const c = mk(), b = body(out), l = lc(b);
    c.must('asks for scope', /scope/.test(l)); c.must('asks for goals', /goals/.test(l)); c.must('asks for deliverables', /deliverables/.test(l));
    c.mustNot('detailed plan generated', /\| phase/i.test(l) || /week 1/i.test(l));
    return done(c); },
  T10(out) { const c = mk(), b = body(out);
    c.must('Done count matches CSV (' + counts.Done + ')', new RegExp('Done: \\*\\*' + counts.Done + '\\*\\*').test(b));
    c.must('In progress count matches (' + counts['In Progress'] + ')', new RegExp('In progress: \\*\\*' + counts['In Progress'] + '\\*\\*').test(b));
    c.must('To do count matches (' + counts['To Do'] + ')', new RegExp('To do: \\*\\*' + counts['To Do'] + '\\*\\*').test(b));
    c.must('Blocked count matches (' + counts.Blocked + ')', new RegExp('Blocked: \\*\\*' + counts.Blocked + '\\*\\*').test(b));
    c.must('total ' + tasks.length, new RegExp('total ' + tasks.length).test(b));
    return done(c); },
  T11(out) { const c = mk(), b = body(out);
    const ms = phases.flatMap(p => p.milestones_deliverables.split(';').map(m => m.trim()));
    const listed = ms.filter(m => b.includes(m));
    c.must('lists milestones from project_timeline.csv', listed.length > 0);
    c.must('includes the use-case milestone due 8 May 2026', b.includes('Final list of prioritized use cases with success criteria') && /8 May 2026/.test(b));
    c.mustNot('milestones outside the timeline file', (b.match(/^\| \d+ \w+ \d{4}[^|]*\|[^|]*\|([^|]*)\|/gm) || []).some(r => !ms.some(m => r.includes(m))));
    c.must('states how dates were set (week 1 anchor)', /week 1 is taken to start/i.test(b));
    return done(c); },
  T12(out) { const c = mk(), b = body(out);
    const s2 = tasks.filter(t => t.sprint === 'Sprint 2'), later = tasks.filter(t => parseInt(t.sprint.replace(/\D/g, '')) >= 3);
    c.must('references Sprint 2 tasks (all 3)', s2.every(t => b.includes(t.task_id) && b.includes(t.task_name)));
    c.must('has subject and greeting', /\*\*Subject:\*\*/.test(b) && /Dear|Hello|Hi /.test(b));
    c.mustNot('Sprint 3+ task ids', later.some(t => b.includes(t.task_id)));
    c.mustNot('Sprint 3+ task names', later.some(t => b.includes(t.task_name)));
    c.mustNot('mention of Sprint 3 or later', /sprint\s*([3-9]|10)\b/i.test(b));
    return done(c); },
};
module.exports = { CHECKS, tasks, risks, phases, counts, body };
