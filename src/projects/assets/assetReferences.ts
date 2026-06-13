import { CellParameters, CellShape, CellImageShapeParams } from '../../game/types/cells'
import { getCellImageShapeParams } from '../../game/cellImageShape'
import { GameState } from '../../game/types/gameState'
import { isCellStyleRule } from '../../game/types/styleRules'
import { FigureViewParams } from '../../game/types/figures'
import { FigureCatalog } from '../../game/types/figures'
import { BoardSlice } from '../../game/state/slices'
import { ProjectPersistData } from '../types'
import { SliceHistory } from '../../game/types/history'

function addAssetId(ids: Set<number>, id: number | null | undefined) {
    if (typeof id === 'number') {
        ids.add(id)
    }
}

function collectFromCellParameters(ids: Set<number>, params?: CellParameters) {
    addAssetId(ids, getCellImageShapeParams(params)?.assetId)
}

function collectFromFigureViewParams(ids: Set<number>, params?: FigureViewParams) {
    if (!params) {
        return
    }

    addAssetId(ids, params.assetId)
    addAssetId(ids, params.fontAssetId)
}

function collectFromGameState(ids: Set<number>, gameState: GameState) {
    for (const cell of gameState.cells) {
        collectFromCellParameters(ids, cell.parameters)
    }

    for (const rule of gameState.styleRules) {
        if (!isCellStyleRule(rule)) {
            continue
        }

        collectFromCellParameters(ids, rule.cellParams)
    }

    const { boardParameters } = gameState
    addAssetId(ids, boardParameters.backgroundAssetId)

    if (gameState.figureCatalog) {
        for (const entry of gameState.figureCatalog) {
            for (const state of entry.states) {
                collectFromFigureViewParams(ids, state.viewParams)
            }
        }
    } else if (gameState.figureDefinitions) {
        for (const params of Object.values(gameState.figureDefinitions)) {
            collectFromFigureViewParams(ids, params)
        }
    }
}

export function collectReferencedAssetIdsFromBoardSlice(board: BoardSlice): Set<number> {
    const ids = new Set<number>()

    for (const params of Object.values(board.cellParametersByCoord)) {
        collectFromCellParameters(ids, params)
    }

    for (const rule of board.styleRules) {
        if (!isCellStyleRule(rule)) {
            continue
        }

        collectFromCellParameters(ids, rule.cellParams)
    }

    addAssetId(ids, board.boardParameters.backgroundAssetId)

    return ids
}

function collectFromFigureCatalog(ids: Set<number>, catalog: FigureCatalog) {
    for (const entry of catalog) {
        for (const state of entry.states) {
            collectFromFigureViewParams(ids, state.viewParams)
        }
    }
}

export function collectReferencedAssetIdsFromGameState(gameState: GameState): Set<number> {
    const ids = new Set<number>()
    collectFromGameState(ids, gameState)
    return ids
}

export function collectReferencedAssetIds(data: ProjectPersistData): Set<number> {
    const ids = new Set<number>()

    collectFromFigureCatalog(ids, data.figureCatalog)

    for (const catalog of data.catalogHistory.before) {
        collectFromFigureCatalog(ids, catalog)
    }

    for (const catalog of data.catalogHistory.after) {
        collectFromFigureCatalog(ids, catalog)
    }

    for (const board of data.boards) {
        for (const id of collectReferencedAssetIdsFromGameState(board.gameState)) {
            ids.add(id)
        }

        for (const slice of board.boardHistory.before) {
            for (const id of collectReferencedAssetIdsFromBoardSlice(slice)) {
                ids.add(id)
            }
        }

        for (const slice of board.boardHistory.after) {
            for (const id of collectReferencedAssetIdsFromBoardSlice(slice)) {
                ids.add(id)
            }
        }
    }

    return ids
}

function pruneMissingAssetReferencesInBoardSlice(
    board: BoardSlice,
    availableIds: ReadonlySet<number>,
): BoardSlice {
    const cellParametersByCoord: BoardSlice['cellParametersByCoord'] = {}
    let changed = false

    for (const [key, params] of Object.entries(board.cellParametersByCoord)) {
        const nextParams = clearMissingAssetIdsFromCellParameters(params, availableIds)

        if (nextParams !== params) {
            changed = true
        }

        if (nextParams) {
            cellParametersByCoord[key] = nextParams
        }
    }

    const styleRules = board.styleRules.map(rule => {
        if (!isCellStyleRule(rule)) {
            return rule
        }

        const cellParams = clearMissingAssetIdsFromCellParameters(rule.cellParams, availableIds)

        if (cellParams === rule.cellParams) {
            return rule
        }

        changed = true
        return { ...rule, cellParams: cellParams ?? rule.cellParams }
    })

    const boardParameters = clearMissingBoardBackgroundAsset(board.boardParameters, availableIds)

    if (boardParameters !== board.boardParameters) {
        changed = true
    }

    if (!changed) {
        return board
    }

    return {
        ...board,
        boardParameters,
        cellParametersByCoord,
        styleRules,
    }
}

