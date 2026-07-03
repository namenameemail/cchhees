import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { profilingSavePlugin, viteDevProfilerSourceAliases } from 'vite-dev-profiler/vite'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(projectRoot, 'src')

const profilerRoot = path.resolve(
    projectRoot,
    'node_modules/vite-dev-profiler',
)

/** Source aliases: edits in linked vite-dev-profiler/src hot-reload without dist rebuild. */
const profilerSourceMode = process.env.VDP_SOURCE !== '0'

export default defineConfig(({ command, mode }) => {
    const dev = command === 'serve' && mode !== 'production'

    return {
        base: './',
        plugins: [
            react(),
            ...(dev ? [profilingSavePlugin()] : []),
        ],
        resolve: {
            alias: {
                '@': srcRoot,
                ...(dev && profilerSourceMode
                    ? viteDevProfilerSourceAliases(profilerRoot)
                    : {}),
            },
        },
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
        define: mode === 'production' ? {
            'import.meta.env.DEV': JSON.stringify(false),
            'import.meta.env.PROD': JSON.stringify(true),
        } : undefined,
    }
})
