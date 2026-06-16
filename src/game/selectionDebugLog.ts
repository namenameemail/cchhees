import { createChannelDebugLog, formatDebugCoord } from '../channelDebugLog'
import type { CellCoord } from './types/coords'

const log = createChannelDebugLog({
    channel: 'selection',
    consolePrefix: '[selection] ',
})

function append(text: string, meta?: Record<string, unknown>): void {
    log.append(text, meta)
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
            `activeCell ${formatDebugCoord(previous, 'plain')} → ${formatDebugCoord(next, 'plain')} · ${reason}`,
            { previous, next, reason },
        )
    },

    cellClick(coord: CellCoord, mode: string, activeCell: CellCoord | undefined, hasFigure: boolean): void {
        append(
            `cell click (${coord.i},${coord.j}) mode=${mode} active=${formatDebugCoord(activeCell, 'plain')} figure=${hasFigure}`,
            { coord, mode, activeCell, hasFigure },
        )
    },

    cleared(reason: string, coord?: CellCoord): void {
        append(`cleared ${formatDebugCoord(coord, 'plain')} · ${reason}`, { reason, coord })
    },
}
