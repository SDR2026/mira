# Mira baseline results (real)

Run: 2026-10-18T09:04:36.337Z

| Test | Route | Pass | LLM calls | Tokens in/out | Est. cost USD | Latency ms | Grounding | Failed criteria |
|---|---|---|---|---|---|---|---|---|
| T1 | plan | Pass | 2 | 1715/879 | 0.00078 | 10877 | PASS |  |
| T2 | insufficient | Pass | 1 | 549/24 | 0.00010 | 946 | PASS |  |
| T3 | risk | Pass | 2 | 2856/541 | 0.00075 | 5993 | PASS |  |
| T4 | insufficient | Pass | 1 | 547/28 | 0.00010 | 904 | PASS |  |
| T5 | status | Pass | 2 | 1336/225 | 0.00034 | 3088 | PASS |  |
| T6 | insufficient | Pass | 1 | 548/29 | 0.00010 | 879 | PASS |  |
| T7 | risk | Pass | 2 | 2850/593 | 0.00078 | 7688 | PASS |  |
| T8 | at_risk | Pass | 2 | 1134/137 | 0.00025 | 2699 | PASS |  |
| T9 | insufficient | Pass | 1 | 545/28 | 0.00010 | 946 | PASS |  |
| T10 | counts | Pass | 1 | 551/27 | 0.00010 | 764 | PASS |  |
| T11 | milestones | Pass | 1 | 546/31 | 0.00010 | 1017 | PASS |  |
| T12 | update | Pass | 2 | 1155/157 | 0.00027 | 2418 | REVIEW |  |

## T1

**Input:** Generate a project plan for the AI Adoption Project at ABCDE Ltd. Use the provided project description.

**Expected elements present:** phases (all 8 phase names); milestones (all timeline milestones); timeline (24 weeks); grounded goals (15% and 10%); NOT invented figures; NOT invented phase

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Project plan

**Source:** AI Adoption Project Description for ABCDE Ltd. and project timeline file

## Summary
ABCDE Ltd. is embarking on an AI adoption initiative to enhance operational efficiency, improve customer experience, and drive data-driven decision-making across the organization.

## Objectives
- reduce delivery delays by 15% _(source: "Key goals include reducing delivery delays by 15%")_
- lowering operational costs by 10% _(source: "Key goals include lowering operational costs by 10%")_
- improving service responsiveness _(source: "Key goals include improving service responsiveness")_

## Scope areas
- demand forecasting
- route optimization
- inventory management
- customer support

## Approach
The project will focus on integrating AI-powered tools into core business functions. It will be implemented in phases, beginning with a detailed assessment of current workflows and data infrastructure, followed by pilot implementations in targeted departments.

## Phases, milestones and timeline
| Phase | Name | Weeks | Key activities | Milestones and deliverables |
|---|---|---|---|---|
| 1 | Project Initiation | 1 to 2 | Define project scope; Form cross-functional team; Initial stakeholder meeting | Project charter signed off; Team structure finalized |
| 2 | Current State Analysis | 3 to 4 | Assess existing processes & systems; Identify data sources & gaps | Current systems audit report; Gap analysis report |
| 3 | Use Case Selection | 5 to 6 | Shortlist priority AI use cases (forecasting, route optimization) | Final list of prioritized use cases with success criteria |
| 4 | Pilot Design | 7 to 10 | Data collection & preparation; Model design and development | Working prototype models; Data pipelines established |
| 5 | Pilot Implementation | 11 to 14 | Deploy AI models in test environments; Monitor performance | Pilot results report; User feedback and performance metrics |
| 6 | Evaluation & Iteration | 15 to 16 | Evaluate pilot outcomes; Adjust models as needed | Updated models and process refinements |
| 7 | Full Deployment | 17 to 22 | Scale AI models across selected departments; Train staff | Full production rollout; Training sessions completed |
| 8 | Monitoring & Review | 23 to 24 | Continuous performance monitoring; Final project review | Project closure report; Recommendations for future scaling |

