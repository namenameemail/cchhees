import { BoardSlice } from '../game/state/slices'
import { CellParameters, CellShape, CellImageShapeParams } from '../game/types/cells'
import { GameState } from '../game/types/gameState'
import { FigureCatalog, FigureDisplayType, FigureViewParams } from '../game/types/figures'
import { SliceHistory } from '../game/types/history'

type IdMap = ReadonlyMap<number, number>

function remapId(map: IdMap, id: number | null | undefined): number | null | undefined {
    if (id == null) {
        return id
    }

    const next = map.get(id)

    if (next == null) {
        throw new Error(`Missing asset id mapping for ${id}`)
    }

    return next
}

function remapCellParameters(
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
            assetId: remapId(map, shapeParams.assetId),
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

function remapFigureViewParams(params: FigureViewParams, map: IdMap): FigureViewParams {
    const nextParams = { ...params }

    if (params.displayType === FigureDisplayType.image && params.assetId != null) {
        nextParams.assetId = remapId(map, params.assetId)
    }

    if (params.fontAssetId != null) {
        nextParams.fontAssetId = remapId(map, params.fontAssetId)
    }

    return nextParams
}

function remapFigureCatalog(catalog: FigureCatalog, map: IdMap): FigureCatalog {
    return catalog.map(entry => ({
        ...entry,
        viewParams: remapFigureViewParams(entry.viewParams, map),
    }))
}

export function remapAssetIdsInGameState(gameState: GameState, map: IdMap): GameState {
    return {
        ...gameState,
        cells: gameState.cells.map(cell => ({
            ...cell,
            parameters: remapCellParameters(cell.parameters, map),
        })),
        boardConditions: gameState.boardConditions.map(condition => ({
            ...condition,
            cellParams: remapCellParameters(condition.cellParams, map) ?? condition.cellParams,
        })),
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
        boardConditions: board.boardConditions.map(condition => ({
            ...condition,
            cellParams: remapCellParameters(condition.cellParams, map) ?? condition.cellParams,
        })),
        cellParametersByCoord,
        figureCatalog: remapFigureCatalog(board.figureCatalog, map),
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
