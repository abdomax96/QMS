# AI Assistant Rollout Plan

## Goal

Move the current assistant from limited chat mode to a reliable application operator in controlled phases.

This plan assumes:

- development happens on Dev first
- all database changes land as migrations
- no direct production rollout without explicit approval

## Current State

Already present:

- assistant UI and thread model
- provider settings
- Edge Function orchestration
- partial structured safe-query behavior
- permission checks for `ai_assistant`

Missing for full application intelligence:

- formal capability registry
- full business glossary and synonym resolution
- module-specific read tools
- execution tool layer for writes
- evals and regression suite
- richer audit and approval flow

## Phase 0: Hardening The Current Assistant

Objective:

- stop hallucination
- formalize current safe query behavior

Scope:

- convert existing ad-hoc direct queries in [supabase/functions/ai-assistant/index.ts](c:\Users\abdal\Downloads\QMS\supabase\functions\ai-assistant\index.ts) into named read tools
- add explicit "no data" and "not authorized" response templates
- centralize safe table catalog and excluded fields
- normalize Arabic synonym handling for materials, suppliers, documents, and tasks

Deliverables:

- `capability registry` for existing tools
- `business glossary` seed file
- `safe catalog` module
- stronger response policy

Acceptance criteria:

- the assistant never fabricates suppliers, receivings, or tasks
- missing data yields a clear refusal, not a guessed answer

## Phase 1: Read-Only Business Assistant

Objective:

- make the assistant useful across the app without write risk

Scope:

- implement read tools for tasks, NCR, documents, lab, lab v2, pallet, suppliers, products, recipes
- add RPCs for expensive queries where needed
- wire tool selection through an explicit registry instead of prompt-only inference

Recommended first RPCs or query tools:

- latest lab receiving
- approved suppliers by material
- list my open tasks
- review queue summary
- NCR summary by id
- latest test run / latest lab v2 run

Acceptance criteria:

- at least 20 high-frequency read queries answer from live data
- every answer can be tied to one concrete tool

## Phase 2: Application Vocabulary And Retrieval

Objective:

- make the assistant understand business language the way users speak it

Scope:

- add a business glossary with Arabic synonyms
- add entity alias tables where appropriate
- add document retrieval for SOPs, forms, and policies
- classify prompts into:
  - data question
  - navigation help
  - action request
  - unsupported

Artifacts:

- glossary file
- retrieval adapter
- eval set with Arabic business prompts

Acceptance criteria:

- prompts like `موردين خامة الدقيق` resolve correctly even if the stored record names differ
- document questions use retrieval instead of free-form guessing

## Phase 3: Safe Action Proposals

Objective:

- make the assistant propose correct next steps before it executes anything

Scope:

- formalize proposal generation using the capability registry
- classify actions by risk:
  - low
  - medium
  - high
- require confirmation for medium/high actions
- show the exact target entity and payload summary before approval

First proposal candidates:

- create task from NCR
- assign task owner
- create material receiving draft
- open new direct conversation
- create document draft

Acceptance criteria:

- assistant proposals are deterministic and tool-backed
- no hidden or ambiguous write payload is produced

## Phase 4: Controlled Write Execution

Objective:

- allow the assistant to perform a small set of real tasks

Scope:

- execute low-risk and selected medium-risk actions through dedicated tools
- require permission checks at tool level
- record audit log for every action attempt
- return execution results in a structured assistant response

Recommended first write tools:

1. create task
2. update task status
3. add task comment
4. create material receiving draft
5. create chat conversation
6. create NCR draft

Keep out of this phase:

- destructive deletes
- role/security administration
- wide bulk updates
- sensitive approval changes

Acceptance criteria:

- successful executions are traceable
- denied executions fail safely and clearly

## Phase 5: Multi-Step Workflows

Objective:

- move from single action tools to assistant-led workflows

Examples:

- create NCR, then create follow-up task, then notify responsible user
- create lab test run, then schedule follow-up, then open print view
- create document draft, then submit for review

Requirements:

- workflow state model
- idempotency protection
- compensating behavior for partial failures

Acceptance criteria:

- workflows remain step-based and auditable
- failure in one step does not silently corrupt later steps

## Phase 6: Evals, Telemetry, And Operational Quality

Objective:

- prevent regressions and measure business usefulness

Scope:

- add prompt->tool->answer eval cases
- log latency, failure reason, and tool selection
- create a review loop for wrong answers and missed intents

Metrics:

- hallucination rate
- successful tool selection rate
- answer groundedness rate
- action success rate
- average latency per module

Acceptance criteria:

- every release can be tested against a stable assistant eval suite

## Implementation Track By Repo Area

Frontend:

- [src/components/chat/AiAssistantPanel.tsx](c:\Users\abdal\Downloads\QMS\src\components\chat\AiAssistantPanel.tsx)
- [src/services/aiAssistantService.ts](c:\Users\abdal\Downloads\QMS\src\services\aiAssistantService.ts)
- [src/services/aiAssistantSettingsService.ts](c:\Users\abdal\Downloads\QMS\src\services\aiAssistantSettingsService.ts)

Edge / orchestration:

- [supabase/functions/ai-assistant/index.ts](c:\Users\abdal\Downloads\QMS\supabase\functions\ai-assistant\index.ts)

Business services:

- `src/services/*`
- `src/modules/lab_v2/services/*`

Database:

- `supabase/migrations/*`

Documentation:

- `docs/ai-assistant-*.md`

## Delivery Sequence Recommended For This Project

1. Phase 0 hardening
2. Phase 1 read tools for lab, suppliers, tasks, NCR, documents
3. Phase 2 glossary and retrieval
4. Phase 3 proposals
5. Phase 4 safe writes
6. Phase 6 evals and telemetry
7. Phase 5 workflows

Reason:

- correctness matters more than automation breadth
- the current weakness is false answers, not lack of multi-step workflow

## Definition Of Done For "Assistant Understands The App"

That statement is only true when the assistant can:

- identify module and entity correctly from user language
- answer factual questions from live data
- refuse when data is missing or inaccessible
- propose the correct action with explicit payload
- execute allowed actions safely
- remain constrained by the same permission model as the application

Before that point, it is still a guided assistant, not a trusted operator.