## Timeline estimate
Total duration: 24 weeks (week 1 to week 24), in 8 phases, as stated in the timeline file. The file gives weeks only; no calendar dates are stated.

## Governance
A cross-functional task force comprising data scientists, IT professionals, and business stakeholders will oversee the deployment.



---
_Mira run 55391c8a | Agent route: plan | Data: ABCDE sample files | Grounding check: PASS | LLM calls: 2 | Tokens: 1715 in, 879 out | Est. cost: $0.00078_

</details>

## T2

**Input:** Generate a project plan for: "We want to build a chatbot." (vague input)

**Expected elements present:** flagged as insufficient; asks for scope; asks for timeline; asks for team size; NOT full plan generated

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Project plan: more information needed

**Insufficient information.** The request does not describe a project in enough detail. A plan written from this would be invented. Nothing was generated.

**Please provide:**
- Project scope (what is being built and for whom)
- Goals and success measures
- Deliverables
- Timeline or deadline
- Team size and roles

If you mean the ABCDE Ltd. AI Adoption Project, say so and I will use the provided project files.

---
_Mira run 0fa5e5e2 | Agent route: insufficient | Data: none | Grounding check: PASS | LLM calls: 1 | Tokens: 549 in, 24 out | Est. cost: $0.00010_

</details>

## T3

**Input:** Generate a risk assessment for the AI Adoption Project at ABCDE Ltd. Use the provided project description.

**Expected elements present:** categorized risks (all 10 register ids); categories present; relevant to logistics / AI (mentions AI or data in relevance); NOT unknown risk ids; NOT generic unrelated risks (e.g. weather, pandemic)

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Risk assessment

**Source:** AI Adoption Project Description for ABCDE Ltd. and risk register (10 risks)

## Risk matrix (from the risk register)
| ID | Category | Risk | Potential impact | Mitigation | Relevance to this project | Board evidence |
|---|---|---|---|---|---|---|
| R01 | Data Quality & Availability | Incomplete or unstructured data | Poor model performance and inaccurate outcomes | Perform early data audits and implement robust data governance | The project description mentions the importance of data quality for enhancing operational efficiency and decision-making. | T006 |
| R02 | Integration Issues | Difficulty integrating AI with legacy systems | Delays in deployment and operational disruptions | Plan integration roadmap and use APIs/middleware | Integrating AI with existing logistics systems is a key focus of the project, which may lead to integration challenges. | None |
| R03 | Talent & Skills Gap | Lack of internal AI/ML expertise | Overreliance on external vendors and slow progress | Provide staff training and hire specialized talent | The project involves AI adoption, which requires specialized skills that may not be present internally. | T020 |
| R04 | Change Resistance | Employees resist adopting AI-driven workflows | Low adoption and reduced ROI | Strong change management and early engagement | The project aims to change workflows significantly, which could lead to resistance from employees. | None |
| R05 | Ethical & Legal Concerns | Risks of biased models or data privacy violations | Legal repercussions and reputational damage | Involve legal early and implement fairness checks | The project involves handling data, raising concerns about data privacy and model bias. | T025 |
| R06 | Cost Overruns | Underestimation of AI development costs | Budget constraints and project delays | Set realistic budget and build in contingency funds | The project may face budget constraints if AI development costs are underestimated. | None |
| R07 | Unrealistic Expectations | Stakeholders expect immediate ROI | Disillusionment and loss of support | Align expectations and show quick wins | Stakeholders may expect immediate results from the AI adoption, which could lead to disillusionment. | None |
| R08 | Model Performance Drift | AI models lose accuracy over time | Incorrect decisions and trust erosion | Regular retraining cycles and monitoring dashboards | The project involves deploying AI models, which may lose accuracy over time if not monitored. | None |
| R09 | Security Vulnerabilities | AI models targeted by adversarial attacks | Data breaches and operational risks | Adopt AI security best practices and penetration testing | Security vulnerabilities are a concern as the project involves AI models that could be targeted. | T024 |
| R10 | Vendor Lock-in | Overdependence on a specific AI platform | Flexibility loss and future switching costs | Favor open standards and negotiate flexible vendor terms | The project may lead to vendor lock-in if a specific AI platform is heavily relied upon. | None |

