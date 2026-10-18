//@uses
// Single place for settings. Edit values here (model, prices, defaults, hosts).
const it = $input.first();
const cfg = {
  llm_url: '__LLM_URL__',
  model: 'gpt-4o-mini',
  max_tokens: 1800,
  price_in_per_m: 0.15,   // USD per 1M input tokens (gpt-4o-mini)
  price_out_per_m: 0.60,  // USD per 1M output tokens (gpt-4o-mini)
  as_of_default: '2026-04-24',        // baseline "today" for the ABCDE sample data (decision D-02)
  project_start_default: '2026-03-30', // Monday of project week 1, inferred from task board due dates
  tracing_enabled: __TRACING__,
  langfuse_host: '__LF_HOST__',        // EU cloud. US cloud: https://us.cloud.langfuse.com
  data: {
    description: __D_DESC__,
    timeline_csv: __D_TIMELINE__,
    risks_csv: __D_RISKS__,
    board_csv: __D_BOARD__
  }
};
return [{ json: Object.assign({}, it.json, { cfg: cfg }), binary: it.binary }];
