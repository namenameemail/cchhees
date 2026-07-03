import { BoardParameters } from '../types/boardParameters'
import { CellCoord } from '../types/coords'
import {
    FigureEventAreaCell,
    FigureEventBoardRect,
    FigureEventCoord,
    OrientableCoordinates,
} from '../types/events'
import { FigureCatalog, FigureId, FigureMoveDirection, FigurePlacement, FigureTeams } from '../types/figures'
import { resolveFigureMoveDirectionFromCatalog } from '../figureView'
import { orientAreaCell, orientAreaCells } from '../moveRules'

export function isOrientToTeamDirection(params?: OrientableCoordinates | null): boolean {
    return params?.orientToTeamDirection === true
}

export function resolveMoveDirectionForFigure(
    catalog: FigureCatalog,
    figureId: FigureId | undefined,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): ReturnType<typeof resolveFigureMoveDirectionFromCatalog> {
    if (!figureId) {
        return 'up'
    }

    return resolveFigureMoveDirectionFromCatalog(
        catalog,
        figureId,
        boardParameters,
        legacyFigureTeams,
    )
}

export function maybeOrientAreaCell(
    cell: FigureEventAreaCell,
    orient: boolean,
    catalog: FigureCatalog,
    figureId: FigureId | undefined,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): FigureEventAreaCell {
    if (!orient) {
        return cell
    }

    const direction = resolveMoveDirectionForFigure(
        catalog,
        figureId,
        boardParameters,
        legacyFigureTeams,
    )

    return orientAreaCell(cell, direction)
}

export function maybeOrientAreaCells(
    cells: FigureEventAreaCell[],
    orient: boolean,
    catalog: FigureCatalog,
    figureId: FigureId | undefined,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): FigureEventAreaCell[] {
    if (!orient) {
        return cells
    }

    const direction = resolveMoveDirectionForFigure(
        catalog,
        figureId,
        boardParameters,
        legacyFigureTeams,
    )

    return orientAreaCells(cells, direction)
}

export function maybeOrientDelta(
    dx: number,
    dy: number,
    orient: boolean,
    catalog: FigureCatalog,
    figureId: FigureId | undefined,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): { dx: number; dy: number } {
    if (!orient) {
        return { dx: Math.trunc(dx), dy: Math.trunc(dy) }
    }

    const oriented = maybeOrientAreaCell(
        { x: dx, y: dy },
        true,
        catalog,
        figureId,
        boardParameters,
        legacyFigureTeams,
    )

    return { dx: oriented.x, dy: oriented.y }
}

export function offsetCoordFromAnchor(
    anchor: CellCoord,
    offset: FigureEventAreaCell,
): CellCoord {
    return {
        i: anchor.i + offset.x,
        j: anchor.j + offset.y,
    }
}

export function resolveBoardCellFromParams(
    anchor: CellCoord,
    x: number,
    y: number,
    orient: boolean,
    catalog: FigureCatalog,
    figureId: FigureId | undefined,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): CellCoord {
    if (!orient) {
        return { i: Math.trunc(x) - 1, j: Math.trunc(y) - 1 }
    }

    const offset = maybeOrientAreaCell(
        { x: Math.trunc(x), y: Math.trunc(y) },
        true,
        catalog,
        figureId,
        boardParameters,
        legacyFigureTeams,
    )

    return offsetCoordFromAnchor(anchor, offset)
}

/**
 * `inBoardArea`'s rect is an ABSOLUTE board area (unlike inFigureArea/hasFigureInArea's
 * anchor-relative offsets), so orientToTeamDirection rotates the board's own coordinate
 * frame (via n×m) instead of translating the rect relative to a figure's position.
 * Corner mapping matches rotateMoveVector's forward/lateral convention (moveRules.ts),
 * just expressed as absolute board coordinates instead of a vector rotated around zero.
 */
