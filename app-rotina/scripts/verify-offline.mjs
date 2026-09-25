const pageUrl = process.env.RITMO_TEST_URL ?? 'http://127.0.0.1:4173/app-rotina/'
const cdpUrl = process.env.RITMO_CDP_URL ?? 'http://127.0.0.1:9224/json'
const targets = await (await fetch(cdpUrl)).json()
const target = targets.find((item) => item.type === 'page' && item.url === pageUrl)
if (!target) throw new Error(`A página ${pageUrl} não está aberta no navegador de teste.`)

const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let nextId = 0
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  const task = pending.get(message.id)
  if (!task) return
  pending.delete(message.id)
  if (message.error) task.reject(new Error(message.error.message))
  else task.resolve(message.result)
})

function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function until(expression, description) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(expression)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Tempo esgotado aguardando ${description}. ${await evaluate('document.body.innerText.slice(0, 600)')}`)
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await until('!!document.querySelector(".bottom-nav")', 'a interface inicial')
  const scope = await evaluate('Promise.race([navigator.serviceWorker.ready.then((registration) => registration.scope), new Promise((_, reject) => setTimeout(() => reject(new Error("Serviço offline indisponível")), 10000))])')
  if (scope !== pageUrl) throw new Error(`Escopo offline incorreto: ${scope}`)

  await send('Page.reload')
  await until('!!document.querySelector(".bottom-nav")', 'a interface controlada pelo serviço offline')
  await until('!!navigator.serviceWorker.controller', 'o controle offline')
  const activity = await evaluate('(() => { const button = document.querySelector(".check-button[aria-pressed=false]:not([disabled])"); if (!button) throw new Error("Atividade disponível não encontrada"); button.click(); return button.getAttribute("aria-label") })()')
  await until('document.querySelector(".check-button[aria-pressed=true]") !== null', 'o registro da atividade')

  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  await send('Page.reload')
  await until('!!document.querySelector(".bottom-nav")', 'a abertura sem internet')
  await until('document.querySelector(".check-button[aria-pressed=true]") !== null', 'o registro salvo sem internet')
  const completedBefore = await evaluate('document.querySelectorAll(".check-button[aria-pressed=true]").length')
  const offlineActivity = await evaluate('(() => { const button = document.querySelector(".check-button[aria-pressed=false]:not([disabled])"); if (!button) throw new Error("Segunda atividade disponível não encontrada"); button.click(); return button.getAttribute("aria-label") })()')
  await until(`document.querySelectorAll(".check-button[aria-pressed=true]").length > ${completedBefore}`, 'o registro feito sem internet')
  await send('Page.reload')
  await until(`document.querySelectorAll(".check-button[aria-pressed=true]").length > ${completedBefore}`, 'a persistência do registro feito sem internet')
  console.log(JSON.stringify({ offline: true, pageUrl, scope, activity, offlineActivity, persisted: true }))
} finally {
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  socket.close()
}
