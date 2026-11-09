import { cpSync, createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Study C is a standalone page. Vite's public-dir walker rejects symlinks, and
// vercel.json rewrites every non-storybook path to the specimen shell, so the
// study is served from its own folder and copied into dist at build time.
function foldedAtriumStatic(): Plugin {
  const root = fileURLToPath(new URL('./experiments/glsl3/folded-atrium/site', import.meta.url))
  const prefix = '/experiments/glsl3/folded-atrium'
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.glsl': 'text/plain; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.webm': 'video/webm',
    '.gif': 'image/gif',
  }
  return {
    name: 'folded-atrium-static',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url?.split('?')[0] ?? ''
        if (!raw.startsWith(prefix)) return next()
        let rel = decodeURIComponent(raw.slice(prefix.length))
        if (rel === '' || rel === '/') rel = '/index.html'
        if (rel.includes('\0') || rel.split('/').includes('..')) return next()
        const file = path.normalize(path.join(root, rel))
        if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream')
        createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      cpSync(root, path.resolve('dist/experiments/glsl3/folded-atrium'), { recursive: true })
    },
  }
}

export default defineConfig({ plugins: [react(), tailwindcss(), foldedAtriumStatic()] })