export function orientBoardAreaCorner(
    x: number,
    y: number,
    direction: FigureMoveDirection,
    boardParameters: BoardParameters,
): { x: number; y: number } {
    switch (direction) {
        case 'down':
            return { x: boardParameters.n + 1 - x, y: boardParameters.m + 1 - y }
        case 'left':
            return { x: y, y: boardParameters.m + 1 - x }
        case 'right':
            return { x: boardParameters.n + 1 - y, y: x }
        case 'up':
        default:
            return { x, y }
    }
}

export function isInsideOrientedRect(
    coord: CellCoord,
    rect: FigureEventBoardRect,
    orient: boolean,
    catalog: FigureCatalog,
    figureId: FigureId | undefined,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): boolean {
    const { x, y } = { x: coord.i + 1, y: coord.j + 1 }

    if (!orient || !boardParameters) {
        const xMin = Math.min(rect.x1, rect.x2)
        const xMax = Math.max(rect.x1, rect.x2)
        const yMin = Math.min(rect.y1, rect.y2)
        const yMax = Math.max(rect.y1, rect.y2)

        return x >= xMin && x <= xMax && y >= yMin && y <= yMax
    }

    const direction = resolveMoveDirectionForFigure(catalog, figureId, boardParameters, legacyFigureTeams)
    const corner1 = orientBoardAreaCorner(rect.x1, rect.y1, direction, boardParameters)
    const corner2 = orientBoardAreaCorner(rect.x2, rect.y2, direction, boardParameters)

    const xMin = Math.min(corner1.x, corner2.x)
    const xMax = Math.max(corner1.x, corner2.x)
    const yMin = Math.min(corner1.y, corner2.y)
    const yMax = Math.max(corner1.y, corner2.y)

    return x >= xMin && x <= xMax && y >= yMin && y <= yMax
}

export function isSameBoardCell(
    coord: CellCoord,
    x: number,
    y: number,
    orient: boolean,
    anchor: CellCoord,
    catalog: FigureCatalog,
    figureId: FigureId | undefined,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): boolean {
    const target = resolveBoardCellFromParams(
        anchor,
        x,
        y,
        orient,
        catalog,
        figureId,
        boardParameters,
        legacyFigureTeams,
    )

    return coord.i === target.i && coord.j === target.j
}

export function coordMatchesOrientedList(
    coord: CellCoord,
    anchor: CellCoord,
    cells: FigureEventCoord[],
    orient: boolean,
    catalog: FigureCatalog,
    figureId: FigureId | undefined,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): boolean {
    if (!orient) {
        const oneBased = { x: coord.i + 1, y: coord.j + 1 }
        return cells.some(cell => oneBased.x === cell.x && oneBased.y === cell.y)
    }

    const orientedCells = maybeOrientAreaCells(
        cells,
        true,
        catalog,
        figureId,
        boardParameters,
        legacyFigureTeams,
    )

    return orientedCells.some(cell => {
        const target = offsetCoordFromAnchor(anchor, cell)
        return coord.i === target.i && coord.j === target.j
    })
}

export function allCoordsMatchOrientedList(
    coord: CellCoord,
    anchor: CellCoord,
    cells: FigureEventCoord[],
    orient: boolean,
    catalog: FigureCatalog,
    figureId: FigureId | undefined,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): boolean {
    if (!cells.length) {
        return false
    }

    if (!orient) {
        const oneBased = { x: coord.i + 1, y: coord.j + 1 }
        return cells.every(cell => oneBased.x === cell.x && oneBased.y === cell.y)
    }

    const orientedCells = maybeOrientAreaCells(
        cells,
        true,
        catalog,
        figureId,
        boardParameters,
        legacyFigureTeams,
    )

    return orientedCells.every(cell => {
        const target = offsetCoordFromAnchor(anchor, cell)
        return coord.i === target.i && coord.j === target.j
    })
}

export function resolveOrientFigureId(
    fallback?: FigureId,
    placement?: FigurePlacement,
): FigureId | undefined {
    return placement?.figureId ?? fallback
}
