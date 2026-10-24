# Mira evaluation, cost and production metrics

Version 1.1 | 24 October 2026

## 1. What has been tested, and with what

| Layer | Tested | How | Result |
|---|---|---|---|
| Routing, gates, code-computed answers, validators, renderers, Langfuse trace payload | Yes | Real n8n 2.35.7 instance, stand-in model server (`tests/stub_llm.js`) | 12 of 12 baseline tests, all extra tests pass |
| Guardrails against model errors | Yes | Stand-in server in modes `hallucinate`, `garbage`, `error` | Invented ids, phases, figures and sprint mentions removed; counts and tables still correct when the model fails |
| Chat trigger, webhook, CSV file upload | Yes | Same instance | Pass |
| Production workflow import | Yes | `n8n import:workflow` on a clean instance | Imports; credentials are placeholders |
| Real OpenAI output quality | Yes | Live run on gpt-4o-mini through n8n Cloud, 18 October 2026 | 12 of 12 baseline tests pass; T12 trace is REVIEW after the guardrail removed an unsupported completion claim. |
| Real Langfuse traces and screenshots | Yes | Export and screenshots included in `docs/observability/` and `screenshots/` | 78 requests, 119 model generations and 431 observations; 9 of 78 requests have a REVIEW guardrail intervention. |

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

## 3. Live evaluation closeout

The live baseline was run with gpt-4o-mini through n8n Cloud on 18 October 2026. All 12 baseline tests passed. Full outputs, expected-element checks, hallucination flags and pass/fail status are in `tests/out/results_real.md` and `tests/out/results_real.json`.

The Langfuse export contains 78 unique requests, 119 model generations and 431 observations. Nine requests are marked REVIEW because a guardrail removed unsupported content or the risk ranker used a fallback. REVIEW records an intervention for human inspection; it does not change the baseline harness result. T12 is a concrete example: the guardrail removed a false claim that Sprint 2 was complete while T006 remained open, and the final output passed the test.

The trace-linked correction record for T1, T7 and T12 is in `submission/Mira_Design_and_Evaluation_Evidence_v1.0.docx`. Before any prompt or model change, rerun T1 to T12 and compare the outputs with the expected criteria.