## Note
The assessment highlights various risks associated with data quality, integration, and employee adoption, which are critical for the success of the AI adoption project.

The register has no likelihood or severity scores, so no scores are given.

---
_Mira run 95690e39 | Agent route: risk | Data: ABCDE sample files | Grounding check: PASS | LLM calls: 2 | Tokens: 2856 in, 541 out | Est. cost: $0.00075_

</details>

## T4

**Input:** Generate a risk assessment for: "New project starting soon." (vague input)

**Expected elements present:** flagged as insufficient; asks for project details; NOT invented risks (no risk ids, no risk table)

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Risk assessment: more information needed

**Insufficient information.** The request does not describe a project, so any risks listed would be invented. Nothing was generated.

**Please provide:**
- Project description (what is being built, for whom, in which domain)
- Scope and goals
- Timeline
- Team and stakeholders
- Technology, data and constraints

If you mean the ABCDE Ltd. AI Adoption Project, say so and I will use the provided project files.

---
_Mira run 06083018 | Agent route: insufficient | Data: none | Grounding check: PASS | LLM calls: 1 | Tokens: 547 in, 28 out | Est. cost: $0.00010_

</details>

## T5

**Input:** Generate a weekly status report using the sample task board data for Sprint 3.

**Expected elements present:** tasks by status sections; actual Sprint 3 task names (all 4); blocked T024 shown with its name; overall health; NOT unknown task ids; NOT progress percentages

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Weekly status report: Sprint 3

**As of:** Friday 24 April 2026  
**Scope:** Sprint 3 (4 tasks). Board-wide counts and blockers are shown for context.  
**Source:** task board CSV (25 tasks)

## Overall health: AMBER
- 1 blocked task(s): T024
- 1 overdue open task(s): T006
- 2 In Progress task(s) due within 7 days: T007, T025

_Rule used: GREEN: no blocked, overdue or soon-due open tasks. AMBER: at least one blocked task, one overdue open task, or an In Progress task due within 7 days. RED: 2 or more overdue open tasks, or a blocked task due within 14 days._

## Summary
The current health level is AMBER due to one overdue task and two tasks in progress that are due soon. There are no blocked tasks in the sprint scope, but one task is blocked on the board. Immediate attention is needed for the overdue task.

## Task counts
| Status | Sprint 3 | Whole board |
|---|---|---|
| Done | 0 | 5 |
| In Progress | 2 | 3 |
| To Do | 2 | 16 |
| Blocked | 0 | 1 |
| Total | 4 | 25 |

## Completed in Sprint 3
_No tasks completed in Sprint 3._

**Completed in other sprints (5):** T001 Define project scope and objectives (Sprint 1); T002 Form cross-functional task force (Sprint 1); T003 Initial stakeholder alignment meeting (Sprint 1); T004 Audit existing data infrastructure (Sprint 2); T005 Map current logistics workflows (Sprint 2)

## In progress
| ID | Task | Status | Owner | Sprint | Due |
|---|---|---|---|---|---|
| T007 | Shortlist AI use cases | In Progress | Arjun Mehta | Sprint 3 | 28 April 2026 |
| T025 | Legal review of data usage | In Progress | Sarah Lin | Sprint 3 | 28 April 2026 |

## Blocked (whole board)
| ID | Task | Status | Owner | Sprint | Due | Reason |
|---|---|---|---|---|---|---|
| T024 | Security review of AI infrastructure | Blocked | James Wong | Sprint 5 | 26 May 2026 | waiting for security team availability |

