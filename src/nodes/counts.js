//@uses core,csv,dates,board,render
const ctx = $input.first().json.ctx;
const t0 = Date.now();
const tasks = loadTasks(ctx.data.board_csv);
const asOf = asOfMs(ctx);
const c = countBy(tasks);
const idsOf = function (s, arr) { return arr.filter(function (t) { return t.status === s; }).map(function (t) { return t.id; }).join(', ') || 'None'; };
let md = '# Task status summary\n\n**As of:** ' + fmtDay(asOf) + '  \n**Source:** task board CSV (' + tasks.length + ' tasks)\n\n';
md += 'Done: **' + c['Done'] + '**, In progress: **' + c['In Progress'] + '**, To do: **' + c['To Do'] + '**, Blocked: **' + c['Blocked'] + '** (total ' + c.Total + ').\n\n';
md += mdTable(['Status', 'Count', 'Task IDs'], ['Done', 'In Progress', 'To Do', 'Blocked'].map(function (s) { return [s, c[s], idsOf(s, tasks)]; }).concat([['Total', c.Total, '']])) + '\n';
if (ctx.sprint) {
  const sc = tasks.filter(function (t) { return t.sprint === ctx.sprint; });
  const cs = countBy(sc);
  md += '\n**' + ctx.sprint + ' only:** ' + (sc.length ? 'Done ' + cs['Done'] + ', In progress ' + cs['In Progress'] + ', To do ' + cs['To Do'] + ', Blocked ' + cs['Blocked'] + ' (total ' + cs.Total + ')' : 'no tasks on the board for this sprint') + '.\n';
}
ctx.response_md = md.trim();
ctx.grounding = { agent: 'Status Reporter (counts, computed by code)', warnings: [], dropped: [], metrics: { status_counts_computed: c } };
addSpan(ctx, 'Task counts (code)', 'span', t0, Date.now(), { tasks: tasks.length }, c);
return [{ json: { ctx: ctx } }];
