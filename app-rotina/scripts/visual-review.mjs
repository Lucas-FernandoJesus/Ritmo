import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const targets = await (await fetch('http://127.0.0.1:9223/json')).json()
const target = targets.find((item) => item.type === 'page' && item.url === 'http://127.0.0.1:5173/')
if (!target) throw new Error('A página local do Ritmo não está aberta no Edge.')

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true })
await send('Page.reload', { ignoreCache: true })
let ready = false
for (let attempt = 0; attempt < 80; attempt++) {
  if (await evaluate("!!document.querySelector('.bottom-nav button')")) { ready = true; break }
  await sleep(100)
}
if (!ready) throw new Error(`A interface não carregou: ${await evaluate('document.body.innerText.slice(0, 500)')}`)

const outputDir = join(tmpdir(), 'ritmo-visual-review')
await mkdir(outputDir, { recursive: true })
const tabs = ['hoje', 'semana', 'registros', 'progresso', 'ajustes']
for (const [index, tab] of tabs.entries()) {
  await evaluate(`document.querySelectorAll('.bottom-nav button')[${index}].click()`)
  await sleep(150)
  const metrics = await evaluate('({ width: innerWidth, contentWidth: document.documentElement.scrollWidth, navLastRight: document.querySelectorAll(".bottom-nav button")[4].getBoundingClientRect().right })')
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const path = join(outputDir, `${tab}-375.png`)
  await writeFile(path, Buffer.from(shot.data, 'base64'))
  console.log(JSON.stringify({ tab, path, ...metrics }))
}

await evaluate("document.querySelectorAll('.bottom-nav button')[1].click()")
await evaluate("document.querySelectorAll('.week-selector button')[1].click()")
await evaluate("(() => { const button = [...document.querySelectorAll('.week-item')].find((item) => item.textContent.includes('Fortalecimento leve de membros inferiores')); button.focus(); button.click(); })()")
await sleep(150)
const guideMetrics = await evaluate('({ open: document.querySelector(".activity-dialog").open, steps: document.querySelectorAll(".activity-dialog .guide-steps li").length, width: innerWidth, contentWidth: document.documentElement.scrollWidth, title: document.querySelector("#activity-dialog-title")?.textContent, focusInDialog: document.querySelector(".activity-dialog").contains(document.activeElement) })')
const guideShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
const guidePath = join(outputDir, 'fortalecimento-375.png')
await writeFile(guidePath, Buffer.from(guideShot.data, 'base64'))
console.log(JSON.stringify({ tab: 'fortalecimento', path: guidePath, ...guideMetrics }))
await evaluate('document.querySelector(".activity-dialog-main").scrollTop = document.querySelector(".activity-dialog-main").scrollHeight')
await sleep(80)
const guideEndShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
const guideEndPath = join(outputDir, 'fortalecimento-fim-375.png')
await writeFile(guideEndPath, Buffer.from(guideEndShot.data, 'base64'))
console.log(JSON.stringify({ tab: 'fortalecimento-fim', path: guideEndPath }))
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
await sleep(100)
console.log(JSON.stringify({ guideClosedByEscape: await evaluate('!document.querySelector(".activity-dialog").open'), focusRestoredToActivity: await evaluate('document.activeElement?.classList.contains("week-item")') }))

await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 720, deviceScaleFactor: 1, mobile: true })
await evaluate("document.querySelectorAll('.bottom-nav button')[0].click()")
await sleep(150)
const smallMetrics = await evaluate('({ width: innerWidth, contentWidth: document.documentElement.scrollWidth, navLastRight: document.querySelectorAll(".bottom-nav button")[4].getBoundingClientRect().right })')
const smallShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
const smallPath = join(outputDir, 'hoje-320.png')
await writeFile(smallPath, Buffer.from(smallShot.data, 'base64'))
console.log(JSON.stringify({ tab: 'hoje-320', path: smallPath, ...smallMetrics }))

await evaluate("document.querySelectorAll('.bottom-nav button')[1].click()")
await evaluate("document.querySelectorAll('.week-selector button')[1].click()")
await evaluate("[...document.querySelectorAll('.week-item')].find((button) => button.textContent.includes('Fortalecimento leve de membros inferiores')).click()")
await sleep(100)
const smallGuideMetrics = await evaluate('({ width: innerWidth, contentWidth: document.documentElement.scrollWidth, dialogRight: document.querySelector(".activity-dialog").getBoundingClientRect().right, footerBottom: document.querySelector(".activity-dialog-footer").getBoundingClientRect().bottom })')
const smallGuideShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
const smallGuidePath = join(outputDir, 'fortalecimento-320.png')
await writeFile(smallGuidePath, Buffer.from(smallGuideShot.data, 'base64'))
console.log(JSON.stringify({ tab: 'fortalecimento-320', path: smallGuidePath, ...smallGuideMetrics }))
await evaluate('document.querySelector(".activity-dialog").close()')

await send('Emulation.setDeviceMetricsOverride', { width: 812, height: 375, deviceScaleFactor: 1, mobile: true })
await evaluate("[...document.querySelectorAll('.week-item')].find((button) => button.textContent.includes('Fortalecimento leve de membros inferiores')).click()")
await sleep(100)
const landscapeMetrics = await evaluate('({ width: innerWidth, height: innerHeight, contentWidth: document.documentElement.scrollWidth, dialogTop: document.querySelector(".activity-dialog").getBoundingClientRect().top, footerBottom: document.querySelector(".activity-dialog-footer").getBoundingClientRect().bottom })')
const landscapeShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
const landscapePath = join(outputDir, 'fortalecimento-paisagem.png')
await writeFile(landscapePath, Buffer.from(landscapeShot.data, 'base64'))
console.log(JSON.stringify({ tab: 'fortalecimento-paisagem', path: landscapePath, ...landscapeMetrics }))
await evaluate('document.querySelector(".activity-dialog").close()')

await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true })
await evaluate("document.querySelectorAll('.bottom-nav button')[0].click()")
await evaluate("document.documentElement.dataset.theme = 'light'")
await sleep(150)
const lightShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
const lightPath = join(outputDir, 'hoje-claro-375.png')
await writeFile(lightPath, Buffer.from(lightShot.data, 'base64'))
console.log(JSON.stringify({ tab: 'hoje-claro', path: lightPath }))
await evaluate("document.querySelector('.task-open').click()")
await sleep(100)
const lightGuideShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
const lightGuidePath = join(outputDir, 'orientacoes-claro-375.png')
await writeFile(lightGuidePath, Buffer.from(lightGuideShot.data, 'base64'))
console.log(JSON.stringify({ tab: 'orientacoes-claro', path: lightGuidePath }))
socket.close()
