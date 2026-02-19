import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { rm, copyFile, access, constants, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const HOST = process.env.RELEASE_AGENT_HOST || '127.0.0.1';
const PORT = Number(process.env.RELEASE_AGENT_PORT || 8787);
const RELEASE_TOKEN = process.env.RELEASE_AGENT_TOKEN || '';
const ALLOW_BROWSER_SESSION_AUTH = process.env.RELEASE_AGENT_ALLOW_BROWSER_SESSION_AUTH !== '0';
const SESSION_TTL_MS = Number(process.env.RELEASE_AGENT_SESSION_TTL_MS || 8 * 60 * 60 * 1000);
let prodReleasesEnabled = process.env.ENABLE_PROD_RELEASES === '1';
const MAX_LOG_LINES = 400;

const LOCAL_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const sessions = new Map();

let activeProcess = null;
const state = {
  status: 'idle',
  jobName: null,
  progress: 0,
  step: 'idle',
  startedAt: null,
  finishedAt: null,
  logs: [],
  error: null,
};

function getSingleHeader(req, headerName) {
  const raw = req.headers[headerName];
  if (Array.isArray(raw)) return raw[0] || '';
  return typeof raw === 'string' ? raw : '';
}

function resetStateForJob(jobName) {
  state.status = 'running';
  state.jobName = jobName;
  state.progress = 2;
  state.step = 'starting';
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.logs = [];
  state.error = null;
}

function appendLog(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  state.logs.push(line);
  if (state.logs.length > MAX_LOG_LINES) {
    state.logs = state.logs.slice(-MAX_LOG_LINES);
  }
}

function markStep(step, progress) {
  state.step = step;
  if (Number.isFinite(progress)) {
    state.progress = Math.max(0, Math.min(100, Number(progress)));
  }
}

function finishJobSuccess() {
  state.status = 'success';
  state.progress = 100;
  state.step = 'completed';
  state.finishedAt = new Date().toISOString();
  activeProcess = null;
}

function finishJobError(error) {
  state.status = 'error';
  state.error = error?.message || String(error);
  state.finishedAt = new Date().toISOString();
  if (state.progress < 100) {
    state.progress = Math.max(state.progress, 10);
  }
  appendLog(`ERROR: ${state.error}`);
  activeProcess = null;
}

function isLocalRequest(req) {
  const remoteAddress = req.socket?.remoteAddress || '';
  return LOCAL_ADDRESSES.has(remoteAddress);
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function applyCorsHeaders(req, res) {
  const origin = getSingleHeader(req, 'origin');
  if (typeof origin === 'string' && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Release-Token, X-Release-Session, X-Qms-Panel'
  );
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (!session || session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

function createBrowserSession(origin) {
  cleanupExpiredSessions();
  const sessionToken = randomBytes(24).toString('hex');
  sessions.set(sessionToken, {
    origin,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return sessionToken;
}

function hasValidMasterToken(req) {
  if (!RELEASE_TOKEN) return false;
  const provided = getSingleHeader(req, 'x-release-token');
  return provided === RELEASE_TOKEN;
}

function hasValidBrowserSession(req) {
  if (!ALLOW_BROWSER_SESSION_AUTH) return false;
  cleanupExpiredSessions();

  const sessionToken = getSingleHeader(req, 'x-release-session');
  if (!sessionToken) return false;

  const session = sessions.get(sessionToken);
  if (!session) return false;

  const origin = getSingleHeader(req, 'origin');
  if (!origin || !isAllowedOrigin(origin) || session.origin !== origin) {
    return false;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionToken);
    return false;
  }

  // Sliding expiration for active local usage.
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(sessionToken, session);
  return true;
}

function isAuthorized(req) {
  return hasValidMasterToken(req) || hasValidBrowserSession(req);
}

function parseStepMarker(line) {
  const match = /^::STEP::([^:]+)::(\d{1,3})$/.exec(line.trim());
  if (!match) return false;
  markStep(match[1], Number(match[2]));
  appendLog(`STEP ${match[1]} (${match[2]}%)`);
  return true;
}

function streamOutput(label, chunk, trailingRef) {
  const text = `${trailingRef.value}${chunk.toString('utf8')}`;
  const lines = text.split(/\r?\n/);
  trailingRef.value = lines.pop() || '';
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    if (!parseStepMarker(line)) {
      appendLog(`${label}: ${line}`);
      if (state.progress < 95) state.progress += 1;
    }
  }
}

async function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    appendLog(`$ ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      cwd: options.cwd || PROJECT_ROOT,
      env: { ...process.env, ...(options.env || {}) },
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    activeProcess = child;
    const stdoutTrailing = { value: '' };
    const stderrTrailing = { value: '' };

    child.stdout.on('data', (chunk) => streamOutput('stdout', chunk, stdoutTrailing));
    child.stderr.on('data', (chunk) => streamOutput('stderr', chunk, stderrTrailing));
    child.on('error', reject);
    child.on('close', (code) => {
      if (stdoutTrailing.value.trim()) {
        const line = stdoutTrailing.value.trim();
        if (!parseStepMarker(line)) appendLog(`stdout: ${line}`);
      }
      if (stderrTrailing.value.trim()) {
        const line = stderrTrailing.value.trim();
        if (!parseStepMarker(line)) appendLog(`stderr: ${line}`);
      }

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

async function runPowerShellScript(
  scriptPath,
  scriptArgs = [],
  scriptEnv = {},
  scriptCwd = PROJECT_ROOT
) {
  const isWindows = process.platform === 'win32';
  const exe = isWindows ? 'powershell.exe' : 'pwsh';
  const resolvedScriptPath = path.isAbsolute(scriptPath) ? scriptPath : path.join(scriptCwd, scriptPath);
  const args = isWindows
    ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolvedScriptPath, ...scriptArgs]
    : ['-NoProfile', '-File', resolvedScriptPath, ...scriptArgs];
  await runProcess(exe, args, { env: scriptEnv, cwd: scriptCwd });
}

async function createMainReleaseWorktree() {
  const worktreePath = path.join(
    os.tmpdir(),
    `qms-prod-release-${Date.now()}-${randomBytes(4).toString('hex')}`
  );
  await runProcess('git', ['worktree', 'add', '--force', worktreePath, 'main']);
  return worktreePath;
}

async function copyOptionalFileToWorktree(fileName, worktreePath) {
  const sourcePath = path.join(PROJECT_ROOT, fileName);
  const targetPath = path.join(worktreePath, fileName);

  try {
    await access(sourcePath, constants.F_OK);
    await copyFile(sourcePath, targetPath);
    appendLog(`Prepared worktree file: ${fileName}`);
  } catch {
    appendLog(`WARN: ${fileName} not found in project root. Related steps may fail.`);
  }
}

function parseDotEnvContent(content) {
  const values = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

async function loadEnvVarsFromFile(filePath, keys) {
  try {
    const content = await readFile(filePath, 'utf8');
    const parsed = parseDotEnvContent(content);
    const values = {};

    for (const key of keys) {
      const value = parsed[key];
      if (value && value.trim()) {
        values[key] = value.trim();
      }
    }

    return values;
  } catch {
    return {};
  }
}

async function removeMainReleaseWorktree(worktreePath) {
  try {
    await runProcess('git', ['worktree', 'remove', '--force', worktreePath]);
  } catch (error) {
    appendLog(`WARN: Failed to remove worktree via git: ${error?.message || String(error)}`);
  }
  try {
    await rm(worktreePath, { recursive: true, force: true });
  } catch (error) {
    appendLog(`WARN: Failed to clean worktree folder: ${error?.message || String(error)}`);
  }
}

function beginJob(jobName, runFn) {
  if (state.status === 'running') {
    return false;
  }

  resetStateForJob(jobName);

  Promise.resolve()
    .then(() => runFn())
    .then(() => finishJobSuccess())
    .catch((error) => finishJobError(error));

  return true;
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 16 * 1024) {
      throw new Error('Payload too large');
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function modeRequiresCloneConfirm(mode) {
  return mode === 'full' || mode === 'db_only';
}

function validateApprovals(body, mode) {
  if (body?.approvalText !== 'APPROVED FOR PROD') {
    throw new Error("approvalText must be exactly 'APPROVED FOR PROD'.");
  }
  const requiresCloneConfirm = modeRequiresCloneConfirm(mode) || body?.cloneStorage === true;
  if (requiresCloneConfirm && body?.cloneConfirmText !== 'CONFIRM DEV TO PROD CLONE') {
    throw new Error("cloneConfirmText must be exactly 'CONFIRM DEV TO PROD CLONE'.");
  }
}

const ALLOWED_PROMOTE_MODES = new Set(['safe_full', 'safe_db_only', 'full', 'db_only', 'app_only']);

function normalizePromoteOptions(body) {
  const rawMode = typeof body?.mode === 'string' ? body.mode.trim().toLowerCase() : '';
  const mode = ALLOWED_PROMOTE_MODES.has(rawMode) ? rawMode : 'safe_full';

  return {
    mode,
    cloneStorage: body?.cloneStorage === true,
    cloneDashboardSettings: body?.cloneDashboardSettings === true,
    cloneEdgeFunctions: body?.cloneEdgeFunctions === true,
  };
}

const server = http.createServer(async (req, res) => {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!isLocalRequest(req)) {
    sendJson(res, 403, { ok: false, error: 'Only localhost access is allowed.' });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      host: HOST,
      port: PORT,
      prodReleasesEnabled,
      browserSessionAuthEnabled: ALLOW_BROWSER_SESSION_AUTH,
      masterTokenConfigured: Boolean(RELEASE_TOKEN),
      running: state.status === 'running',
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/session') {
    if (!ALLOW_BROWSER_SESSION_AUTH) {
      sendJson(res, 403, { ok: false, error: 'Browser session auth is disabled on this agent.' });
      return;
    }

    const origin = getSingleHeader(req, 'origin');
    const requestedBy = getSingleHeader(req, 'x-qms-panel');
    if (!origin || !isAllowedOrigin(origin) || requestedBy !== 'qms-release-panel') {
      sendJson(res, 403, { ok: false, error: 'Session request not allowed from this origin.' });
      return;
    }

    const sessionToken = createBrowserSession(origin);
    sendJson(res, 200, {
      ok: true,
      sessionToken,
      expiresInMs: SESSION_TTL_MS,
    });
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: 'Unauthorized. Missing valid local session.' });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/state') {
    sendJson(res, 200, { ok: true, state });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/prod-enable') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error?.message || 'Invalid request body.' });
      return;
    }

    const enable = body?.enable !== false;
    prodReleasesEnabled = enable;
    appendLog(`Prod endpoint ${enable ? 'enabled' : 'disabled'} via local panel.`);

    sendJson(res, 200, {
      ok: true,
      prodReleasesEnabled,
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/deploy-dev') {
    const started = beginJob('deploy-dev', async () => {
      markStep('deploy_dev_start', 5);
      await runPowerShellScript('scripts/deploy-pages.ps1', ['-Target', 'dev']);
    });
    if (!started) {
      sendJson(res, 409, { ok: false, error: 'A release job is already running.' });
      return;
    }
    sendJson(res, 202, { ok: true, message: 'Deploy Dev job started.' });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/promote-prod') {
    if (!prodReleasesEnabled) {
      sendJson(res, 403, {
        ok: false,
        error:
          "Production releases are disabled. Enable from Release Panel (auto) or set ENABLE_PROD_RELEASES=1.",
      });
      return;
    }

    let body;
    let promoteOptions;
    try {
      body = await readJsonBody(req);
      promoteOptions = normalizePromoteOptions(body);
      validateApprovals(body, promoteOptions.mode);
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error?.message || 'Invalid request body.' });
      return;
    }

    const started = beginJob('promote-prod', async () => {
      appendLog(
        `[promote] options => mode=${promoteOptions.mode}, storage=${promoteOptions.cloneStorage}, dashboardSettings=${promoteOptions.cloneDashboardSettings}, edgeFunctions=${promoteOptions.cloneEdgeFunctions}`
      );

      markStep('promote_prod_start', 5);
      markStep('prepare_main_worktree', 10);
      const worktreePath = await createMainReleaseWorktree();
      appendLog(`Using temporary main worktree: ${worktreePath}`);
      try {
        const requiredProdViteVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
        const prodEnvFilePath = path.join(PROJECT_ROOT, '.env.production.local');
        const loadedProdViteVars = await loadEnvVarsFromFile(prodEnvFilePath, requiredProdViteVars);
        const promoteViteEnv = {};

        for (const key of requiredProdViteVars) {
          const value = process.env[key] || loadedProdViteVars[key];
          if (value) promoteViteEnv[key] = value;
        }

        const missingProdViteVars = requiredProdViteVars.filter((key) => !promoteViteEnv[key]);
        if (missingProdViteVars.length > 0) {
          appendLog(
            `WARN: Missing production VITE vars (${missingProdViteVars.join(', ')}). deploy-prod may fail.`
          );
        } else {
          appendLog('Production VITE vars prepared for worktree deploy.');
        }

        const promoteScriptArgs = [
          '-ApprovalText',
          body.approvalText,
          '-CloneConfirmText',
          body.cloneConfirmText || '',
          '-Mode',
          promoteOptions.mode,
        ];
        if (promoteOptions.cloneStorage) promoteScriptArgs.push('-CloneStorage');
        if (promoteOptions.cloneDashboardSettings)
          promoteScriptArgs.push('-CloneDashboardSettings');
        if (promoteOptions.cloneEdgeFunctions) promoteScriptArgs.push('-CloneEdgeFunctions');

        await copyOptionalFileToWorktree('.env.production.local', worktreePath);
        await runPowerShellScript(
          path.join(PROJECT_ROOT, 'scripts', 'promote-prod-with-clone.ps1'),
          promoteScriptArgs,
          {
            ENABLE_PROD_RELEASES: '1',
            ALLOW_PROD_DB_OVERWRITE: 'YES_I_UNDERSTAND',
            ...promoteViteEnv,
          },
          worktreePath
        );
      } finally {
        markStep('cleanup_main_worktree', 95);
        await removeMainReleaseWorktree(worktreePath);
      }
    });

    if (!started) {
      sendJson(res, 409, { ok: false, error: 'A release job is already running.' });
      return;
    }

    sendJson(res, 202, { ok: true, message: 'Promote Prod job started.' });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not found.' });
});

server.listen(PORT, HOST, () => {
  console.log(`[release-agent] listening on http://${HOST}:${PORT}`);
  console.log(
    `[release-agent] browser session auth: ${ALLOW_BROWSER_SESSION_AUTH ? 'ENABLED' : 'DISABLED'}`
  );
  console.log(
    `[release-agent] master token mode: ${RELEASE_TOKEN ? 'CONFIGURED' : 'NOT CONFIGURED'}`
  );
  if (!RELEASE_TOKEN) {
  console.log('[release-agent] token entry in UI is not required.');
  }
  console.log(
    `[release-agent] production endpoint is ${prodReleasesEnabled ? 'ENABLED' : 'DISABLED'} (ENABLE_PROD_RELEASES=1).`
  );
});

process.on('SIGINT', () => {
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill();
  }
  server.close(() => process.exit(0));
});
