export interface CellCoord {
    i: number
    j: number
}

export function coordKey(coord: CellCoord): string {
    return `${coord.i},${coord.j}`
}

export function parseCoordKey(key: string): CellCoord {
    const [i, j] = key.split(',').map(Number)
    return { i, j }
}

export function coordsEqual(a: CellCoord, b: CellCoord): boolean {
    return a.i === b.i && a.j === b.j
}

export function isCoordInGrid(coord: CellCoord, n: number, m: number): boolean {
    return coord.i >= 0 && coord.j >= 0 && coord.i < n && coord.j < m
}

export function coordToIndex(coord: CellCoord, n: number): number {
    return coord.j * n + coord.i
}

export function indexToCoord(index: number, n: number): CellCoord {
    return {
        i: index % n,
        j: Math.floor(index / n),
    }
}

export function iterGridCoords(n: number, m: number): CellCoord[] {
    const coords: CellCoord[] = []
    for (let j = 0; j < m; j++) {
        for (let i = 0; i < n; i++) {
            coords.push({ i, j })
        }
    }
    return coords
}