## To do in Sprint 3
| ID | Task | Status | Owner | Sprint | Due |
|---|---|---|---|---|---|
| T008 | Define success criteria for each use case | To Do | Sarah Lin | Sprint 3 | 2 May 2026 |
| T009 | Vendor evaluation for ML platform | To Do | James Wong | Sprint 3 | 5 May 2026 |

## Overdue or at risk (whole board)
| ID | Task | Flag | Why |
|---|---|---|---|
| T024 | Security review of AI infrastructure | Blocked | Blocked: waiting for security team availability (due 26 May 2026, 32 days from the as-of date) |
| T006 | Identify data gaps and quality issues | Overdue | Overdue by 3 days: due 21 April 2026 and status is In Progress |
| T007 | Shortlist AI use cases | Due soon | Due in 4 days (28 April 2026) and status is In Progress |
| T025 | Legal review of data usage | Due soon | Due in 4 days (28 April 2026) and status is In Progress |

## Upcoming milestones (next 14 days)
| Due | Phase | Milestone or deliverable |
|---|---|---|
| 24 April 2026 | 2. Current State Analysis | Current systems audit report |
| 24 April 2026 | 2. Current State Analysis | Gap analysis report |
| 8 May 2026 | 3. Use Case Selection | Final list of prioritized use cases with success criteria |

_Dates assume project week 1 starts Monday 30 March 2026; each milestone falls on the Friday of its phase end week._

## Attention and next actions
- **T006:** This task is overdue by 3 days and needs to be addressed.
- **T007:** This task is due in 4 days and should be prioritized.
- **T025:** This task is also due in 4 days and requires attention.
- Next: **T006:** Complete the overdue task as soon as possible.

---
_Mira run cabc8a30 | Agent route: status | Data: ABCDE sample files | Grounding check: PASS | LLM calls: 2 | Tokens: 1336 in, 225 out | Est. cost: $0.00034_

</details>

## T6

**Input:** Generate a weekly status report for: "Things are going fine." (no task data)

**Expected elements present:** states no task data available; NOT fabricated task ids; NOT fabricated percentages; NOT status counts

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Weekly status report: more information needed

**Insufficient information.** No task data is available. Without a task board I cannot state which tasks are done, in progress, blocked or at risk, or any progress figure. Nothing was generated.

**Please provide:**
- A task board export (CSV with task_id, task_name, status, assignee, priority, sprint, due_date)
- The sprint or week to report on

If you mean the ABCDE Ltd. AI Adoption Project, say so and I will use the provided project files.

---
_Mira run f82e33c2 | Agent route: insufficient | Data: none | Grounding check: PASS | LLM calls: 1 | Tokens: 548 in, 29 out | Est. cost: $0.00010_

</details>

## T7

**Input:** What are the top 3 risks for the ABCDE Ltd project based on the risk data?

**Expected elements present:** exactly 3 distinct register risks; risks come from the CSV (names match); NOT invented risk ids

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Top 3 risks

**Source:** risk register and task board

| Rank | ID | Category | Risk | Potential impact | Mitigation | Why it ranks here | Board evidence |
|---|---|---|---|---|---|---|---|
| 1 | R09 | Security Vulnerabilities | AI models targeted by adversarial attacks | Data breaches and operational risks | Adopt AI security best practices and penetration testing | The project description does not address security, but the risk of AI models being targeted by adversarial attacks is relevant. | T024 |
| 2 | R01 | Data Quality & Availability | Incomplete or unstructured data | Poor model performance and inaccurate outcomes | Perform early data audits and implement robust data governance | The project description mentions the importance of data quality for AI model performance, linking it to the risk of incomplete or unstructured data. | T004, T006 |
| 3 | R05 | Ethical & Legal Concerns | Risks of biased models or data privacy violations | Legal repercussions and reputational damage | Involve legal early and implement fairness checks | The project description does not explicitly mention ethical concerns, but the use of AI raises potential risks of biased models or data privacy violations. | T025 |

