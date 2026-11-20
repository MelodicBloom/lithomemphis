import { cpSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function copyExperiments(): Plugin {
  let destination = ''
  return {
    name: 'copy-experiments',
    apply: 'build',
    configResolved(config) {
      destination = resolve(config.root, config.build.outDir, 'experiments')
    },
    closeBundle() {
      const source = fileURLToPath(new URL('./experiments', import.meta.url))
      if (!existsSync(source)) throw new Error(`experiments source missing: ${source}`)
      rmSync(destination, { recursive: true, force: true })
      cpSync(source, destination, { recursive: true })
    },
  }
}

export default defineConfig({ plugins: [react(), tailwindcss(), copyExperiments()] })
