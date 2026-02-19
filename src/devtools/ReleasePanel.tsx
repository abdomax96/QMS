import { useCallback, useEffect, useMemo, useState } from 'react';

type AgentJobState = {
  status: 'idle' | 'running' | 'success' | 'error';
  jobName: string | null;
  progress: number;
  step: string;
  startedAt: string | null;
  finishedAt: string | null;
  logs: string[];
  error: string | null;
};

type AgentHealth = {
  ok: boolean;
  browserSessionAuthEnabled?: boolean;
  masterTokenConfigured?: boolean;
  prodReleasesEnabled?: boolean;
};

const INITIAL_STATE: AgentJobState = {
  status: 'idle',
  jobName: null,
  progress: 0,
  step: 'idle',
  startedAt: null,
  finishedAt: null,
  logs: [],
  error: null,
};

const SESSION_TOKEN_STORAGE_KEY = 'qms_release_agent_session';
const SESSION_EXPIRES_STORAGE_KEY = 'qms_release_agent_session_expires';
const DEFAULT_AGENT_URL = 'http://127.0.0.1:8787';
const START_AGENT_ENDPOINT = '/__qms/release-agent/start?restart=1';
const PROD_APPROVAL_TEXT = 'APPROVED FOR PROD';
const PROD_CLONE_CONFIRM_TEXT = 'CONFIRM DEV TO PROD CLONE';
const PROD_ARM_DELAY_MS = 5000;
const PROMOTE_MODES = ['safe_full', 'safe_db_only', 'full', 'db_only', 'app_only'] as const;

type PromoteMode = (typeof PROMOTE_MODES)[number];

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

const ReleasePanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<AgentJobState>(INITIAL_STATE);
  const [healthOk, setHealthOk] = useState(false);
  const [healthMessage, setHealthMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [authStatus, setAuthStatus] = useState('Initializing local session...');
  const [connectBusy, setConnectBusy] = useState(false);
  const [prodEndpointEnabled, setProdEndpointEnabled] = useState(false);
  const [prodAckApproval, setProdAckApproval] = useState(false);
  const [prodAckClone, setProdAckClone] = useState(false);
  const [prodAckDestructive, setProdAckDestructive] = useState(false);
  const [prodArmedAt, setProdArmedAt] = useState<number | null>(null);
  const [prodMode, setProdMode] = useState<PromoteMode>('safe_full');
  const [prodCloneStorage, setProdCloneStorage] = useState(false);
  const [prodCloneDashboardSettings, setProdCloneDashboardSettings] = useState(false);
  const [prodCloneEdgeFunctions, setProdCloneEdgeFunctions] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [promoteBusy, setPromoteBusy] = useState(false);

  const disabledByEnv = import.meta.env.VITE_ENABLE_RELEASE_PANEL === '0';
  const runOnHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const shouldRender = import.meta.env.DEV && !disabledByEnv && isLocalHost(runOnHost);

  const agentBaseUrl = useMemo(
    () => (import.meta.env.VITE_RELEASE_AGENT_URL || DEFAULT_AGENT_URL).replace(/\/+$/, ''),
    []
  );
  const prodWillCloneDb = prodMode === 'full' || prodMode === 'db_only';
  const prodWillApplyMigrations = prodMode === 'safe_full' || prodMode === 'safe_db_only';
  const prodWillDeployFrontend = prodMode === 'full' || prodMode === 'safe_full' || prodMode === 'app_only';
  const prodHasDestructiveOps = prodWillCloneDb || prodCloneStorage;
  const prodChecklistComplete =
    prodAckApproval && prodAckClone && (!prodHasDestructiveOps || prodAckDestructive);
  const prodWillRunOptionalBackendSync = prodCloneStorage || prodCloneDashboardSettings || prodCloneEdgeFunctions;
  const prodCountdownMs = prodArmedAt ? Math.max(0, PROD_ARM_DELAY_MS - (clockNow - prodArmedAt)) : 0;
  const prodExecuteEnabled = prodChecklistComplete && prodArmedAt !== null && prodCountdownMs === 0;
  const stateStartedMs = state.startedAt ? Date.parse(state.startedAt) : NaN;
  const stateFinishedMs = state.finishedAt ? Date.parse(state.finishedAt) : NaN;
  const hasStartedTime = Number.isFinite(stateStartedMs);
  const elapsedMs = hasStartedTime
    ? Math.max(
        0,
        (state.status === 'running' ? clockNow : Number.isFinite(stateFinishedMs) ? stateFinishedMs : clockNow) -
          stateStartedMs
      )
    : null;
  const formatElapsed = (ms: number | null): string => {
    if (ms === null || !Number.isFinite(ms)) return '--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const persistSession = useCallback((token: string, expiresAt: number | null) => {
    setSessionToken(token);
    setSessionExpiresAt(expiresAt);
    if (token) {
      window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
      if (expiresAt) {
        window.sessionStorage.setItem(SESSION_EXPIRES_STORAGE_KEY, String(expiresAt));
      } else {
        window.sessionStorage.removeItem(SESSION_EXPIRES_STORAGE_KEY);
      }
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_EXPIRES_STORAGE_KEY);
    }
  }, []);

  const startSession = useCallback(
    async (silent = false) => {
      try {
        const response = await fetch(`${agentBaseUrl}/api/session`, {
          method: 'POST',
          headers: {
            'X-Qms-Panel': 'qms-release-panel',
          },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false || !payload?.sessionToken) {
          throw new Error(payload?.error || `Session init failed (${response.status})`);
        }

        const expiresAt = Date.now() + (Number(payload.expiresInMs) || 0);
        persistSession(payload.sessionToken, expiresAt);
        setAuthStatus('Local session connected.');
        return payload.sessionToken as string;
      } catch (error: any) {
        persistSession('', null);
        setAuthStatus('Local session not connected.');
        if (!silent) {
          setErrorMessage(error?.message || 'Unable to establish release agent session.');
        }
        throw error;
      }
    },
    [agentBaseUrl, persistSession]
  );

  const ensureSession = useCallback(async () => {
    if (sessionToken) {
      if (!sessionExpiresAt || sessionExpiresAt > Date.now()) {
        return sessionToken;
      }
    }
    return startSession(true);
  }, [sessionToken, sessionExpiresAt, startSession]);

  const callAgent = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const requestOnce = async (token: string) => {
        const headers = new Headers(options.headers || {});
        headers.set('X-Release-Session', token);
        if (!headers.has('Content-Type') && options.body) {
          headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(`${agentBaseUrl}${path}`, {
          ...options,
          headers,
        });
        return response;
      };

      let currentToken = await ensureSession();
      let response = await requestOnce(currentToken);

      if (response.status === 401) {
        currentToken = await startSession(true);
        response = await requestOnce(currentToken);
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `Agent request failed (${response.status})`);
      }
      return payload;
    },
    [agentBaseUrl, ensureSession, startSession]
  );

  const loadHealth = useCallback(async (): Promise<boolean> => {
    try {
      const payload: AgentHealth = await fetch(`${agentBaseUrl}/api/health`).then((r) => r.json());
      if (payload?.ok) {
        setHealthOk(true);
        setProdEndpointEnabled(Boolean(payload.prodReleasesEnabled));
        if (payload.prodReleasesEnabled) {
          setHealthMessage('Agent online. Prod endpoint enabled.');
        } else {
          setHealthMessage('Agent online. Prod endpoint disabled.');
        }
        return true;
      } else {
        setHealthOk(false);
        setProdEndpointEnabled(false);
        setHealthMessage('Release Agent is not healthy.');
        return false;
      }
    } catch {
      setHealthOk(false);
      setProdEndpointEnabled(false);
      setHealthMessage('Release Agent is offline.');
      return false;
    }
  }, [agentBaseUrl]);

  const startAgentFromDevServer = useCallback(async () => {
    const response = await fetch(START_AGENT_ENDPOINT, {
      method: 'POST',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || `Failed to start release-agent (${response.status})`);
    }
  }, []);

  const waitForAgentHealth = useCallback(
    async (timeoutMs = 15000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const ok = await loadHealth();
        if (ok) return true;
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      return false;
    },
    [loadHealth]
  );

  const loadState = useCallback(async () => {
    if (!healthOk) return;
    try {
      const payload = await callAgent('/api/state', { method: 'GET' });
      setState(payload.state || INITIAL_STATE);
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to read release state.');
    }
  }, [healthOk, callAgent]);

  useEffect(() => {
    if (!shouldRender) return;

    const savedSessionToken = window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    const savedExpiresRaw = window.sessionStorage.getItem(SESSION_EXPIRES_STORAGE_KEY);
    const savedExpires = savedExpiresRaw ? Number(savedExpiresRaw) : null;

    if (savedSessionToken && (!savedExpires || savedExpires > Date.now())) {
      setSessionToken(savedSessionToken);
      setSessionExpiresAt(savedExpires);
      setAuthStatus('Local session restored.');
    } else {
      persistSession('', null);
      setAuthStatus('Local session required.');
    }
  }, [shouldRender, persistSession]);

  useEffect(() => {
    if (!shouldRender) return;
    void loadHealth();
    const interval = window.setInterval(() => {
      void loadHealth();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadHealth, shouldRender]);

  useEffect(() => {
    if (!shouldRender || !healthOk) return;
    if (!sessionToken) {
      void startSession(true);
    }
  }, [healthOk, sessionToken, shouldRender, startSession]);

  useEffect(() => {
    if (!shouldRender || !healthOk) return;
    void loadState();

    const interval = window.setInterval(() => {
      void loadState();
    }, state.status === 'running' ? 1000 : 2500);

    return () => window.clearInterval(interval);
  }, [healthOk, shouldRender, loadState, state.status]);

  useEffect(() => {
    if (!prodChecklistComplete) {
      setProdArmedAt(null);
    }
  }, [prodChecklistComplete]);

  useEffect(() => {
    if (!prodArmedAt && state.status !== 'running') return;

    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 250);

    return () => window.clearInterval(timer);
  }, [prodArmedAt, state.status]);

  const startDeployDev = async () => {
    setErrorMessage('');
    try {
      await callAgent('/api/deploy-dev', { method: 'POST' });
      await loadState();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to start Dev deploy.');
    }
  };

  const startPromoteProd = async () => {
    if (!prodExecuteEnabled) {
      setErrorMessage('Complete all Prod confirmations first, then wait for final unlock.');
      return;
    }

    setErrorMessage('');
    setPromoteBusy(true);
    try {
      if (!prodEndpointEnabled) {
        try {
          await callAgent('/api/prod-enable', {
            method: 'POST',
            body: JSON.stringify({ enable: true }),
          });
          await loadHealth();
        } catch (enableError: any) {
          throw new Error(
            enableError?.message?.includes('404')
              ? 'Current agent is outdated. Press Connect again to reload local agent, then retry.'
              : `Failed to enable Prod endpoint: ${enableError?.message || 'Unknown error'}`
          );
        }
      }

      await callAgent('/api/promote-prod', {
        method: 'POST',
        body: JSON.stringify({
          approvalText: PROD_APPROVAL_TEXT,
          cloneConfirmText: PROD_CLONE_CONFIRM_TEXT,
          mode: prodMode,
          cloneStorage: prodCloneStorage,
          cloneDashboardSettings: prodCloneDashboardSettings,
          cloneEdgeFunctions: prodCloneEdgeFunctions,
        }),
      });
      await loadState();
      setProdArmedAt(null);
      setProdAckApproval(false);
      setProdAckClone(false);
      setProdAckDestructive(false);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to start Prod promotion.');
    } finally {
      setPromoteBusy(false);
    }
  };

  const armProdPromotion = useCallback(() => {
    if (!prodChecklistComplete) {
      setErrorMessage('Complete all confirmations before arming Prod promotion.');
      return;
    }
    setErrorMessage('');
    setClockNow(Date.now());
    setProdArmedAt(Date.now());
  }, [prodChecklistComplete]);

  const resetProdPromotion = useCallback(() => {
    setProdArmedAt(null);
    setProdAckApproval(false);
    setProdAckClone(false);
    setProdAckDestructive(false);
  }, []);

  const handleConnect = useCallback(async () => {
    setErrorMessage('');
    setConnectBusy(true);

    try {
      setAuthStatus('Starting local release-agent...');
      await startAgentFromDevServer();

      setAuthStatus('Waiting for release-agent health...');
      const healthy = await waitForAgentHealth(20000);
      if (!healthy) {
        throw new Error('Release agent did not become healthy in time.');
      }

      setAuthStatus('Creating local session...');
      await startSession(false);
      await loadState();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Connect failed.');
      setAuthStatus('Local session not connected.');
    } finally {
      setConnectBusy(false);
    }
  }, [loadState, startAgentFromDevServer, startSession, waitForAgentHealth]);

  if (!shouldRender) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[70]">
      {isOpen ? (
        <div className="flex max-h-[calc(100vh-2rem)] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-600 dark:bg-slate-900/95">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-3 py-2">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Local Release Panel</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{agentBaseUrl}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
            >
              Hide
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto p-3 text-xs">
            <div className="rounded-md border border-slate-200 dark:border-slate-700 p-2">
              <p className={healthOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {healthMessage}
              </p>
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-700 p-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-700 dark:text-slate-200">Auth</p>
                <button
                  type="button"
                  onClick={() => void handleConnect()}
                  disabled={connectBusy}
                  className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {connectBusy ? 'Connecting...' : 'Connect'}
                </button>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{authStatus}</p>
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-700 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {state.jobName || 'No active job'}
                </span>
                <span
                  className={
                    state.status === 'error'
                      ? 'text-rose-600 dark:text-rose-400'
                      : state.status === 'success'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : state.status === 'running'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500 dark:text-slate-400'
                  }
                >
                  {state.status}
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full bg-sky-600 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, state.progress || 0))}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                {state.step} - {Math.round(state.progress || 0)}%
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Elapsed: {formatElapsed(elapsedMs)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={!healthOk || state.status === 'running'}
                onClick={startDeployDev}
                className="rounded-md bg-sky-600 px-2 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Deploy Cloudflare Dev
              </button>
            </div>

            <div className="space-y-2 rounded-md border border-rose-300 dark:border-rose-700 bg-rose-50/80 dark:bg-rose-950/30 p-2">
              <p className="font-semibold text-rose-800 dark:text-rose-300">
                Danger zone: Production promotion options
              </p>
              <div className="rounded border border-rose-200 dark:border-rose-800 p-2 text-rose-900 dark:text-rose-200">
                <p className="mb-1 font-semibold">Execution mode</p>
                <label className="mb-1 flex items-center gap-2">
                  <input
                    type="radio"
                    name="promote-mode"
                    checked={prodMode === 'safe_full'}
                    onChange={() => setProdMode('safe_full')}
                    disabled={state.status === 'running' || promoteBusy}
                  />
                  <span>Safe full update: apply DB migrations + deploy frontend (preserve Prod data)</span>
                </label>
                <label className="mb-1 flex items-center gap-2">
                  <input
                    type="radio"
                    name="promote-mode"
                    checked={prodMode === 'safe_db_only'}
                    onChange={() => setProdMode('safe_db_only')}
                    disabled={state.status === 'running' || promoteBusy}
                  />
                  <span>Safe DB update: apply DB migrations only (preserve Prod data)</span>
                </label>
                <label className="mb-1 flex items-center gap-2">
                  <input
                    type="radio"
                    name="promote-mode"
                    checked={prodMode === 'full'}
                    onChange={() => setProdMode('full')}
                    disabled={state.status === 'running' || promoteBusy}
                  />
                  <span>Full clone (destructive): clone DB + deploy frontend</span>
                </label>
                <label className="mb-1 flex items-center gap-2">
                  <input
                    type="radio"
                    name="promote-mode"
                    checked={prodMode === 'db_only'}
                    onChange={() => setProdMode('db_only')}
                    disabled={state.status === 'running' || promoteBusy}
                  />
                  <span>DB clone only (destructive)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="promote-mode"
                    checked={prodMode === 'app_only'}
                    onChange={() => setProdMode('app_only')}
                    disabled={state.status === 'running' || promoteBusy}
                  />
                  <span>Front + backend services only (no DB clone)</span>
                </label>
              </div>

              <div className="rounded border border-rose-200 dark:border-rose-800 p-2 text-rose-900 dark:text-rose-200">
                <p className="mb-1 font-semibold">Optional backend sync</p>
                <label className="mb-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prodCloneStorage}
                    onChange={(e) => setProdCloneStorage(e.target.checked)}
                    disabled={state.status === 'running' || promoteBusy}
                  />
                  <span>Clone Storage files (buckets + objects)</span>
                </label>
                <label className="mb-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prodCloneDashboardSettings}
                    onChange={(e) => setProdCloneDashboardSettings(e.target.checked)}
                    disabled={state.status === 'running' || promoteBusy}
                  />
                  <span>Sync Supabase dashboard settings (config push)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prodCloneEdgeFunctions}
                    onChange={(e) => setProdCloneEdgeFunctions(e.target.checked)}
                    disabled={state.status === 'running' || promoteBusy}
                  />
                  <span>Deploy Edge Functions to Prod</span>
                </label>
                <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
                  Storage/Settings/Functions options require `SUPABASE_ACCESS_TOKEN`.
                </p>
              </div>

              <p className="rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-2 text-slate-700 dark:text-slate-200">
                Planned action:{' '}
                {prodWillCloneDb
                  ? 'DB clone (destructive)'
                  : prodWillApplyMigrations
                    ? 'DB migrations (preserve data)'
                    : 'No DB schema change'}{' '}
                |{' '}
                {prodWillDeployFrontend ? 'Frontend deploy' : 'No frontend deploy'} |{' '}
                {prodWillRunOptionalBackendSync ? 'Backend extras enabled' : 'No backend extras'}
              </p>
              <p
                className={
                  prodEndpointEnabled
                    ? 'rounded border border-emerald-300 bg-emerald-50 p-2 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'rounded border border-amber-300 bg-amber-50 p-2 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                }
              >
                {prodEndpointEnabled
                  ? 'Prod endpoint is enabled.'
                  : 'Prod endpoint is disabled and will be auto-enabled at execution.'}
              </p>

              <label className="flex items-start gap-2 rounded border border-rose-200 dark:border-rose-800 p-2">
                <input
                  type="checkbox"
                  checked={prodAckApproval}
                  onChange={(e) => setProdAckApproval(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-rose-900 dark:text-rose-200">
                  I confirm business approval for production release.
                </span>
              </label>

              <label className="flex items-start gap-2 rounded border border-rose-200 dark:border-rose-800 p-2">
                <input
                  type="checkbox"
                  checked={prodAckClone}
                  onChange={(e) => setProdAckClone(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-rose-900 dark:text-rose-200">
                  {prodWillCloneDb
                    ? 'I understand DB clone overwrites current Prod DB data.'
                    : prodWillApplyMigrations
                      ? 'I understand this applies SQL migrations on Prod and migrations must be backward-compatible.'
                      : 'I understand selected backend sync operations may overwrite Prod resources.'}
                </span>
              </label>

              {prodHasDestructiveOps ? (
                <label className="flex items-start gap-2 rounded border border-rose-200 dark:border-rose-800 p-2">
                  <input
                    type="checkbox"
                    checked={prodAckDestructive}
                    onChange={(e) => setProdAckDestructive(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-rose-900 dark:text-rose-200">
                    I understand this action is destructive for current Prod data.
                  </span>
                </label>
              ) : (
                <p className="rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-2 text-emerald-800 dark:text-emerald-300">
                  Safe mode selected: existing Prod rows are preserved unless a migration explicitly modifies data.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!healthOk || state.status === 'running' || !prodChecklistComplete || promoteBusy}
                  onClick={armProdPromotion}
                  className="rounded-md bg-rose-700 px-2 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prodArmedAt ? 'Re-Arm Prod' : 'Arm Prod'}
                </button>
                <button
                  type="button"
                  onClick={resetProdPromotion}
                  disabled={state.status === 'running' || promoteBusy}
                  className="rounded-md border border-rose-400 dark:border-rose-700 px-2 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
                </button>
              </div>

              {prodArmedAt && (
                <p className="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-2 text-amber-800 dark:text-amber-300">
                  Final unlock in {Math.ceil(prodCountdownMs / 1000)}s
                </p>
              )}

              <button
                type="button"
                disabled={!healthOk || state.status === 'running' || !prodExecuteEnabled || promoteBusy}
                onClick={startPromoteProd}
                className="w-full rounded-md bg-rose-600 px-2 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {promoteBusy ? 'Starting Prod Promotion...' : 'Execute Prod Promotion Now'}
              </button>
            </div>

            {(errorMessage || state.error) && (
              <div className="rounded-md border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 p-2 text-rose-700 dark:text-rose-300">
                {errorMessage || state.error}
              </div>
            )}

            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 p-2">
              <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">Live logs</p>
              <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-slate-700 dark:text-slate-300">
                {state.logs.length > 0 ? state.logs.slice(-25).join('\n') : 'No logs yet.'}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-lg"
        >
          Release Panel
        </button>
      )}
    </div>
  );
};

export default ReleasePanel;
