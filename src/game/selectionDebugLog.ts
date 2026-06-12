import { profiler, profileDebug } from '../profiler'
import { CellCoord } from './types/coords'

const CONSOLE_PREFIX = '[selection] '

function enabled(): boolean {
    return import.meta.env.DEV
}

function formatCoord(coord: CellCoord | undefined): string {
    if (!coord) {
        return '—'
    }

    return `${coord.i},${coord.j}`
}

function append(text: string, meta?: Record<string, unknown>): void {
    if (!enabled()) {
        return
    }

    const time = new Date().toLocaleTimeString(undefined, {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions)

    profiler.appendPanelText('console', `${CONSOLE_PREFIX}${time}  ${text}`)
    profileDebug('selection', text.slice(0, 120), meta)

    if (profiler.isRecording) {
        profiler.log(`selection ${text}`, meta)
        profiler.flushLatest('selection')
    }
}

export const selectionDebugLog = {
    mount(sessionKey: string): void {
        append(`GameProvider mount · ${sessionKey}`, { sessionKey, kind: 'mount' })
    },

    unmount(sessionKey: string): void {
        append(`GameProvider unmount · ${sessionKey}`, { sessionKey, kind: 'unmount' })
    },

    activeCell(next: CellCoord | undefined, reason: string, previous?: CellCoord): void {
        append(
            `activeCell ${formatCoord(previous)} → ${formatCoord(next)} · ${reason}`,
            { previous, next, reason },
        )
    },

    cellClick(coord: CellCoord, mode: string, activeCell: CellCoord | undefined, hasFigure: boolean): void {
        append(
            `cell click (${coord.i},${coord.j}) mode=${mode} active=${formatCoord(activeCell)} figure=${hasFigure}`,
            { coord, mode, activeCell, hasFigure },
        )
    },

    cleared(reason: string, coord?: CellCoord): void {
        append(`cleared ${formatCoord(coord)} · ${reason}`, { reason, coord })
    },
}
