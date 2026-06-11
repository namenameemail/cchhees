import { createProfiler, createProfileDebug } from 'vite-dev-profiler'

export const profiler = createProfiler({ isDev: import.meta.env.DEV })
export const profileDebug = createProfileDebug(profiler)
