// Watermark: Aarav Joshi
import { defineConfig } from 'vite'
import type { ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { IncomingMessage, ServerResponse } from 'node:http'

type Next = (error?: unknown) => void

const execFileAsync = promisify(execFile)

function getPythonExecutable() {
  const candidates = [
    process.env.PYTHON_PATH,
    path.resolve(__dirname, '../../.venv/Scripts/python.exe'),
    'python',
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    if (candidate === 'python' || existsSync(candidate)) {
      return candidate
    }
  }

  return 'python'
}

function runTestApiPlugin() {
  return {
    name: 'run-test-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Next) => {
        if (req.method !== 'POST' || req.url !== '/api/run-test') {
          next()
          return
        }

        const projectRoot = path.resolve(__dirname, '..')
        const scriptPath = path.resolve(projectRoot, 'tests/fix_async_load_test.py')
        const outputFile = path.resolve(__dirname, 'public/loadtest-results.json')
        const pythonExecutable = getPythonExecutable()

        try {
          await execFileAsync(
            pythonExecutable,
            [
              scriptPath,
              '--users',
              '1000',
              '--concurrency-limit',
              '250',
              '--output-file',
              outputFile,
            ],
            {
              cwd: projectRoot,
              timeout: 180000,
            },
          )

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to run test'
          const stderr =
            typeof error === 'object' && error !== null && 'stderr' in error
              ? String((error as { stderr?: unknown }).stderr ?? '')
              : ''

          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              ok: false,
              message,
              stderr,
            }),
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), runTestApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
