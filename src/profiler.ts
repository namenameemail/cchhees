import { createProfiler, createProfileDebug } from 'vite-dev-profiler'

export type ProfilerPanelChannel =
    | 'scroll'
    | 'moves'
    | 'selection'
    | 'assets'
    | 'collab'
    | 'export'
    | 'events'
    | 'actions'
    | 'gameplay'

const GAMEPLAY_PANEL_CHANNELS: ProfilerPanelChannel[] = ['moves', 'events', 'actions']

let activeProfilerPanelChannel: ProfilerPanelChannel = 'scroll'

export function setProfilerPanelChannel(channel: ProfilerPanelChannel): void {
    activeProfilerPanelChannel = channel
}

export function getProfilerPanelChannel(): ProfilerPanelChannel {
    return activeProfilerPanelChannel
}

export function isProfilerPanelChannel(channel: ProfilerPanelChannel): boolean {
    if (!import.meta.env.DEV) {
        return false
    }

    if (activeProfilerPanelChannel === 'gameplay') {
        return GAMEPLAY_PANEL_CHANNELS.includes(channel)
    }

    return activeProfilerPanelChannel === channel
}

export const profiler = createProfiler({
    isDev: import.meta.env.DEV,
    captureConsole: import.meta.env.DEV,
})
export const profileDebug = createProfileDebug(profiler)
