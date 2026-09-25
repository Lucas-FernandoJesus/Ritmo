const shutdownUrl = 'http://127.0.0.1:4173/__playwright_shutdown__'

export default async function globalTeardown() {
  const response = await fetch(shutdownUrl, { method: 'POST' })
  if (!response.ok) throw new Error(`Não foi possível encerrar o preview de teste: HTTP ${response.status}`)
}
