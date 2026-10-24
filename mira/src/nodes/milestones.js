//@uses core,csv,dates,board,timeline,render
const ctx = $input.first().json.ctx;
const t0 = Date.now();
const tl = loadTimeline(ctx.data.timeline_csv);
const asOf = asOfMs(ctx), ps = startMs(ctx);
let days = 14;
const m = /next\s+(\d+)\s*(day|week)s?/i.exec(ctx.request);
if (m) days = Number(m[1]) * (/week/i.test(m[2]) ? 7 : 1);
const all = milestoneList(tl, ps);
const win = all.filter(function (x) { return x.dueMs >= asOf && diffDays(x.dueMs, asOf) <= days; });
const tasks = ctx.data.board_csv ? loadTasks(ctx.data.board_csv) : [];
const openBy = function (ms) { return tasks.filter(function (t) { return t.status !== 'Done' && t.dueMs <= ms; }).map(function (t) { return t.id + ' (' + t.status + ')'; }).join(', ') || 'None'; };
let md = '# Upcoming milestones: next ' + days + ' days\n\n**As of:** ' + fmtDay(asOf) + ' (window ends ' + fmt(addDays(asOf, days)) + ')  \n**Source:** project timeline file' + (tasks.length ? ' and task board' : '') + '\n\n';
if (win.length) {
  md += mdTable(['Due', 'Phase', 'Milestone or deliverable'].concat(tasks.length ? ['Open board tasks due on or before this date'] : []),
    win.map(function (x) { return [fmt(x.dueMs) + (x.dueMs === asOf ? ' (as-of date)' : ''), x.phase + '. ' + x.phase_name + ', end of week ' + x.week, x.milestone].concat(tasks.length ? [openBy(x.dueMs)] : []); })) + '\n';
} else md += '_No milestones in the timeline fall inside this window._\n';
md += '\n**How dates were set:** the timeline file gives weeks, not dates. Week 1 is taken to start on ' + fmtDay(ps) + ' (inferred from the board\'s first due dates; override with project_start). Each milestone falls on the Friday of its phase end week. The files hold no milestone completion status, so none is reported.';
ctx.response_md = md;
ctx.grounding = { agent: 'Milestone Tracker (computed by code)', warnings: [], dropped: [], metrics: { milestones_in_source: all.length, milestones_listed: win.length } };
addSpan(ctx, 'Upcoming milestones (code)', 'span', t0, Date.now(), { as_of: ctx.as_of, days: days }, { listed: win.map(function (x) { return x.milestone; }) });
return [{ json: { ctx: ctx } }];
