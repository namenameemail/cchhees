import { BoardSlice } from './state/slices'
import { CellImageShapeParams, CellParameters, CellShape } from './types/cells'
import { GameState } from './types/gameState'
import { SliceHistory } from './types/history'
import { getDefaultSvgCellParams } from './cellSvgSize'

const LEGACY_CELL_SHAPE_SVG = 'svg'

function getLegacySvgParams(
    paramsByShape?: CellParameters['paramsByShape'],
): CellImageShapeParams | undefined {
    return (paramsByShape as Record<string, CellImageShapeParams | undefined> | undefined)?.[LEGACY_CELL_SHAPE_SVG]
}

export function isCellImageShape(shape?: CellShape): shape is CellShape.img {
    return shape === CellShape.img
}

export function getCellImageShapeParams(cellParams?: CellParameters) {
    if (cellParams?.shape !== CellShape.img) {
        return undefined
    }

    return cellParams.paramsByShape?.[CellShape.img]
}

export function migrateCellParameters(params?: CellParameters): CellParameters | undefined {
    if (!params) {
        return params
    }

    const legacySvgParams = getLegacySvgParams(params.paramsByShape)
    const needsShapeMigration = (params.shape as string | undefined) === LEGACY_CELL_SHAPE_SVG

    if (!needsShapeMigration && legacySvgParams == null) {
        return params
    }

    const nextParamsByShape = { ...(params.paramsByShape ?? {}) }
    delete (nextParamsByShape as Record<string, unknown>)[LEGACY_CELL_SHAPE_SVG]

    if (!needsShapeMigration && params.shape !== CellShape.img) {
        return {
            ...params,
            paramsByShape: nextParamsByShape,
        }
    }

    const imgParams = nextParamsByShape[CellShape.img]
        ?? legacySvgParams
        ?? getDefaultSvgCellParams()

    return {
        ...params,
        shape: CellShape.img,
        paramsByShape: {
            ...nextParamsByShape,
            [CellShape.img]: { ...imgParams },
        },
    }
}

function migrateBoardSliceCellShapes(board: BoardSlice): BoardSlice {
    const cellParametersByCoord: BoardSlice['cellParametersByCoord'] = {}

    for (const [key, params] of Object.entries(board.cellParametersByCoord)) {
        cellParametersByCoord[key] = migrateCellParameters(params) ?? params
    }

    return {
        ...board,
        boardConditions: board.boardConditions.map(condition => ({
            ...condition,
            cellParams: migrateCellParameters(condition.cellParams) ?? condition.cellParams,
        })),
        cellParametersByCoord,
    }
}

export function migrateCellShapesInGameState(gameState: GameState): GameState {
    return {
        ...gameState,
        cells: gameState.cells.map(cell => ({
            ...cell,
            parameters: migrateCellParameters(cell.parameters),
        })),
        boardConditions: gameState.boardConditions.map(condition => ({
            ...condition,
            cellParams: migrateCellParameters(condition.cellParams) ?? condition.cellParams,
        })),
    }
}

export function migrateCellShapesInBoardHistory(
    history: SliceHistory<BoardSlice>,
): SliceHistory<BoardSlice> {
    return {
        before: history.before.map(migrateBoardSliceCellShapes),
        after: history.after.map(migrateBoardSliceCellShapes),
    }
}

export function ensureCellShapeParams(params: CellParameters): CellParameters {
    const migrated = migrateCellParameters(params) ?? params
    const shape = migrated.shape

    if (shape !== CellShape.img) {
        return migrated
    }

    if (migrated.paramsByShape?.[CellShape.img]) {
        return migrated
    }

    return {
        ...migrated,
        paramsByShape: {
            ...migrated.paramsByShape,
            [CellShape.img]: getDefaultSvgCellParams(),
        },
    }
}

export function getLegacySvgInlineFile(params?: CellParameters): string | undefined {
    const legacyParams = getLegacySvgParams(params?.paramsByShape)
    const imgParams = params?.paramsByShape?.[CellShape.img]
    const legacyFile = (legacyParams as { file?: string } | undefined)?.file
        ?? (imgParams as { file?: string } | undefined)?.file

    return typeof legacyFile === 'string' && legacyFile.length > 0 ? legacyFile : undefined
}
