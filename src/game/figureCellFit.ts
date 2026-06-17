import { RefObject, useEffect, useState } from 'react'

export const FIGURE_STRIP_CELL_MAX = 72

export function resolveStripCellPixelSize(
    cellXDistance: number,
    cellYDistance: number,
    maxSize = FIGURE_STRIP_CELL_MAX,
): { width: number; height: number } {
    if (cellXDistance <= 0 || cellYDistance <= 0 || maxSize <= 0) {
        return { width: 0, height: 0 }
    }

    const aspect = cellXDistance / cellYDistance
    let height = Math.min(cellYDistance, maxSize)
    let width = height * aspect

    if (width > maxSize) {
        width = maxSize
        height = width / aspect
    }

    return {
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height)),
    }
}

export function fitBoardCellPixelSize(
    containerWidth: number,
    containerHeight: number,
    cellXDistance: number,
    cellYDistance: number,
): { width: number; height: number } {
    if (
        containerWidth <= 0
        || containerHeight <= 0
        || cellXDistance <= 0
        || cellYDistance <= 0
    ) {
        return { width: 0, height: 0 }
    }

    const cellAspect = cellXDistance / cellYDistance
    const containerAspect = containerWidth / containerHeight

    if (containerAspect >= cellAspect) {
        const height = containerHeight
        const width = height * cellAspect
        return {
            width: Math.max(1, Math.floor(width)),
            height: Math.max(1, Math.floor(height)),
        }
    }

    const width = containerWidth
    const height = width / cellAspect

    return {
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height)),
    }
}

export function useObservedBoardCellSize(
    ref: RefObject<HTMLElement | null>,
    cellXDistance: number,
    cellYDistance: number,
): { width: number; height: number } {
    const [size, setSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const element = ref.current

        if (!element) {
            return
        }

        const update = () => {
            setSize(fitBoardCellPixelSize(
                element.clientWidth,
                element.clientHeight,
                cellXDistance,
                cellYDistance,
            ))
        }

        update()

        const observer = new ResizeObserver(update)
        observer.observe(element)

        return () => observer.disconnect()
    }, [ref, cellXDistance, cellYDistance])

    return size
}
