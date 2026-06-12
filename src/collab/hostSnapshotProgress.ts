export type HostSnapshotPhase =
    | 'idle'
    | 'preparing'
    | 'sending-state'
    | 'building-assets'
    | 'sending-assets'
    | 'done'
    | 'error'

export interface HostSnapshotProgress {
    active: boolean
    phase: HostSnapshotPhase
    label: string
    detail?: string
    percent: number
    guestLabel?: string
}

export const IDLE_HOST_SNAPSHOT_PROGRESS: HostSnapshotProgress = {
    active: false,
    phase: 'idle',
    label: '',
    percent: 0,
}

export function hostSnapshotProgressForPhase(
    phase: HostSnapshotPhase,
    options: {
        detail?: string
        assetSent?: number
        assetTotal?: number
        stateChunkSent?: number
        stateChunkTotal?: number
        guestPeerId?: string
        error?: string
    } = {},
): HostSnapshotProgress {
    const guestLabel = options.guestPeerId
        ? `гость ${options.guestPeerId.slice(0, 8)}`
        : undefined

    switch (phase) {
        case 'preparing':
            return {
                active: true,
                phase,
                label: 'Подготовка snapshot…',
                detail: guestLabel,
                percent: 15,
                guestLabel,
            }
        case 'sending-state': {
            const sent = options.stateChunkSent ?? 0
            const total = options.stateChunkTotal ?? 0
            const chunkDetail = total > 1 ? `${sent} / ${total} частей` : guestLabel
            return {
                active: true,
                phase,
                label: 'Отправка состояния…',
                detail: chunkDetail ?? options.detail,
                percent: total > 1 ? 25 + Math.round((sent / total) * 20) : 40,
                guestLabel,
            }
        }
        case 'building-assets':
            return {
                active: true,
                phase,
                label: 'Сборка ассетов…',
                detail: options.detail ?? guestLabel,
                percent: 52,
                guestLabel,
            }
        case 'sending-assets': {
            const sent = options.assetSent ?? 0
            const total = Math.max(options.assetTotal ?? 0, 1)
            return {
                active: true,
                phase,
                label: 'Отправка ассетов…',
                detail: `${sent} / ${total}`,
                percent: 55 + Math.round((sent / total) * 40),
                guestLabel,
            }
        }
        case 'done':
            return {
                active: true,
                phase,
                label: 'Snapshot отправлен',
                detail: options.detail,
                percent: 100,
                guestLabel,
            }
        case 'error':
            return {
                active: true,
                phase,
                label: 'Ошибка snapshot',
                detail: options.error ?? options.detail,
                percent: 0,
                guestLabel,
            }
        default:
            return IDLE_HOST_SNAPSHOT_PROGRESS
    }
}
