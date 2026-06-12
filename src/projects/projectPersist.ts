import { GameState } from '../game/types/gameState'
import { SliceHistory, historyInit } from '../game/types/history'
import { FigureCatalog } from '../game/types/figures'
import { BoardDocument, Project, ProjectPersistData, getActiveBoard, getBoardGameState, projectToPersistData } from './types'
import { VisitedRoom } from './visitedRooms/types'

export interface ActiveBoardPersistPayload {
    activeBoardId: string
    state: GameState
    figuresHistory: BoardDocument['figuresHistory']
    boardHistory: BoardDocument['boardHistory']
    figureCatalog: FigureCatalog
    catalogHistory: SliceHistory<FigureCatalog>
}

export function mergeActiveBoardPersist(project: Project, payload: ActiveBoardPersistPayload): Project {
    const boards = project.boards.map(board => (
        board.id === payload.activeBoardId
            ? {
                ...board,
                gameState: payload.state,
                figuresHistory: payload.figuresHistory,
                boardHistory: payload.boardHistory,
            }
            : board
    ))

    return {
        ...project,
        boards,
        activeBoardId: payload.activeBoardId,
        figureCatalog: payload.figureCatalog,
        catalogHistory: payload.catalogHistory,
        updatedAt: Date.now(),
    }
}

export function mergeActiveBoardPersistIntoVisitedRoom(
    room: VisitedRoom,
    payload: ActiveBoardPersistPayload,
): VisitedRoom {
    const projectLike = visitedRoomAsProject(room)
    const merged = mergeActiveBoardPersist(projectLike, payload)

    return {
        ...room,
        boards: merged.boards,
        activeBoardId: merged.activeBoardId,
        figureCatalog: merged.figureCatalog,
        catalogHistory: merged.catalogHistory,
        updatedAt: merged.updatedAt,
        lastVisitedAt: Date.now(),
    }
}

export function visitedRoomAsProject(room: VisitedRoom): Project {
    return {
        id: room.localProjectId,
        name: room.name,
        updatedAt: room.updatedAt,
        figureCatalog: room.figureCatalog,
        catalogHistory: room.catalogHistory,
        boards: room.boards,
        activeBoardId: room.activeBoardId,
        previewDataUrl: room.previewDataUrl,
    }
}

export function getProjectPersistData(project: Project): ProjectPersistData {
    return projectToPersistData(project)
}

export function getActiveBoardPreviewState(project: Project): GameState {
    const board = getActiveBoard(project)
    return getBoardGameState(board, project.figureCatalog)
}

export function updateActiveBoardPreview(project: Project, previewDataUrl: string): Project {
    const activeBoardId = project.activeBoardId

    return {
        ...project,
        previewDataUrl,
        boards: project.boards.map(board => (
            board.id === activeBoardId
                ? { ...board, previewDataUrl }
                : board
        )),
    }
}

export function updateVisitedRoomPreview(room: VisitedRoom, previewDataUrl: string): VisitedRoom {
    const activeBoardId = room.activeBoardId

    return {
        ...room,
        previewDataUrl,
        boards: room.boards.map(board => (
            board.id === activeBoardId
                ? { ...board, previewDataUrl }
                : board
        )),
    }
}
