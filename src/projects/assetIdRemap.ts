import { BoardSlice } from '../game/state/slices'
import { isCellStyleRule } from '../game/types/styleRules'
import { CellParameters, CellShape, CellImageShapeParams } from '../game/types/cells'
import { GameState } from '../game/types/gameState'
import { FigureCatalog, FigureViewParams } from '../game/types/figures'
import { SliceHistory } from '../game/types/history'
import { ProjectPersistData } from './types'

type IdMap = ReadonlyMap<number, number>

function remapIdStrict(map: IdMap, id: number | null | undefined): number | null | undefined {
    if (id == null) {
        return id
    }

    const next = map.get(id)

    if (next == null) {
        throw new Error(`Missing asset id mapping for ${id}`)
    }

    return next
}

export function remapAssetIdWithFallback(
    map: IdMap | null | undefined,
    id: number | null | undefined,
): number | null | undefined {
    if (id == null || !map || map.size === 0) {
        return id
    }

    return map.get(id) ?? id
}

export function toAssetIdMap(record: Record<number, number> | null | undefined): IdMap | null {
    if (!record || Object.keys(record).length === 0) {
        return null
    }

    return new Map(
        Object.entries(record).map(([from, to]) => [Number(from), to]),
    )
}

export function invertHostAssetIdRemap(
    hostAssetIdRemap: Record<number, number> | null | undefined,
): Record<number, number> | undefined {
    if (!hostAssetIdRemap) {
        return undefined
    }

    const inverted: Record<number, number> = {}

    for (const [hostId, localId] of Object.entries(hostAssetIdRemap)) {
        if (Number(hostId) !== localId) {
            inverted[localId] = Number(hostId)
        }
    }

    return Object.keys(inverted).length > 0 ? inverted : undefined
}