**Ranking basis:** Risks with a task on the board that concerns them rank first (Blocked, then In Progress, then To Do). Ties follow the order of the risk register. The register has no likelihood or severity scores.

---
_Mira run 7d00d1ee | Agent route: risk | Data: ABCDE sample files | Grounding check: PASS | LLM calls: 2 | Tokens: 2850 in, 593 out | Est. cost: $0.00078_

</details>

## T8

**Input:** Which tasks are blocked or at risk of missing their deadline based on the task board?

**Expected elements present:** identifies T024 as Blocked; checks due dates (overdue T006); NOT unknown task ids

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Blocked and at-risk tasks

**As of:** Friday 24 April 2026  
**Source:** task board CSV  
**Rule:** at risk = open task already past its due date, or due within 7 days and not Done. Blocked tasks are always listed.

| ID | Task | Status | Owner | Sprint | Due | Flag | Why | Suggested action |
|---|---|---|---|---|---|---|---|---|
| T024 | Security review of AI infrastructure | Blocked | James Wong | Sprint 5 | 26 May 2026 | Blocked | Blocked: waiting for security team availability (due 26 May 2026, 32 days from the as-of date) | Escalate to secure a slot with the security team for the review. |
| T006 | Identify data gaps and quality issues | In Progress | Priya Nair | Sprint 2 | 21 April 2026 | Overdue | Overdue by 3 days: due 21 April 2026 and status is In Progress | Prioritize completing the gap analysis report to address the overdue status. |
| T007 | Shortlist AI use cases | In Progress | Arjun Mehta | Sprint 3 | 28 April 2026 | Due soon | Due in 4 days (28 April 2026) and status is In Progress | Continue progressing on the shortlist of AI use cases to meet the upcoming deadline. |
| T025 | Legal review of data usage | In Progress | Sarah Lin | Sprint 3 | 28 April 2026 | Due soon | Due in 4 days (28 April 2026) and status is In Progress | Ensure the legal review of data usage is completed before the due date. |

## Milestones due in the next 14 days, with open tasks due by then
| Due | Milestone or deliverable | Open tasks due on or before this date |
|---|---|---|
| 24 April 2026 | Current systems audit report | T006 (In Progress) |
| 24 April 2026 | Gap analysis report | T006 (In Progress) |
| 8 May 2026 | Final list of prioritized use cases with success criteria | T006 (In Progress), T007 (In Progress), T008 (To Do), T009 (To Do), T025 (In Progress) |

---
_Mira run 9bfc0adf | Agent route: at_risk | Data: ABCDE sample files | Grounding check: PASS | LLM calls: 2 | Tokens: 1134 in, 137 out | Est. cost: $0.00025_

</details>

## T9

**Input:** Generate a project plan for a 2-week project with no details provided.

**Expected elements present:** asks for scope; asks for goals; asks for deliverables; NOT detailed plan generated

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Project plan: more information needed

**Insufficient information.** The request does not describe a project in enough detail. A plan written from this would be invented. Nothing was generated.

**Please provide:**
- Project scope (what is being built and for whom)
- Goals and success measures
- Deliverables
- Timeline or deadline
- Team size and roles

If you mean the ABCDE Ltd. AI Adoption Project, say so and I will use the provided project files.

---
_Mira run c52d5f8a | Agent route: insufficient | Data: none | Grounding check: PASS | LLM calls: 1 | Tokens: 545 in, 28 out | Est. cost: $0.00010_

</details>

## T10

**Input:** Summarize the current project status: how many tasks are done, in progress, and to do?

**Expected elements present:** Done count matches CSV (5); In progress count matches (3); To do count matches (16); Blocked count matches (1); total 25

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Task status summary

