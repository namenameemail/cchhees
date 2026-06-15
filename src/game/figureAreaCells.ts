import { FigureEventAreaCell } from './types/events'

export function areaCellKey(x: number, y: number): string {
    return `${Math.trunc(x)},${Math.trunc(y)}`
}

export function normalizeFigureAreaCells(cells?: FigureEventAreaCell[]): FigureEventAreaCell[] {
    if (!cells?.length) {
        return []
    }

    const seen = new Set<string>()
    const normalized: FigureEventAreaCell[] = []

    for (const cell of cells) {
        const x = Math.trunc(cell.x)
        const y = Math.trunc(cell.y)

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            continue
        }

        const key = areaCellKey(x, y)

        if (seen.has(key)) {
            continue
        }

        seen.add(key)
        normalized.push({ x, y })
    }

    return normalized.sort((left, right) => {
        if (left.y !== right.y) {
            return left.y - right.y
        }

        return left.x - right.x
    })
}

export function migrateLegacyFigureAreaCells(
    halfWidth?: number,
    halfHeight?: number,
): FigureEventAreaCell[] {
    const width = Math.max(0, Math.trunc(halfWidth ?? 0))
    const height = Math.max(0, Math.trunc(halfHeight ?? 0))
    const cells: FigureEventAreaCell[] = []

    for (let x = -width; x <= width; x += 1) {
        for (let y = -height; y <= height; y += 1) {
            cells.push({ x, y })
        }
    }

    return normalizeFigureAreaCells(cells)
}

export function hasFigureAreaCell(cells: FigureEventAreaCell[], x: number, y: number): boolean {
    const key = areaCellKey(x, y)

    return cells.some(cell => areaCellKey(cell.x, cell.y) === key)
}

export function getFarthestFigureAreaOffset(cells: FigureEventAreaCell[]): number {
    let farthest = 0

    for (const cell of cells) {
        farthest = Math.max(farthest, Math.abs(Math.trunc(cell.x)), Math.abs(Math.trunc(cell.y)))
    }

    return farthest
}
