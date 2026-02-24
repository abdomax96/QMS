# Forms & Reports Collaboration Backlog

Status legend:
- `TODO` = not started
- `IN_PROGRESS` = active implementation
- `DONE_IMPL` = implementation done, pending gate QA
- `DONE` = implementation + QA gate complete
- `BLOCKED` = needs decision/access

## C0 - Readiness and Contract Freeze
Module status: `TODO`
- [ ] Define collaboration patch payload contract (cell, notes, basic fields).
- [ ] Define conflict policy (same cell vs different cells).
- [ ] Define lock transition behavior during active edit (`draft`/`in_progress`/`rejected` only).
- [ ] Define UI behavior for remote updates and connection failures.

Artifacts:
- `docs/forms-reports-collab-master-plan.md`
- `docs/forms-reports-collab-backlog.md`

## C1 - Database Contract and Security
Module status: `DONE_IMPL`
- [x] Add migration: collaboration patch RPC(s) for partial updates.
- [x] Add/align indexes for patch lookup and version checks.
- [x] Align `cell_change_history` RLS with `check_forms_permission` and department membership.
- [x] Confirm immutable history policies stay enforced.
- [x] Add SQL comments and migration notes.

Expected files:
- `supabase/migrations/YYYYMMDDHHMMSS_report_collaboration_patch_contract.sql`

Gate checklist:
- [ ] migration applies on Dev successfully
- [ ] no RLS regression for existing report operations
- [ ] unauthorized user cannot insert/read change history

## C2 - Frontend Wiring
Module status: `DONE_IMPL`
- [x] Mount `useFormCollaboration` in `src/pages/DataEntryPage.tsx`.
- [x] Integrate `CollaborationPanel` in edit page shell.
- [x] Emit granular field/cell events from `src/components/forms/FormRenderer.tsx`.
- [x] Apply inbound remote patches to local state safely.
- [x] Show visual feedback for externally changed cells.

Expected files:
- `src/pages/DataEntryPage.tsx`
- `src/components/forms/FormRenderer.tsx`
- `src/components/collaboration/CollaborationPanel.tsx`
- `src/hooks/useFormCollaboration.ts`
- `src/services/realtimeCollaborationService.ts`

Gate checklist:
- [ ] two browser sessions see live updates
- [ ] active collaborators list is accurate
- [ ] no UI lockups on burst edits

## C3 - Conflict and Reliability Hardening
Module status: `DONE_IMPL`
- [x] Add optimistic version guard on collaboration patch writes.
- [x] Handle conflict errors with recoverable UX.
- [x] Add debounce/batch strategy for high-frequency edits.
- [x] Add reconnect flow and user-visible offline status.
- [x] Add minimal telemetry logs for collaboration failures.

Expected files:
- `src/services/realtimeCollaborationService.ts`
- `src/services/optimisticLockService.ts`
- `src/pages/DataEntryPage.tsx`

Gate checklist:
- [ ] conflict paths tested (same cell, same section, same report)
- [ ] reconnect flow tested (network drop and restore)
- [ ] no duplicate change application after reconnect

## C4 - QA Gate and Controlled Rollout
Module status: `IN_PROGRESS`
- [x] Add feature flag (`VITE_REPORT_COLLAB_ENABLED`).
- [x] Add collaboration activity timeline in UI (name/time/location/scope).
- [x] Enforce read-only mode when report status becomes non-editable during active session.
- [ ] Execute scenario matrix (same department / different department).
- [ ] Verify history attribution (name, timestamp, location, old/new).
- [ ] Validate report workflow transitions while collaboration is active.
- [ ] Update docs with final rollout notes.

Expected files:
- `src/config/*` or env usage sites
- `docs/forms-reports-collab-qa-runbook.md`
- `docs/DEPLOYMENT.md` (if rollout instructions changed)

Gate checklist:
- [x] `npm run build -- --mode development` passes
- [ ] manual QA sign-off in Dev
- [ ] user acceptance sign-off before any production plan

## Test Matrix (Minimum)
- [ ] User A + User B in same department edit different tables.
- [ ] User A + User B edit same cell within 5 seconds.
- [ ] User C from different department attempts access.
- [ ] Report status changes to `submitted` during active session.
- [ ] Browser refresh with unsaved local edits + incoming remote updates.
