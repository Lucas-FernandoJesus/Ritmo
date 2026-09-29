import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Reutiliza testes, servidor, navegacao e capturas mantidos pela aplicacao.
const applicationDirectory = fileURLToPath(new URL('../', import.meta.url))
const windows = process.platform === 'win32'
// npm.cmd exige cmd no Windows. O comando abaixo é fixo, sem entrada do usuário.
const command = windows ? process.env.ComSpec ?? 'cmd.exe' : 'npm'
const args = windows
  ? ['/d', '/s', '/c', 'npm run test:e2e -- --config=playwright.edge.config.ts --workers=2']
  : ['run', 'test:e2e', '--', '--config=playwright.edge.config.ts', '--workers=2']
const result = spawnSync(command, args, {
  cwd: applicationDirectory,
  stdio: 'inherit',
  shell: false,
})

if (result.error) console.error(result.error.message)
process.exitCode = result.status ?? 1