function clearMissingBoardBackgroundAsset(
    boardParameters: BoardSlice['boardParameters'],
    availableIds: ReadonlySet<number>,
): BoardSlice['boardParameters'] {
    if (
        boardParameters.backgroundAssetId == null
        || availableIds.has(boardParameters.backgroundAssetId)
    ) {
        return boardParameters
    }

    return {
        ...boardParameters,
        backgroundAssetId: null,
    }
}

function pruneMissingAssetReferencesInFigureCatalog(
    catalog: FigureCatalog,
    availableIds: ReadonlySet<number>,
): FigureCatalog {
    let changed = false

    const nextCatalog = catalog.map(entry => {
        let entryChanged = false
        const nextStates = entry.states.map(state => {
            const viewParams = clearMissingAssetIdsFromFigureViewParams(state.viewParams, availableIds)

            if (viewParams === state.viewParams) {
                return state
            }

            entryChanged = true
            return { ...state, viewParams: viewParams ?? state.viewParams }
        })

        if (!entryChanged) {
            return entry
        }

        changed = true
        return { ...entry, states: nextStates }
    })

    return changed ? nextCatalog : catalog
}

function pruneMissingAssetReferencesInBoardHistory(
    history: SliceHistory<BoardSlice>,
    availableIds: ReadonlySet<number>,
): SliceHistory<BoardSlice> {
    return {
        before: history.before.map(slice => pruneMissingAssetReferencesInBoardSlice(slice, availableIds)),
        after: history.after.map(slice => pruneMissingAssetReferencesInBoardSlice(slice, availableIds)),
    }
}

function pruneMissingAssetReferencesInCatalogHistory(
    history: SliceHistory<FigureCatalog>,
    availableIds: ReadonlySet<number>,
): SliceHistory<FigureCatalog> {
    return {
        before: history.before.map(catalog => pruneMissingAssetReferencesInFigureCatalog(catalog, availableIds)),
        after: history.after.map(catalog => pruneMissingAssetReferencesInFigureCatalog(catalog, availableIds)),
    }
}

export function pruneMissingAssetReferencesInPersistData(
    data: ProjectPersistData,
    availableIds: ReadonlySet<number>,
): ProjectPersistData {
    return {
        ...data,
        figureCatalog: pruneMissingAssetReferencesInFigureCatalog(data.figureCatalog, availableIds),
        catalogHistory: pruneMissingAssetReferencesInCatalogHistory(data.catalogHistory, availableIds),
        boards: data.boards.map(board => ({
            ...board,
            gameState: pruneMissingAssetReferences(board.gameState, availableIds),
            boardHistory: pruneMissingAssetReferencesInBoardHistory(board.boardHistory, availableIds),
        })),
    }
}

export function pruneMissingAssetReferences(
    gameState: GameState,
    availableIds: ReadonlySet<number>,
): GameState {
    let changed = false

    const cells = gameState.cells.map(cell => {
        const parameters = clearMissingAssetIdsFromCellParameters(cell.parameters, availableIds)

        if (parameters === cell.parameters) {
            return cell
        }

        changed = true
        return { ...cell, parameters }
    })

    const styleRules = gameState.styleRules.map(rule => {
        if (!isCellStyleRule(rule)) {
            return rule
        }

        const cellParams = clearMissingAssetIdsFromCellParameters(rule.cellParams, availableIds)

        if (cellParams === rule.cellParams) {
            return rule
        }

        changed = true
        return { ...rule, cellParams: cellParams ?? rule.cellParams }
    })

    let figureCatalog = gameState.figureCatalog

    if (figureCatalog) {
        const nextCatalog = figureCatalog.map(entry => {
            let entryChanged = false
            const nextStates = entry.states.map(state => {
                const viewParams = clearMissingAssetIdsFromFigureViewParams(state.viewParams, availableIds)

                if (viewParams === state.viewParams) {
                    return state
                }

                entryChanged = true
                return { ...state, viewParams: viewParams ?? state.viewParams }
            })

            if (!entryChanged) {
                return entry
            }

            changed = true
            return { ...entry, states: nextStates }
        })
        figureCatalog = nextCatalog
    }

    const boardParameters = clearMissingBoardBackgroundAsset(gameState.boardParameters, availableIds)

    if (boardParameters !== gameState.boardParameters) {
        changed = true
    }

    if (!changed) {
        return gameState
    }

    return {
        ...gameState,
        cells,
        styleRules,
        boardParameters,
        figureCatalog,
    }
}

