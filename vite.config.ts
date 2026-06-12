import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { profilingSavePlugin, viteDevProfilerSourceAliases } from 'vite-dev-profiler/vite'

const profilerRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    'node_modules/vite-dev-profiler',
)

/** Source aliases: edits in linked vite-dev-profiler/src hot-reload without dist rebuild. */
const profilerSourceMode = process.env.VDP_SOURCE !== '0'

export default defineConfig(({ command }) => {
    const dev = command === 'serve'

    return {
        base: './',
        plugins: [
            react(),
            ...(dev ? [profilingSavePlugin()] : []),
        ],
        resolve: dev && profilerSourceMode
            ? { alias: viteDevProfilerSourceAliases(profilerRoot) }
            : undefined,
        server: dev && profilerSourceMode
            ? {
                watch: {
                    ignored: ['!**/vite-dev-profiler/**'],
                },
            }
            : undefined,
        optimizeDeps: dev && profilerSourceMode
            ? { exclude: ['vite-dev-profiler'] }
            : undefined,
    }
})