function remapCellParametersStrict(
    params: CellParameters | undefined,
    map: IdMap,
): CellParameters | undefined {
    if (!params?.paramsByShape) {
        return params
    }

    let changed = false
    const nextParamsByShape = { ...params.paramsByShape }

    for (const shape of [CellShape.img] as const) {
        const shapeParams = params.paramsByShape[shape] as CellImageShapeParams | undefined

        if (!shapeParams || shapeParams.assetId == null) {
            continue
        }

        nextParamsByShape[shape] = {
            ...shapeParams,
            assetId: remapIdStrict(map, shapeParams.assetId),
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

function remapFigureViewParamsStrict(params: FigureViewParams, map: IdMap): FigureViewParams {
    const nextParams = { ...params }

    if (params.assetId != null) {
        nextParams.assetId = remapIdStrict(map, params.assetId)
    }

    if (params.fontAssetId != null) {
        nextParams.fontAssetId = remapIdStrict(map, params.fontAssetId)
    }

    return nextParams
}

export function remapCellParametersWithFallback(
    params: CellParameters | null | undefined,
    map: IdMap | null | undefined,
): CellParameters | null | undefined {
    if (!params?.paramsByShape) {
        return params
    }

    let changed = false
    const nextParamsByShape = { ...params.paramsByShape }

    for (const shape of [CellShape.img] as const) {
        const shapeParams = params.paramsByShape[shape] as CellImageShapeParams | undefined

        if (!shapeParams || shapeParams.assetId == null) {
            continue
        }

        const nextAssetId = remapAssetIdWithFallback(map, shapeParams.assetId)

        if (nextAssetId === shapeParams.assetId) {
            continue
        }

        nextParamsByShape[shape] = {
            ...shapeParams,
            assetId: nextAssetId,
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

export function remapFigureViewParamsWithFallback(
    params: FigureViewParams,
    map: IdMap | null | undefined,
): FigureViewParams {
    const nextParams = { ...params }

    if (params.assetId != null) {
        nextParams.assetId = remapAssetIdWithFallback(map, params.assetId) as number
    }

    if (params.fontAssetId != null) {
        nextParams.fontAssetId = remapAssetIdWithFallback(map, params.fontAssetId) as number
    }

    return nextParams
}

function remapFigureCatalogStrict(catalog: FigureCatalog, map: IdMap): FigureCatalog {
    return catalog.map(entry => ({
        ...entry,
        states: entry.states.map(state => ({
            ...state,
            viewParams: remapFigureViewParamsStrict(state.viewParams, map),
        })),
    }))
}

function remapCellParameters(
    params: CellParameters | undefined,
    map: IdMap,
): CellParameters | undefined {
    return remapCellParametersStrict(params, map)
}

function remapFigureViewParams(params: FigureViewParams, map: IdMap): FigureViewParams {
    return remapFigureViewParamsStrict(params, map)
}

function remapFigureCatalog(catalog: FigureCatalog, map: IdMap): FigureCatalog {
    return remapFigureCatalogStrict(catalog, map)
}

export function remapAssetIdsInBoardSliceWithFallback(
    board: BoardSlice,
    map: IdMap | null | undefined,
): BoardSlice {
    if (!map || map.size === 0) {
        return board
    }

    const cellParametersByCoord: BoardSlice['cellParametersByCoord'] = {}

    for (const [key, params] of Object.entries(board.cellParametersByCoord)) {
        cellParametersByCoord[key] = remapCellParametersWithFallback(params, map) ?? params
    }

    const styleRules = board.styleRules.map(rule => {
        if (!isCellStyleRule(rule)) {
            return rule
        }

        return {
            ...rule,
            cellParams: remapCellParametersWithFallback(rule.cellParams, map) ?? rule.cellParams,
        }
    })

    return {
        ...board,
        cellParametersByCoord,
        styleRules,
    }
}

export function remapAssetIdsInFigureCatalog(catalog: FigureCatalog, map: IdMap): FigureCatalog {
    return remapFigureCatalog(catalog, map)
}

export function remapAssetIdsInCatalogHistory(
    history: SliceHistory<FigureCatalog>,
    map: IdMap,
): SliceHistory<FigureCatalog> {
    return {
        before: history.before.map(catalog => remapFigureCatalog(catalog, map)),
        after: history.after.map(catalog => remapFigureCatalog(catalog, map)),
    }
}

export function remapAssetIdsInGameState(gameState: GameState, map: IdMap): GameState {
    return {
        ...gameState,
        cells: gameState.cells.map(cell => ({
            ...cell,
            parameters: remapCellParameters(cell.parameters, map),
        })),
        styleRules: gameState.styleRules.map(rule => {
            if (!isCellStyleRule(rule)) {
                return rule
            }

            return {
                ...rule,
                cellParams: remapCellParameters(rule.cellParams, map) ?? rule.cellParams,
            }
        }),
        figureCatalog: remapFigureCatalog(gameState.figureCatalog ?? [], map),
    }
}

export function remapAssetIdsInBoardSlice(board: BoardSlice, map: IdMap): BoardSlice {
    const cellParametersByCoord: Record<string, CellParameters> = {}

    for (const [key, params] of Object.entries(board.cellParametersByCoord)) {
        cellParametersByCoord[key] = remapCellParameters(params, map) ?? params
    }

    return {
        ...board,
        styleRules: board.styleRules.map(rule => {
            if (!isCellStyleRule(rule)) {
                return rule
            }

            return {
                ...rule,
                cellParams: remapCellParameters(rule.cellParams, map) ?? rule.cellParams,
            }
        }),
        cellParametersByCoord,
    }
}

export function remapAssetIdsInBoardHistory(
    history: SliceHistory<BoardSlice>,
    map: IdMap,
): SliceHistory<BoardSlice> {
    return {
        before: history.before.map(slice => remapAssetIdsInBoardSlice(slice, map)),
        after: history.after.map(slice => remapAssetIdsInBoardSlice(slice, map)),
    }
}

export function remapAssetIdsInProjectPersist(data: ProjectPersistData, map: IdMap): ProjectPersistData {
    return {
        figureCatalog: remapAssetIdsInFigureCatalog(data.figureCatalog, map),
        figureTeams: data.figureTeams,
        catalogHistory: remapAssetIdsInCatalogHistory(data.catalogHistory, map),
        activeBoardId: data.activeBoardId,
        boards: data.boards.map(board => ({
            ...board,
            gameState: remapAssetIdsInGameState(board.gameState, map),
            boardHistory: remapAssetIdsInBoardHistory(board.boardHistory, map),
        })),
    }
}
