//@uses core,csv,dates
const it = $input.first();
const j = it.json;
const cfg = j.cfg;
const body = j.body || {};
const text = j.chatInput || body.input || body.chatInput || body.text || j.input || '';
const ctx = {
  run_id: uid(32), session_id: String(j.sessionId || body.session_id || ('mira-' + uid(8))),
  t0: Date.now(), request: String(text).trim(), cfg: cfg,
  as_of: body.as_of || cfg.as_of_default, project_start: body.project_start || cfg.project_start_default,
  audience: body.audience || null, supplied: {}, spans: [], agents_used: [], notes: [],
  usage: { input: 0, output: 0, cost: 0, calls: 0 }
};
if (body.project_description) ctx.supplied.description = String(body.project_description);
if (body.timeline_csv) ctx.supplied.timeline_csv = String(body.timeline_csv);
if (body.risks_csv) ctx.supplied.risks_csv = String(body.risks_csv);
if (body.task_board_csv) ctx.supplied.board_csv = String(body.task_board_csv);
// uploaded files (chat upload or multipart webhook): detect type from the CSV header
if (it.binary) {
  for (const key of Object.keys(it.binary)) {
    try {
      const buf = await this.helpers.getBinaryDataBuffer(0, key);
      const txt = buf.toString('utf8');
      const first = txt.split(/\r?\n/)[0] || '';
      const name = (it.binary[key].fileName || key);
      if (/task_id/i.test(first)) ctx.supplied.board_csv = txt;
      else if (/phase_name/i.test(first)) ctx.supplied.timeline_csv = txt;
      else if (/risk_id/i.test(first)) ctx.supplied.risks_csv = txt;
      else if (/\.txt$/i.test(name) || /text\/plain/.test(it.binary[key].mimeType || '')) ctx.supplied.description = txt;
      else ctx.notes.push('Attachment ' + name + ' was not recognised as a task board, timeline, risk register or description.');
    } catch (e) { ctx.notes.push('Could not read an attachment: ' + String(e.message || e).slice(0, 100)); }
  }
}
if (isNaN(pd(ctx.as_of))) { ctx.notes.push('as_of "' + ctx.as_of + '" is not YYYY-MM-DD; using ' + cfg.as_of_default); ctx.as_of = cfg.as_of_default; }
if (isNaN(pd(ctx.project_start))) { ctx.notes.push('project_start is not YYYY-MM-DD; using ' + cfg.project_start_default); ctx.project_start = cfg.project_start_default; }
addSpan(ctx, 'Normalize request', 'span', ctx.t0, Date.now(), { request: ctx.request }, { supplied_files: Object.keys(ctx.supplied), as_of: ctx.as_of });
return [{ json: { ctx: ctx } }];
