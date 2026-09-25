import { preview } from 'vite'

const shutdownPath = '/__playwright_shutdown__'
let server
let closing = false

const shutdownPlugin = {
  name: 'ritmo-playwright-shutdown',
  configurePreviewServer(previewServer) {
    previewServer.middlewares.use(shutdownPath, (request, response, next) => {
      if (request.method !== 'POST') {
        next()
        return
      }

      response.statusCode = 204
      response.setHeader('Connection', 'close')
      response.end()

      if (closing) return
      closing = true
      setImmediate(async () => {
        await server.close()
        process.exit(0)
      })
    })
  },
}

server = await preview({
  plugins: [shutdownPlugin],
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
})

server.printUrls()