function clearMissingAssetIdsFromCellParameters(
    params: CellParameters | undefined,
    availableIds: ReadonlySet<number>,
): CellParameters | undefined {
    if (!params?.paramsByShape) {
        return params
    }

    const shapeParams = params.paramsByShape[CellShape.img] as CellImageShapeParams | undefined

    if (!shapeParams?.assetId || availableIds.has(shapeParams.assetId)) {
        return params
    }

    return clearAssetIdFromCellParameters(params, shapeParams.assetId)
}

function clearMissingAssetIdsFromFigureViewParams(
    params: FigureViewParams | undefined,
    availableIds: ReadonlySet<number>,
): FigureViewParams | undefined {
    if (!params) {
        return params
    }

    let next = params

    if (params.assetId != null && !availableIds.has(params.assetId)) {
        next = clearAssetIdFromFigureViewParams(next, params.assetId) ?? next
    }

    if (params.fontAssetId != null && !availableIds.has(params.fontAssetId)) {
        next = clearAssetIdFromFigureViewParams(next, params.fontAssetId) ?? next
    }

    return next === params ? params : next
}

function getCellImageAssetId(params?: CellParameters): number | null | undefined {
    return getCellImageShapeParams(params)?.assetId
}

function getFigureImageAssetId(params?: FigureViewParams): number | null | undefined {
    return params?.assetId
}

function getFigureFontAssetId(params?: FigureViewParams): number | null | undefined {
    return params?.fontAssetId
}

function countFigureAssetReferences(params: FigureViewParams | undefined, assetId: number): number {
    let count = 0

    if (getFigureImageAssetId(params) === assetId) {
        count++
    }

    if (getFigureFontAssetId(params) === assetId) {
        count++
    }

    return count
}

export function countAssetReferences(gameState: GameState, assetId: number): number {
    let count = 0

    for (const cell of gameState.cells) {
        if (getCellImageAssetId(cell.parameters) === assetId) {
            count++
        }
    }

    for (const rule of gameState.styleRules) {
        if (!isCellStyleRule(rule)) {
            continue
        }

        if (getCellImageAssetId(rule.cellParams) === assetId) {
            count++
        }
    }

    if (gameState.boardParameters.backgroundAssetId === assetId) {
        count++
    }

    if (gameState.figureCatalog) {
        for (const entry of gameState.figureCatalog) {
            for (const state of entry.states) {
                count += countFigureAssetReferences(state.viewParams, assetId)
            }
        }
    } else if (gameState.figureDefinitions) {
        for (const params of Object.values(gameState.figureDefinitions)) {
            count += countFigureAssetReferences(params, assetId)
        }
    }

    return count
}

export function clearAssetIdFromBoardParameters(
    parameters: GameState['boardParameters'],
    assetId: number,
): GameState['boardParameters'] {
    if (parameters.backgroundAssetId !== assetId) {
        return parameters
    }

    return {
        ...parameters,
        backgroundAssetId: null,
    }
}

export function clearAssetIdFromCellParameters(
    params: CellParameters | undefined,
    assetId: number,
): CellParameters | undefined {
    if (!params?.paramsByShape) {
        return params
    }

    let changed = false
    const nextParamsByShape = { ...params.paramsByShape }

    for (const shape of [CellShape.img] as const) {
        const shapeParams = params.paramsByShape[shape] as CellImageShapeParams | undefined

        if (!shapeParams || shapeParams.assetId !== assetId) {
            continue
        }

        nextParamsByShape[shape] = {
            ...shapeParams,
            assetId: null,
        }
        changed = true
    }

    if (!changed) {
        return params
    }

    return {
        ...params,
        paramsByShape: nextParamsByShape,
    }
}

export function clearAssetIdFromFigureViewParams(
    params: FigureViewParams | undefined,
    assetId: number,
): FigureViewParams | undefined {
    if (!params) {
        return params
    }

    let changed = false
    const nextParams = { ...params }

    if (params.assetId === assetId) {
        nextParams.assetId = null
        changed = true
    }

    if (params.fontAssetId === assetId) {
        nextParams.fontAssetId = null
        changed = true
    }

    return changed ? nextParams : params
}
