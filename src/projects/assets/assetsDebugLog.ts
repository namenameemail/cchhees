import { profiler, profileDebug } from '../../profiler'

const MAX_CONSOLE_LINES = 120
const CONSOLE_PREFIX = '[assets] '

function enabled(): boolean {
    return import.meta.env.DEV
}

function trimConsoleLines(): void {
    const lines = profiler.getPanelLines('console')
    const assetLines = lines.filter(line => line.startsWith(CONSOLE_PREFIX))

    if (assetLines.length <= MAX_CONSOLE_LINES) {
        return
    }

    const otherLines = lines.filter(line => !line.startsWith(CONSOLE_PREFIX))
    profiler.setPanelText('console', [...otherLines, ...assetLines.slice(-MAX_CONSOLE_LINES)].join('\n'))
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
    trimConsoleLines()

    profileDebug('assets', text.slice(0, 120), meta)

    if (profiler.isRecording) {
        profiler.log(`assets ${text}`, meta)
        profiler.flushLatest('assets')
    }
}

export const assetsDebugLog = {
    effectRun(projectId: string | null, reason: string): void {
        append(`effect project=${projectId ?? '—'} · ${reason}`, { projectId, reason })
    },

    loadStart(projectId: string, generation: number, reason: string): void {
        append(`LOAD start gen=${generation} project=${projectId.slice(0, 8)} · ${reason}`, {
            projectId,
            generation,
            reason,
        })
    },

    loadComplete(projectId: string, generation: number, assetIds: number[], stale: boolean): void {
        append(
            `LOAD done gen=${generation} count=${assetIds.length} ids=[${assetIds.join(', ')}]${stale ? ' STALE ignored' : ''}`,
            { projectId, generation, assetIds, stale },
        )
    },

    loadSkipped(reason: string): void {
        append(`LOAD skip · ${reason}`, { reason })
    },

    addLocal(id: number, name: string, projectId: string): void {
        append(`ADD local id=${id} «${name}» project=${projectId.slice(0, 8)}`, { id, name, projectId })
    },

    addRemote(id: number, name: string, projectId: string): void {
        append(`ADD remote id=${id} «${name}» project=${projectId.slice(0, 8)}`, { id, name, projectId })
    },

    removeLocal(id: number, name?: string): void {
        append(`REMOVE local id=${id}${name ? ` «${name}»` : ''}`, { id, name })
    },

    removeRemote(id: number, name?: string): void {
        append(`REMOVE remote id=${id}${name ? ` «${name}»` : ''}`, { id, name })
    },

    persistProject(projectId: string, revision?: string): void {
        append(`project persist scheduled id=${projectId.slice(0, 8)}${revision ? ` ${revision}` : ''}`, { projectId })
    },

    warn(text: string, meta?: Record<string, unknown>): void {
        append(`WARN ${text}`, meta)
    },

    putNew(id: number, projectId: string, name: string): void {
        append(`IDB put id=${id} «${name}» project=${projectId.slice(0, 8)}`, { id, projectId, name })
    },

    putReuse(id: number, projectId: string, name: string): void {
        append(`IDB reuse id=${id} «${name}» project=${projectId.slice(0, 8)}`, { id, projectId, name })
    },

    putCollision(
        hostId: number,
        localId: number,
        ownerProjectId: string,
        targetProjectId: string,
        name: string,
    ): void {
        append(
            `IDB COLLISION host id=${hostId} → local id=${localId} «${name}» `
            + `was project=${ownerProjectId.slice(0, 8)} store=${targetProjectId.slice(0, 8)}`,
            { hostId, localId, ownerProjectId, targetProjectId, name },
        )
    },

    visitedRoomImport(
        roomId: string,
        localProjectId: string,
        assetCount: number,
        idMap: Record<number, number>,
        hostProjectId?: string,
    ): void {
        const remaps = Object.entries(idMap).filter(([host, local]) => Number(host) !== Number(local))
        append(
            `visited import host=${hostProjectId?.slice(0, 8) ?? '?'} room=${roomId} local=${localProjectId.slice(0, 8)} assets=${assetCount}`
            + (remaps.length ? ` remaps={${remaps.map(([h, l]) => `${h}→${l}`).join(', ')}}` : ''),
            { roomId, localProjectId, hostProjectId, assetCount, idMap, remaps: remaps.length },
        )
    },

    visitedRoomEvict(roomId: string, projectId: string): void {
        append(`visited evict room=${roomId} project=${projectId.slice(0, 8)}`, { roomId, projectId })
    },
}
