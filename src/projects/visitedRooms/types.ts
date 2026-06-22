import { GameState } from '../../game/types/gameState'
import { SliceHistory } from '../../game/types/history'
import { FigureCatalog, FigureTeams } from '../../game/types/figures'
import { BoardDocument, migrateProject, Project } from '../types'
import { migrateFigureTeamsFromCatalog } from '../../game/figureTeams'

export const MAX_VISITED_ROOMS = 10

export interface VisitedRoom {
    /** PK — UUID проекта на хосте. */
    hostProjectId: string
    /** Локальный bucket для assets в IndexedDB. */
    localProjectId: string
    /** Последний room code, через который подключались. */
    lastRoomId: string
    name: string
    updatedAt: number
    lastVisitedAt: number
    figureCatalog: FigureCatalog
    figureTeams: FigureTeams
    catalogHistory: SliceHistory<FigureCatalog>
    boards: BoardDocument[]
    activeBoardId: string
    previewDataUrl?: string
    /** Host collab asset id → local IDB id when ids collided across projects. */
    hostAssetIdRemap?: Record<number, number>
}

export type ProjectSessionKind = 'local' | 'visited'

export function visitedRoomToProject(room: VisitedRoom): Project {
    return {
        id: room.localProjectId,
        name: room.name,
        updatedAt: room.updatedAt,
        figureCatalog: room.figureCatalog,
        figureTeams: room.figureTeams,
        catalogHistory: room.catalogHistory,
        boards: room.boards,
        activeBoardId: room.activeBoardId,
        previewDataUrl: room.previewDataUrl,
    }
}

export function normalizeRoomId(roomId: string): string {
    return roomId.trim().toUpperCase()
}

/** v3 visited room record before hostProjectId slot model. */
export interface LegacyVisitedRoomV3 {
    roomId: string
    projectId: string
    name: string
    updatedAt: number
    lastVisitedAt: number
    gameState: GameState
    figuresHistory: BoardDocument['figuresHistory']
    boardHistory: BoardDocument['boardHistory']
    previewDataUrl?: string
    hostAssetIdRemap?: Record<number, number>
}

/** v4 visited room — single board before multi-board model. */
export interface LegacyVisitedRoomV4 {
    hostProjectId: string
    localProjectId: string
    lastRoomId: string
    name: string
    updatedAt: number
    lastVisitedAt: number
    gameState: GameState
    figuresHistory: BoardDocument['figuresHistory']
    boardHistory: BoardDocument['boardHistory']
    previewDataUrl?: string
    hostAssetIdRemap?: Record<number, number>
}

export function migrateLegacyVisitedRoomV3(legacy: LegacyVisitedRoomV3): VisitedRoom {
    return {
        hostProjectId: `legacy:${legacy.roomId}`,
        localProjectId: legacy.projectId,
        lastRoomId: legacy.roomId,
        name: legacy.name,
        updatedAt: legacy.updatedAt,
        lastVisitedAt: legacy.lastVisitedAt,
        ...wrapLegacySingleBoardRoom(legacy),
        hostAssetIdRemap: legacy.hostAssetIdRemap,
    }
}

export function migrateLegacyVisitedRoomV4(legacy: LegacyVisitedRoomV4): VisitedRoom {
    return {
        hostProjectId: legacy.hostProjectId,
        localProjectId: legacy.localProjectId,
        lastRoomId: legacy.lastRoomId,
        name: legacy.name,
        updatedAt: legacy.updatedAt,
        lastVisitedAt: legacy.lastVisitedAt,
        ...wrapLegacySingleBoardRoom(legacy),
        hostAssetIdRemap: legacy.hostAssetIdRemap,
    }
}

export function migrateVisitedRoom(raw: unknown): VisitedRoom {
    const room = raw as Partial<VisitedRoom> & Partial<LegacyVisitedRoomV4> & Partial<LegacyVisitedRoomV3>

    if (room.boards && room.activeBoardId && room.figureCatalog) {
        return {
            ...(room as VisitedRoom),
            figureTeams: migrateFigureTeamsFromCatalog(
                room.figureCatalog,
                (room as VisitedRoom).figureTeams,
            ),
        }
    }

    if (room.gameState && room.hostProjectId && room.localProjectId) {
        return migrateLegacyVisitedRoomV4(room as LegacyVisitedRoomV4)
    }

    if (room.gameState && room.projectId) {
        return migrateLegacyVisitedRoomV3(room as LegacyVisitedRoomV3)
    }

    throw new Error('Invalid visited room record')
}

function wrapLegacySingleBoardRoom(legacy: {
    gameState: GameState
    figuresHistory: BoardDocument['figuresHistory']
    boardHistory: BoardDocument['boardHistory']
    previewDataUrl?: string
}): Pick<VisitedRoom, 'figureCatalog' | 'figureTeams' | 'catalogHistory' | 'boards' | 'activeBoardId' | 'previewDataUrl'> {
    const project: Project = migrateProject({
        id: 'legacy',
        name: 'legacy',
        updatedAt: Date.now(),
        gameState: legacy.gameState,
        figuresHistory: legacy.figuresHistory,
        boardHistory: legacy.boardHistory,
        previewDataUrl: legacy.previewDataUrl,
    })

    return {
        figureCatalog: project.figureCatalog,
        figureTeams: project.figureTeams,
        catalogHistory: project.catalogHistory,
        boards: project.boards,
        activeBoardId: project.activeBoardId,
        previewDataUrl: legacy.previewDataUrl,
    }
}
