# Mira evaluation, cost and production metrics

Version 1.0 | 18 October 2026

## 1. What has been tested, and with what

| Layer | Tested | How | Result |
|---|---|---|---|
| Routing, gates, code-computed answers, validators, renderers, Langfuse trace payload | Yes | Real n8n 2.35.7 instance, stand-in model server (`tests/stub_llm.js`) | 12 of 12 baseline tests, all extra tests pass |
| Guardrails against model errors | Yes | Stand-in server in modes `hallucinate`, `garbage`, `error` | Invented ids, phases, figures and sprint mentions removed; counts and tables still correct when the model fails |
| Chat trigger, webhook, CSV file upload | Yes | Same instance | Pass |
| Production workflow import | Yes | `n8n import:workflow` on a clean instance | Imports; credentials are placeholders |
| Real OpenAI output quality | **No** | Needs your key | Section 3 below |
| Real Langfuse traces and screenshots | **No** | Needs your keys | Section 3 below |

The stand-in server is not a language model. Its token counts are estimates (characters divided by 4). Real quality and real cost are only known after the live run.

## 2. Baseline tests T1 to T12

Expected elements come from the problem statement. A test passes when every expected element is present and no forbidden element appears. Run `node tests/run_baseline.js --label real` to produce `tests/out/results_real.md`.

| Test | Input (short) | Route | Expected |
|---|---|---|---|
| T1 | Plan for the ABCDE project | plan | 8 phases, all timeline milestones, 24 weeks, goals 15% and 10%, no invented figures or phases |
| T2 | Plan for "We want to build a chatbot" | insufficient | Flags insufficient detail; asks for scope, timeline, team size; no plan |
| T3 | Risk assessment for ABCDE | risk | All 10 register risks by category, relevant to AI and logistics, no unknown ids |
| T4 | Risk assessment for "New project starting soon" | insufficient | Asks for project details; no invented risks |
| T5 | Weekly status, Sprint 3, sample board | status | Tasks by status, Sprint 3 task names, T024 blocked, health rating, no progress percentage |
| T6 | Weekly status for "Things are going fine" | insufficient | States no task data; no ids, percentages or counts |
| T7 | Top 3 risks | risk | Exactly 3 distinct register risks |
| T8 | Blocked or at-risk tasks | at_risk | T024 blocked; T006 overdue |
| T9 | Vague project text | insufficient | Asks for scope, goals, deliverables |
| T10 | Task counts | counts | Done 5, In progress 3, To do 16, Blocked 1, total 25 |
| T11 | Upcoming milestones | milestones | Milestones from the timeline file only, including 8 May 2026 |
| T12 | Stakeholder update, Sprint 2 | update | Sprint 2 tasks (T004 to T006); no Sprint 3 or later content |

Stand-in run (plumbing only): 12 of 12 pass. **Live run on gpt-4o-mini via n8n Cloud, 18 October 2026: 12 of 12 pass.**

### Result record (fill from `results_real.md`)

| Test | Pass | Hallucination found | LLM calls | Tokens in / out | Cost USD | Latency s | Notes |
|---|---|---|---|---|---|---|---|
| T1 | Pass | No | 2 | 1,715 / 879 | 0.00078 | 10.9 | All 3 goals |
| T2 | Pass | No | 1 | 549 / 24 | 0.00010 | 0.9 |  |
| T3 | Pass | No | 2 | 2,856 / 541 | 0.00075 | 6.0 | 10 risks |
| T4 | Pass | No | 1 | 547 / 28 | 0.00010 | 0.9 |  |
| T5 | Pass | No | 2 | 1,336 / 225 | 0.00034 | 3.1 |  |
| T6 | Pass | No | 1 | 548 / 29 | 0.00010 | 0.9 |  |
| T7 | Pass | No | 2 | 2,850 / 593 | 0.00078 | 7.7 | R09, R01, R05 ranked by board evidence |
| T8 | Pass | No | 2 | 1,134 / 137 | 0.00025 | 2.7 |  |
| T9 | Pass | No | 1 | 545 / 28 | 0.00010 | 0.8 |  |
| T10 | Pass | No | 1 | 551 / 27 | 0.00010 | 0.8 | Counts from code |
| T11 | Pass | No | 1 | 546 / 31 | 0.00010 | 1.0 | Dates from code |
| T12 | Pass | No | 2 | 1,155 / 157 | 0.00027 | 2.4 | Guardrail removed a false "sprint complete" claim (REVIEW) |

