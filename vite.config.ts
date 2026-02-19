import { spawn } from 'node:child_process'
import net from 'node:net'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const RELEASE_AGENT_HOST = '127.0.0.1'
const RELEASE_AGENT_PORT = 8787
const START_ENDPOINT = '/__qms/release-agent/start'

function isLocalAddress(address?: string | null): boolean {
  if (!address) return false
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function isReleaseAgentReachable(timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const done = (value: boolean) => {
      socket.destroy()
      resolve(value)
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(RELEASE_AGENT_PORT, RELEASE_AGENT_HOST)
  })
}

function releaseAgentLauncherPlugin(): Plugin {
  let agentProcess: ReturnType<typeof spawn> | null = null
  let startInFlight: Promise<void> | null = null

  const stopAnyReleaseAgent = async () => {
    if (process.platform === 'win32') {
      await new Promise<void>((resolve) => {
        const killer = spawn(
          'powershell.exe',
          [
            '-NoProfile',
            '-Command',
            "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'release-agent\\\\.mjs' } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }",
          ],
          {
            cwd: process.cwd(),
            shell: false,
            stdio: 'ignore',
            windowsHide: true,
          }
        )
        killer.on('close', () => resolve())
        killer.on('error', () => resolve())
      })
      return
    }

    await new Promise<void>((resolve) => {
      const killer = spawn('pkill', ['-f', 'release-agent.mjs'], {
        cwd: process.cwd(),
        shell: false,
        stdio: 'ignore',
      })
      killer.on('close', () => resolve())
      killer.on('error', () => resolve())
    })
  }

  const ensureAgentStarted = async (forceRestart = false) => {
    if (forceRestart) {
      await stopAnyReleaseAgent()
      agentProcess = null
      await sleep(250)
    } else if (await isReleaseAgentReachable()) {
      return
    }

    if (startInFlight) {
      await startInFlight
      return
    }

    startInFlight = new Promise<void>((resolve, reject) => {
      const isWindows = process.platform === 'win32'
      const launchCommand = isWindows ? 'cmd.exe' : 'npm'
      const launchArgs = isWindows
        ? ['/d', '/s', '/c', 'npm run release:agent']
        : ['run', 'release:agent']

      const launchedProcess = spawn(launchCommand, launchArgs, {
        cwd: process.cwd(),
        shell: false,
        stdio: 'ignore',
        windowsHide: true,
      })
      agentProcess = launchedProcess

      let finished = false
      const finish = (error?: Error) => {
        if (finished) return
        finished = true
        startInFlight = null
        if (error) reject(error)
        else resolve()
      }

      const onExit = (code: number | null) => {
        agentProcess = null
        finish(new Error(`release-agent exited early (code ${code ?? 'unknown'})`))
      }

      launchedProcess.once('exit', onExit)

      ;(async () => {
        const maxAttempts = 30
        for (let i = 0; i < maxAttempts; i += 1) {
          if (await isReleaseAgentReachable()) {
            if (launchedProcess === agentProcess) {
              launchedProcess.off('exit', onExit)
            }
            finish()
            return
          }
          await sleep(400)
        }
        finish(new Error('Timed out waiting for release-agent to start.'))
      })().catch((error) => finish(error))
    })

    await startInFlight
  }

  return {
    name: 'qms-release-agent-launcher',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = req.url || ''
        if (!requestUrl.startsWith(START_ENDPOINT)) {
          next()
          return
        }

        const parsedUrl = new URL(requestUrl, 'http://localhost')
        const forceRestart = parsedUrl.searchParams.get('restart') === '1'

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed.' }))
          return
        }

        if (!isLocalAddress(req.socket.remoteAddress)) {
          res.statusCode = 403
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, error: 'Localhost only.' }))
          return
        }

        try {
          await ensureAgentStarted(forceRestart)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              ok: true,
              started: true,
              restarted: forceRestart,
              endpoint: `http://${RELEASE_AGENT_HOST}:${RELEASE_AGENT_PORT}`,
            })
          )
        } catch (error: any) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              ok: false,
              error: error?.message || 'Unable to start release-agent.',
            })
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), releaseAgentLauncherPlugin()],
  build: {
    sourcemap: false,
  },
  server: {
    proxy: {
      '/rest/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/auth/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/storage/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/realtime/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          // Suppress errors when backend is not available
          proxy.on('error', (err, _req, _res) => {
            console.warn('[Proxy] Realtime connection failed:', err.message);
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err) => {
              console.warn('[Proxy] WebSocket error:', err.message);
            });
          });
        },
      },
    },
  },
})
