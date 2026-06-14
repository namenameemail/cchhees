import { createProfiler, createProfileDebug } from 'vite-dev-profiler'

export type ProfilerPanelChannel = 'scroll' | 'moves' | 'selection' | 'assets' | 'collab'

let activeProfilerPanelChannel: ProfilerPanelChannel = 'scroll'

export function setProfilerPanelChannel(channel: ProfilerPanelChannel): void {
    activeProfilerPanelChannel = channel
}

export function isProfilerPanelChannel(channel: ProfilerPanelChannel): boolean {
    return import.meta.env.DEV && activeProfilerPanelChannel === channel
}

export const profiler = createProfiler({
    isDev: import.meta.env.DEV,
    captureConsole: false,
})
export const profileDebug = createProfileDebug(profiler)
