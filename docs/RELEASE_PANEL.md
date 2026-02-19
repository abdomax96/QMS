# Local Release Panel (Dev Only)

This panel is a local-only helper to trigger release scripts from the UI during local development.

## What it does

- `Deploy Cloudflare Dev`
  - Calls `scripts/deploy-pages.ps1 -Target dev`
- `Promote Dev DB -> Prod`
  - Calls `scripts/promote-prod-with-clone.ps1`
  - Runs inside a temporary `main` git worktree (created by local agent), so triggering from `develop` is allowed.
  - Still enforces that `main` already contains `origin/develop`.
  - Supports execution mode:
    - `safe_full`: apply migrations on Prod + deploy frontend (data-preserving default)
    - `safe_db_only`: apply migrations on Prod only (data-preserving)
    - `full`: clone DB + deploy frontend (destructive)
    - `db_only`: clone DB only (destructive)
    - `app_only`: deploy frontend only (no DB clone)
  - Optional toggles:
    - Clone Storage files (buckets + objects)
    - Sync Supabase dashboard settings (`supabase config push`)
    - Deploy Edge Functions to Prod
  - After DB restore it now runs:
    - `core access repair` (rebuilds critical grants/RLS for `settings/users/user_roles/...`)
    - `core access verify` (hard checks for grants + required policies + global settings row)
  - If verify fails, promotion stops with a clear error before finishing.
  - After DB restore, it also syncs `auth.users` credentials/metadata from Dev to matching users in Prod by `id` (prevents login mismatch after clone).
  - Uses visual confirmations (no typing required in UI):
    - 3 danger acknowledgements (checkboxes)
    - `Arm Prod` button
    - 5-second final unlock
    - `Execute Prod Promotion Now` button
  - The panel still sends backend-required exact approvals automatically:
    - always: `APPROVED FOR PROD`
    - clone modes / storage clone only: `CONFIRM DEV TO PROD CLONE`
  - If Prod endpoint is disabled, the panel enables it automatically at execution time.
- Shows elapsed time from job start until success/failure in the status card.

## Security model

- The panel renders only in local Vite dev mode (`import.meta.env.DEV`) and localhost.
- API calls go to a local agent on `127.0.0.1` only.
- Agent uses automatic browser session auth by default (no manual token input).
- Production endpoint can start disabled, then be auto-enabled by the panel at execution time.
- DB overwrite is blocked unless `ALLOW_PROD_DB_OVERWRITE=YES_I_UNDERSTAND`.
- Prod promotion script refuses to run unless:
  - current branch is `main`
  - working tree is clean
  - `origin/develop` has already been merged into `main`

## Start the local agent

```bash
npm run release:agent
```

No manual token entry is required.

You can also just press `Connect` inside the panel:
- It calls a local Vite endpoint.
- The endpoint force-restarts and auto-runs `npm run release:agent` (loads latest agent code every time).
- Then the panel creates a local browser session automatically.

## Prod confirmation flow (UI)

1. Tick required acknowledgements (3 for destructive clone modes, 2 for safe migration modes).
2. Select execution mode (`safe_full` / `safe_db_only` / `full` / `db_only` / `app_only`).
3. Enable optional backend sync toggles if needed.
4. Click `Arm Prod`.
5. Wait for the `5s` final unlock countdown.
6. Click `Execute Prod Promotion Now`.

## Optional environment variables

### Agent

- `RELEASE_AGENT_HOST` (default: `127.0.0.1`)
- `RELEASE_AGENT_PORT` (default: `8787`)
- `RELEASE_AGENT_ALLOW_BROWSER_SESSION_AUTH` (default: enabled, set `0` to disable)
- `RELEASE_AGENT_TOKEN` (optional master token for CLI calls)
- `ENABLE_PROD_RELEASES` (`1` to start with prod endpoint already enabled; optional)

### Clone script requirements

- `SUPABASE_PROJECT_REF_DEV`
- `SUPABASE_PROJECT_REF_PROD`
- `SUPABASE_DB_PASSWORD_DEV`
- `SUPABASE_DB_PASSWORD_PROD`
- `ALLOW_PROD_DB_OVERWRITE=YES_I_UNDERSTAND`
- `SUPABASE_ACCESS_TOKEN` (required for Storage clone / Dashboard settings sync / Edge Functions deploy)

For safe migration modes (`safe_full`, `safe_db_only`):

- `SUPABASE_PROJECT_REF_PROD`
- `SUPABASE_DB_PASSWORD_PROD`
- `SUPABASE_ACCESS_TOKEN`

Optional overrides:

- `SUPABASE_DB_HOST_DEV`, `SUPABASE_DB_HOST_PROD`
- `SUPABASE_DB_PORT_DEV`, `SUPABASE_DB_PORT_PROD`
- `SUPABASE_DB_USER_DEV`, `SUPABASE_DB_USER_PROD`
- `SUPABASE_DB_NAME_DEV`, `SUPABASE_DB_NAME_PROD`

## Guard check for production bundles

After building production, verify that release panel markers are not included:

```bash
npm run build
npm run verify:prod-build
```

## Notes for access errors after clone

If you ever see `403 permission denied` in prod immediately after clone:

- Re-run promotion once (the flow now includes automatic core access repair + verify).
- Check that prod app uses prod Supabase URL (`xoqkyowtmsgitmabrgny.supabase.co`).
- Confirm session is fresh (sign out/in) so JWT claims reflect latest auth metadata.
