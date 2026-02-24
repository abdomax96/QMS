# Forms & Reports Collaboration Master Plan (Department Scoped)

## Objective
Enable multi-user report collaboration in `forms_reports` so users in the same department can edit the same report concurrently, see each other's updates live, and audit who changed what.

## Current Baseline (updated - 2026-02-23)
- Collaboration RPC contract exists (`apply_form_instance_patch`, `get_form_instance_change_log`).
- `DataEntryPage` is wired to realtime collaboration with granular cell/field patching.
- Conflict UX and reconnect/backoff are implemented.
- Activity timeline is shown in `CollaborationPanel` with user attribution.
- Rollout is feature-flagged via `VITE_REPORT_COLLAB_ENABLED`.
- Remaining gap is QA gate execution and sign-off in Dev.

## Scope (In)
- Report editing collaboration on `src/pages/DataEntryPage.tsx`.
- Table cell updates, table notes, and basic report fields.
- Presence indicators and live update feedback.
- Change audit timeline (who/when/where/old/new).

## Scope (Out)
- Template designer collaboration.
- Production deployment and production migrations in this phase.
- Cross-department collaboration.

## Mandatory Environment Guardrail
Before any environment diagnosis or bug triage:
1. Open browser DevTools -> Network.
2. Verify `supabase.co` host.
3. Dev must use: `https://znbjgihtxpoznqmrealq.supabase.co`.
4. Prod must use: `https://xoqkyowtmsgitmabrgny.supabase.co`.
5. On mismatch: stop and fix env before continuing.

Recommended console logs at app bootstrap:
```ts
console.log('---------------------------------');
console.log(`ENV: ${import.meta.env.MODE}`);
console.log(`SUPABASE URL: ${import.meta.env.VITE_SUPABASE_URL}`);
console.log('---------------------------------');
```

## Execution Model (Dev First)
### Phase C0 - Readiness and Contract Freeze
- Freeze collaboration contract: payload shape, conflict behavior, lock behavior.
- Confirm permission matrix actions needed for collaborative edit.
- Define acceptance criteria and QA scenarios.

### Phase C1 - Database Contract and Security
- Add migration for collaboration patch contract.
- Add RPC(s) for partial updates to avoid full document overwrite.
- Align `cell_change_history` RLS with department + `check_forms_permission`.
- Keep immutable audit trail for changes.

### Phase C2 - Frontend Wiring
- Mount collaboration hook in `DataEntryPage`.
- Emit granular change events from `FormRenderer`.
- Apply remote patches live to local state.
- Render active collaborators and connection status.

### Phase C3 - Conflict and Reliability Hardening
- Add optimistic version checks for partial updates.
- Handle conflict errors with user-visible recovery flow.
- Add batching/debouncing for burst edits (paste/multi-cell input).
- Add reconnect/backoff handling and stale session handling.

### Phase C4 - QA Gate and Controlled Rollout
- Validate same-department collaboration end-to-end.
- Validate cross-department isolation.
- Validate audit visibility in timeline/activity UI.
- Roll out behind feature flag, dev first.

## Implementation Snapshot (2026-02-23)
- C1: `DONE_IMPL` (migration created, permission and history contract added).
- C2: `DONE_IMPL` (live collaboration connected to report editing flow).
- C3: `DONE_IMPL` (conflict handling, batch/debounce, reconnect, telemetry).
- C4: `IN_PROGRESS` (feature flag + activity timeline + non-editable read-only enforcement done, QA execution pending).

QA execution runbook:
- `docs/forms-reports-collab-qa-runbook.md`

## Non-Negotiable Release Rules
- Never push directly to `main`.
- No production deploy or production migration unless user says exactly: `APPROVED FOR PROD`.
- No secrets in git or logs.
- No production keys in development.

## Definition of Done
A collaboration release is complete only if all are true:
- Two users in same department can edit one report simultaneously.
- Live updates propagate in <= 1 second under normal network.
- Change history shows user name, timestamp, location, old/new values.
- No silent overwrite of unrelated concurrent changes.
- Cross-department users cannot read/update collaboration data.
- Build passes: `npm run build -- --mode development`.
- Backlog file is updated with all checkboxes closed for current phase.

## Tracking File
- Backlog tracker: `docs/forms-reports-collab-backlog.md`
- QA runbook: `docs/forms-reports-collab-qa-runbook.md`
