# Forms & Reports Collaboration QA Runbook (Dev)

## Purpose
Manual QA checklist for department-scoped report collaboration before any production planning.

## Scope
- Page: `src/pages/DataEntryPage.tsx`
- Collaboration stack: realtime presence, patch RPC, activity timeline, conflict/reconnect handling.
- Environment: Dev only (`develop` + `qms-dev` + Supabase Dev).

## Environment Guardrail (Mandatory)
1. Open DevTools -> Network.
2. Filter by `supabase.co`.
3. Confirm host is exactly:
   - `https://znbjgihtxpoznqmrealq.supabase.co` for Dev.
4. If host is different: stop QA and fix environment first.

## Required Test Accounts
- User A and User B in the same department with forms edit permission.
- User C in a different department (or without permission to the target report).

## Pre-Flight
1. Ensure `VITE_REPORT_COLLAB_ENABLED=1` (or not set).
2. Confirm Dev DB contract exists (Supabase SQL editor on Dev):
   ```sql
   select routine_name
   from information_schema.routines
   where routine_schema = 'public'
     and routine_name in ('apply_form_instance_patch', 'get_form_instance_change_log')
   order by routine_name;
   ```
3. Open the same report instance in two separate sessions (different browsers/incognito).
4. Confirm report status is editable (`draft` / `in_progress` / `rejected`).

## Scenario Matrix

### S1 - Same Department, Different Cells
1. User A edits a cell in Table 1.
2. User B edits another cell in Table 2 within 10 seconds.
3. Verify both sessions show both updates within ~1 second.
4. Verify activity timeline shows both users and edits.

Expected:
- No overwrite between unrelated cells.
- Active collaborators count is accurate.

### S2 - Same Cell Conflict
1. User A and User B edit the same cell nearly at the same time.
2. Save/broadcast both edits.
3. Verify losing write path shows conflict handling message.
4. Verify latest server version is fetched automatically (no manual action required).
5. If auto-sync fails, click `تحديث من الخادم` and confirm report reloads latest server state.

Expected:
- Conflict is visible, not silent.
- Auto-sync starts immediately and resolves state drift.
- Manual reload remains available as fallback and returns a consistent state.

### S2.1 - Conflict UX Message Accuracy
1. Trigger a same-cell conflict as in S2.
2. Watch top alert text during the first 3-5 seconds.
3. If auto-sync succeeds, confirm alert disappears and save error is cleared.
4. If auto-sync fails, confirm alert text explicitly asks user to click `تحديث من الخادم`.

Expected:
- Message reflects real state (`جاري مزامنة...` vs fallback message).
- No stale conflict banner after successful sync.

### S3 - Cross Department Isolation
1. User C attempts to open or update the same report.
2. Check report data visibility and change submission behavior.

Expected:
- User C cannot read/update collaboration data without access.
- No unauthorized entries in change history.

### S4 - Workflow Transition During Collaboration
1. Keep User A and User B on active collaboration session.
2. Submit report from one session (`submitted`).
3. Attempt edits from the other session.

Expected:
- Collaboration writes stop once report becomes non-editable.
- UI reflects non-editable state and no new collaboration patches are accepted.

### S5 - Reconnect and Recovery
1. Disconnect network for one session for 20-30 seconds.
2. Reconnect network.
3. Verify reconnection status and no duplicate patch application.
4. Optionally use `إعادة المحاولة الآن`.

Expected:
- Connection status transitions correctly (`reconnecting` -> `connected`).
- No duplicated cell updates after reconnect.

### S6 - Browser Refresh with Incoming Changes
1. Keep unsaved local edits in Session A.
2. Apply remote changes from Session B.
3. Refresh Session A.

Expected:
- Latest server data loads correctly.
- Activity timeline still shows attribution (name/time/location).

## Evidence to Capture
- Screenshots:
  - Active collaborators panel.
  - Activity timeline with user names.
  - Conflict banner with auto-sync message.
  - Fallback manual reload action (only if auto-sync fails).
  - Reconnect status.
- Console/network notes:
  - Supabase host confirmation.
  - For conflict scenario: include one console snippet proving conflict was detected.
  - Any collaboration error logs.

## Sign-Off Template
- Date:
- Build hash/branch:
- Tester:
- Result per scenario (S1-S6): Pass/Fail
- Known issues:
- Final verdict: Ready / Not Ready for controlled rollout in Dev
