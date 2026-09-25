import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const [owner, repository] = (process.env.GITHUB_REPOSITORY ?? '').split('/')
const githubPagesBase = repository && repository.toLowerCase() !== `${owner?.toLowerCase()}.github.io`
  ? `/${repository}/`
  : '/'

export default defineConfig({
  base: process.env.RITMO_BASE_PATH || githubPagesBase,
  plugins: [react()],
})
