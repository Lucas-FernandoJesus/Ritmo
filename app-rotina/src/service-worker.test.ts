import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')

function createWorker(options: { assetFailure?: boolean; responseOk?: boolean; basePath?: string; offline?: boolean } = {}) {
  const baseUrl = `https://ritmo.local${options.basePath ?? '/'}`
  const handlers = new Map<string, (event: unknown) => void>()
  const cache = {
    addAll: vi.fn(async () => { if (options.assetFailure) throw new Error('asset indisponível') }),
    put: vi.fn(async () => {}),
    match: vi.fn(async () => undefined),
  }
  const storage = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ['ritmo-v1', `ritmo-${encodeURIComponent(options.basePath ?? '/')}-v1`, 'outro-app-v1']),
    delete: vi.fn(async () => true),
    match: vi.fn(async () => response),
  }
  const response = {
    ok: options.responseOk ?? true,
    clone() { return this },
    text: async () => `<script src="${options.basePath ?? '/'}assets/app.js"></script><link href="${options.basePath ?? '/'}assets/app.css" rel="stylesheet">`,
  }
  const cssResponse = { ok: true, text: async () => '.page{background:url(./lacquered-desk-header.webp)}body{background:url(./ebony-walnut-texture.webp)}' }
  const fetchMock = vi.fn(async (url: string | { url: string }) => {
    if (options.offline) throw new Error('sem conexão')
    return typeof url === 'string' && url.endsWith('.css') ? cssResponse : response
  })
  const worker = {
    location: { origin: 'https://ritmo.local', href: `${baseUrl}sw.js` },
    addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  }
  runInNewContext(source, { self: worker, caches: storage, fetch: fetchMock, URL, Promise })
  return { handlers, cache, storage, response, fetchMock, worker, baseUrl }
}

describe('shell offline', () => {
  it('só ativa após guardar JavaScript, CSS e arquivos essenciais', async () => {
    const { handlers, cache, worker } = createWorker()
    let pending: Promise<unknown> | undefined
    handlers.get('install')?.({ waitUntil: (promise: Promise<unknown>) => { pending = promise } })
    await pending
    expect(cache.addAll).toHaveBeenCalledWith(expect.arrayContaining(['https://ritmo.local/assets/app.js', 'https://ritmo.local/assets/app.css', 'https://ritmo.local/assets/lacquered-desk-header.webp', 'https://ritmo.local/assets/ebony-walnut-texture.webp', 'https://ritmo.local/manifest.webmanifest', 'https://ritmo.local/icon-ebony-192.png']))
    expect(cache.put).toHaveBeenCalledWith('https://ritmo.local/', expect.anything())
    expect(worker.skipWaiting).toHaveBeenCalledOnce()
  })

  it('prepara os recursos dentro da pasta do GitHub Pages', async () => {
    const { handlers, cache, worker } = createWorker({ basePath: '/app-rotina/' })
    let pending: Promise<unknown> | undefined
    handlers.get('install')?.({ waitUntil: (promise: Promise<unknown>) => { pending = promise } })
    await pending
    expect(cache.addAll).toHaveBeenCalledWith(expect.arrayContaining([
      'https://ritmo.local/app-rotina/assets/app.js',
      'https://ritmo.local/app-rotina/assets/app.css',
      'https://ritmo.local/app-rotina/assets/lacquered-desk-header.webp',
      'https://ritmo.local/app-rotina/manifest.webmanifest',
    ]))
    expect(cache.put).toHaveBeenCalledWith('https://ritmo.local/app-rotina/', expect.anything())
    expect(worker.skipWaiting).toHaveBeenCalledOnce()
  })

  it('não ativa uma versão com arquivos faltando', async () => {
    const { handlers, cache, worker } = createWorker({ assetFailure: true })
    let pending: Promise<unknown> | undefined
    handlers.get('install')?.({ waitUntil: (promise: Promise<unknown>) => { pending = promise } })
    await expect(pending).rejects.toThrow('asset indisponível')
    expect(cache.put).not.toHaveBeenCalled()
    expect(worker.skipWaiting).not.toHaveBeenCalled()
  })

  it('não substitui a página offline por uma resposta de erro', async () => {
    const { handlers, cache, response } = createWorker({ responseOk: false })
    let pending: Promise<unknown> | undefined
    handlers.get('fetch')?.({
      request: { method: 'GET', mode: 'navigate', url: 'https://ritmo.local/' },
      respondWith: (promise: Promise<unknown>) => { pending = promise },
    })
    expect(await pending).toBe(response)
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('abre a página guardada quando o telefone está sem conexão', async () => {
    const { handlers, storage, response } = createWorker({ basePath: '/app-rotina/', offline: true })
    let pending: Promise<unknown> | undefined
    handlers.get('fetch')?.({
      request: { method: 'GET', mode: 'navigate', url: 'https://ritmo.local/app-rotina/' },
      respondWith: (promise: Promise<unknown>) => { pending = promise },
    })
    expect(await pending).toBe(response)
    expect(storage.match).toHaveBeenCalledWith('https://ritmo.local/app-rotina/')
  })

  it('não intercepta páginas fora da pasta do aplicativo', () => {
    const { handlers } = createWorker({ basePath: '/app-rotina/' })
    const respondWith = vi.fn()
    handlers.get('fetch')?.({
      request: { method: 'GET', mode: 'navigate', url: 'https://ritmo.local/outro-app/' },
      respondWith,
    })
    expect(respondWith).not.toHaveBeenCalled()
  })

  it('remove apenas caches antigos do Ritmo', async () => {
    const { handlers, storage } = createWorker()
    let pending: Promise<unknown> | undefined
    handlers.get('activate')?.({ waitUntil: (promise: Promise<unknown>) => { pending = promise } })
    await pending
    expect(storage.delete).toHaveBeenCalledWith('ritmo-v1')
    expect(storage.delete).not.toHaveBeenCalledWith('outro-app-v1')
  })
})