**As of:** Friday 24 April 2026  
**Source:** task board CSV (25 tasks)

Done: **5**, In progress: **3**, To do: **16**, Blocked: **1** (total 25).

| Status | Count | Task IDs |
|---|---|---|
| Done | 5 | T001, T002, T003, T004, T005 |
| In Progress | 3 | T006, T007, T025 |
| To Do | 16 | T008, T009, T010, T011, T012, T013, T014, T015, T016, T017, T018, T019, T020, T021, T022, T023 |
| Blocked | 1 | T024 |
| Total | 25 |  |

---
_Mira run 662bcdfb | Agent route: counts | Data: ABCDE sample files | Grounding check: PASS | LLM calls: 1 | Tokens: 551 in, 27 out | Est. cost: $0.00010_

</details>

## T11

**Input:** What milestones are coming up in the next 2 weeks based on the timeline?

**Expected elements present:** lists milestones from project_timeline.csv; includes the use-case milestone due 8 May 2026; NOT milestones outside the timeline file; states how dates were set (week 1 anchor)

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Upcoming milestones: next 14 days

**As of:** Friday 24 April 2026 (window ends 8 May 2026)  
**Source:** project timeline file and task board

| Due | Phase | Milestone or deliverable | Open board tasks due on or before this date |
|---|---|---|---|
| 24 April 2026 (as-of date) | 2. Current State Analysis, end of week 4 | Current systems audit report | T006 (In Progress) |
| 24 April 2026 (as-of date) | 2. Current State Analysis, end of week 4 | Gap analysis report | T006 (In Progress) |
| 8 May 2026 | 3. Use Case Selection, end of week 6 | Final list of prioritized use cases with success criteria | T006 (In Progress), T007 (In Progress), T008 (To Do), T009 (To Do), T025 (In Progress) |

**How dates were set:** the timeline file gives weeks, not dates. Week 1 is taken to start on Monday 30 March 2026 (inferred from the board's first due dates; override with project_start). Each milestone falls on the Friday of its phase end week. The files hold no milestone completion status, so none is reported.

---
_Mira run 88c8a423 | Agent route: milestones | Data: ABCDE sample files | Grounding check: PASS | LLM calls: 1 | Tokens: 546 in, 31 out | Est. cost: $0.00010_

</details>

## T12

**Input:** Generate a stakeholder update email summarizing Sprint 2 progress.

**Expected elements present:** references Sprint 2 tasks (all 3); has subject and greeting; NOT Sprint 3+ task ids; NOT Sprint 3+ task names; NOT mention of Sprint 3 or later

**Missing or violated:** none

**Hallucination detected by checker:** No

**Result:** Pass

<details><summary>Full output</summary>

# Stakeholder update email (Sprint 2, leadership audience)

**Subject:** Sprint 2 Update

Dear Team,

Sprint 2 status as of 24 April 2026: 2 of 3 tasks are done. Open: T006 (In Progress, overdue by 3 days, due 21 April 2026).

The remaining task, 'Identify data gaps and quality issues' (T006), is currently in progress and is overdue by 3 days. We will continue to monitor its status closely.

**Sprint 2 at a glance (as of 24 April 2026)**

| ID | Task | Status | Owner | Due |
|---|---|---|---|---|
| T004 | Audit existing data infrastructure | Done | Priya Nair | 18 April 2026 |
| T005 | Map current logistics workflows | Done | James Wong | 18 April 2026 |
| T006 | Identify data gaps and quality issues | In Progress | Priya Nair | 21 April 2026 |

Please let me know if you would like more detail.

Regards,  
[Your name]

---
_Mira run 04630f19 | Agent route: update | Data: ABCDE sample files | Grounding check: REVIEW | LLM calls: 2 | Tokens: 1155 in, 157 out | Est. cost: $0.00027_

_Removed by guardrails: Paragraph claimed the sprint is complete while tasks are still open_

</details>

