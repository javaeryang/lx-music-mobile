// 填写要提供下载的文件路径。相对路径以本脚本所在目录为起点。
// 示例：'/Users/yourname/Downloads/app.ipa' 或 './app.ipa'
//供ios 落雪在线获取音源脚本
const FILE_PATH = '/home/javaer/Downloads/lx2.js'
const PORT = Number(process.env.PORT || 3000)
const HOST = '0.0.0.0'

const http = require('node:http')
const path = require('node:path')
const { open } = require('node:fs/promises')
const { pipeline } = require('node:stream/promises')

// 也可使用 FILE_PATH 环境变量，无需修改脚本。
const configuredPath = process.env.FILE_PATH || FILE_PATH
if (!configuredPath) {
  console.error('请先填写脚本顶部的 FILE_PATH，或设置 FILE_PATH 环境变量。')
  process.exit(1)
}
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error('PORT 必须是 1 到 65535 之间的整数。')
  process.exit(1)
}
const filePath = path.resolve(__dirname, configuredPath)
const fileName = path.basename(filePath)
const encodedName = encodeURIComponent(fileName).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)

const reply = (res, status, message) => {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(message)
}

const server = http.createServer((req, res) => {
  const serve = async() => {
    const pathname = (req.url || '/').split('?')[0]
    if (pathname !== '/' && pathname !== '/download') {
      reply(res, 404, '页面不存在')
      return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD')
      reply(res, 405, '仅支持 GET 和 HEAD 请求')
      return
    }

    // 只读取配置的固定文件，不使用请求参数拼接文件路径。
    const file = await open(filePath, 'r')
    try {
      const stat = await file.stat()
      if (!stat.isFile()) {
        reply(res, 404, '配置的路径不是文件')
        return
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodedName}`,
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      // 流式发送，下载大文件不会一次性占用同等大小的内存。
      await pipeline(file.createReadStream({ autoClose: false }), res)
    } finally {
      await file.close()
    }
  }

  serve().catch(err => {
    if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') return
    console.error('下载失败：', err.message)
    if (res.headersSent || res.destroyed) {
      res.destroy()
      return
    }
    reply(res, err.code === 'ENOENT' ? 404 : 500, err.code === 'ENOENT' ? '文件不存在，请检查 FILE_PATH' : '无法读取文件')
  })
})

server.on('error', err => {
  console.error('服务启动或运行失败：', err.message)
  process.exitCode = 1
})
server.listen(PORT, HOST, () => {
  console.log(`下载文件：${filePath}`)
  console.log(`本机下载：http://localhost:${PORT}/`)
  console.log(`局域网下载：http://<本机IP>:${PORT}/`)
})