## 3. What you need to do for the live results

1. Follow the README setup.
2. Run `node tools/check_keys.js` and confirm both services answer OK.
3. Run the 12 tests: `node tests/run_baseline.js --label real`. Send me `tests/out/results_real.md`. I will tune prompts from any failures.
4. Open Langfuse, Traces. Take screenshots of: the trace list; one plan trace expanded (spans, tokens, cost); one status trace; one insufficient-input trace (single call).
5. Rerun after prompt changes and keep both result files as before and after evidence.

## 4. Cost analysis

Prices (gpt-4o-mini, set in `Config`): USD 0.15 per 1M input tokens, USD 0.60 per 1M output tokens. Confirm against the OpenAI pricing page on the day you submit.

Measured on the live run (18 October 2026). Total for the 12 tests: 14,332 input and 2,699 output tokens, USD 0.0038. Average USD 0.0003 per request and 3.2 seconds.

| Request | Model calls | Input tokens | Output tokens | Cost USD |
|---|---|---|---|---|
| Plan (T1) | 2 | about 1,900 | about 700 | about 0.0007 |
| Risk assessment (T3) | 2 | about 3,000 | about 900 | about 0.0010 |
| Top 3 risks (T7) | 2 | about 3,000 | about 300 | about 0.0006 |
| Status report (T5) | 2 | about 1,300 | about 300 | about 0.0004 |
| Blocked tasks (T8) | 2 | about 1,150 | about 200 | about 0.0003 |
| Stakeholder update (T12) | 2 | about 1,050 | about 250 | about 0.0003 |
| Counts, milestones, vague input | 1 | about 560 | about 25 | about 0.0001 |

Average across the 12 tests: USD 0.0003 per request. At 20 requests per user per day, that is about USD 0.006 per user per day, or about USD 0.12 per user per month (20 working days). 100 users: about USD 12 per month.

Cost controls built in: code answers need no specialist call; vague input is stopped before any specialist call; temperature 0 and a 1,800 token output cap; Langfuse shows cost per trace.

## 5. Production metrics

| Metric | Definition | Target | Source |
|---|---|---|---|
| Plan groundedness | Share of plan objectives, phases and milestones that trace to the description or timeline file | 100% (enforced by validator) | Trace metadata `grounding_status`, answer footer |
| Risk relevance | Share of register risks with a relevance note a reviewer rates as specific to the project | 90% or more | Reviewer sample of 10 outputs per week |
| Status accuracy | Counts, task lists and health rating equal the board | 100% (computed by code) | Weekly spot check against the CSV |
| Guardrail intervention rate | Share of requests with status REVIEW (something removed) | Below 15%; every case reviewed | Langfuse filter on `grounding_status` |
| Cost and latency | Cost and seconds per request | Below USD 0.002 and below 15 s | Langfuse trace cost and latency |
| Refusal accuracy | Vague input returns a request for details, not an answer | 100% on T2, T4, T6, T9 | Baseline run |

## 6. Known limits

- The model call can fail or return invalid JSON; the answer then shows only the code-computed parts and says so in the footer.
- Figure checks look at percentages and numbers of 25 or more. A wrong small number in model prose would pass; counts and dates are shown from code tables.
- Dates depend on assumptions A-1 and A-2 in the design document.
- The problem statement's "3 Done tasks" differs from the board's 5. Mira reports the board.
