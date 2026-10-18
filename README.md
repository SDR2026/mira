# Mira: AI-powered project intelligence assistant

Mira is a multi-agent assistant built in n8n for Nexora Pvt. Ltd. It creates project plans, assesses risks, writes weekly status reports, flags blocked and overdue tasks, lists upcoming milestones and drafts stakeholder update emails. The sample project is the ABCDE Ltd. AI adoption project.

## What is in this repo

| Path | Content |
|---|---|
| `workflow/mira_workflow.json` | The n8n workflow to import (31 nodes, 5 agents) |
| `prompts/` | The 6 agent prompts (also embedded in the workflow) |
| `src/` | Readable source of every Code node and the shared library |
| `tools/build_workflow.js` | Rebuilds the workflow JSON from `src/` and `prompts/` |
| `tools/check_keys.js` | One-minute check of your OpenAI and Langfuse keys |
| `data/` | The 5 provided sample files |
| `tests/` | Baseline runner (T1 to T12), guardrail tests, stand-in model server |
| `docs/` | Design document, architecture diagram, evaluation and cost notes |

## Results

All 12 baseline tests pass on gpt-4o-mini through n8n Cloud (18 October 2026). Average cost is USD 0.0003 per request, a plan costs USD 0.00078, and the average response time is 3.2 seconds. Full outputs are in `tests/out/results_real.md`. Screenshots of every test are in `submission/Mira_12_Baseline_Tests_with_Screenshots.docx`. Langfuse screenshots and the trace export are in `screenshots/` and `docs/observability/`.

| Folder | Content |
|---|---|
| `submission/` | Scope of work, Q1 ideation, Q2 write-up, Q3 program charter, Q4 reflection, 12-test document |
| `screenshots/` | Workflow canvas and Langfuse traces |
| `docs/` | Design document, evaluation and cost notes, architecture diagram |

## Setup on n8n Cloud or self-hosted n8n (about 15 minutes)

On n8n Cloud, skip the Node.js and n8n install steps below. Start at step 3.

1. Install Node.js 20 or 22 LTS from nodejs.org.
2. Install and start n8n: `npm install -g n8n`, then `n8n start`. Open http://localhost:5678 and create the owner account.
3. Get keys.
   - OpenAI: an API key with a few dollars of credit (platform.openai.com).
   - Langfuse: create a free project at cloud.langfuse.com. Note the public key (`pk-lf-...`), secret key (`sk-lf-...`) and the region (EU or US).
4. Check the keys before touching n8n. In a terminal, from this folder:
   - Windows PowerShell: `$env:OPENAI_API_KEY="sk-..."; $env:LANGFUSE_PUBLIC_KEY="pk-lf-..."; $env:LANGFUSE_SECRET_KEY="sk-lf-..."; node tools/check_keys.js`
   - macOS or Linux: `OPENAI_API_KEY=sk-... LANGFUSE_PUBLIC_KEY=pk-lf-... LANGFUSE_SECRET_KEY=sk-lf-... node tools/check_keys.js`
   - If your Langfuse project is in the US region, also set `LANGFUSE_HOST=https://us.cloud.langfuse.com`.
5. In n8n, create 2 credentials (Credentials, Create credential):
   - **OpenAI API**, named `OpenAI account`, with your API key.
   - **Basic Auth**, named `Langfuse`. Username is the Langfuse public key. Password is the secret key.
6. In n8n, Workflows, Import from file, choose `workflow/mira_workflow.json`.
7. Open the node **LLM call (OpenAI)** and pick the `OpenAI account` credential. Open the node **Langfuse trace** and pick the `Langfuse` credential.
8. US Langfuse region only: open the node **Config** and change `langfuse_host` to `https://us.cloud.langfuse.com`.
9. Click **Publish** (top right) so the chat URL and webhook are live.
10. Open the node **Chat in** and use its chat URL, or click **Open chat** in the editor. Ask:
    - `Generate a project plan for the ABCDE Ltd. AI adoption project`
    - `Generate a weekly status report for Sprint 3 using the sample task board`
    - `Draft a stakeholder update email for Sprint 2 using the sample task board`
11. Open Langfuse, Traces. Each request shows as one trace named `Mira: <intent>`, with one child per agent call, tokens and cost.

Optional: attach your own `.csv` or `.txt` files in the chat. Mira recognises a task board (`task_id` column), a timeline (`phase_name`), a risk register (`risk_id`) or a project description (`.txt`).

## How the 12 baseline tests are run

`eval_mira_inputs.txt` holds the 12 inputs. Run them against your live workflow:

```
node tests/run_baseline.js --label real --url http://localhost:5678/webhook/mira
```

This writes `tests/out/results_real.md` (one section per test, with the full output and a pass or fail against the expected elements) and `results_real.json`. Add `--extra` only when using the stand-in server (see below).

The workflow also answers `POST /webhook/mira` with JSON `{ "input": "..." }`. Optional body fields: `as_of` (YYYY-MM-DD), `project_start` (YYYY-MM-DD), `audience`, `task_board_csv`, `timeline_csv`, `risks_csv`, `project_description`.

## Dates

The sample data has no "today". Mira uses a baseline of **24 April 2026** (end of week 4) and states it in every dated answer. Project week 1 is taken to start Monday **30 March 2026**, inferred from the task board due dates. Override either with `as_of` and `project_start`, or edit them in the **Config** node.

## Working without OpenAI

`tests/stub_llm.js` is a stand-in server that returns well-formed JSON built from the input. It is not a language model. It exists to test routing, guardrails and rendering offline. `node tests/stub_llm.js` then `node tools/build_workflow.js test` builds a copy that calls it.

## Rebuilding the workflow

Edit a file in `src/nodes/`, `src/lib.js` or `prompts/`, then run `node tools/build_workflow.js prod`. Re-import the JSON. Credentials must be selected again after an import.
