import { useEffect, useState } from 'react'
import {
    BoardBackgroundImageFit,
} from './types/boardParameters'
import { BoardParameters } from './types/boardParameters'
import { resolveColorValue, resolveColorValueOrDefault } from './resolveColorValue'

export interface BoardAppearance {
    background: string
    backgroundAssetId: number | null
    backgroundImageFit: BoardBackgroundImageFit
    backgroundRepeatWidth?: number
    backgroundRepeatHeight?: number
    backgroundRepeatOffsetX?: number
    backgroundRepeatOffsetY?: number
    borderRadius: number
    borderWidth: number
    borderColor: string
    borderDasharray?: string
}

export const DEFAULT_BOARD_APPEARANCE: BoardAppearance = {
    background: 'white',
    backgroundAssetId: null,
    backgroundImageFit: BoardBackgroundImageFit.tile,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'black',
}

export function resolveBoardAppearance(parameters: BoardParameters): BoardAppearance {
    return {
        background: resolveColorValueOrDefault(
            parameters.background,
            DEFAULT_BOARD_APPEARANCE.background,
        ),
        backgroundAssetId: parameters.backgroundAssetId ?? DEFAULT_BOARD_APPEARANCE.backgroundAssetId,
        backgroundImageFit: parameters.backgroundImageFit ?? DEFAULT_BOARD_APPEARANCE.backgroundImageFit,
        backgroundRepeatWidth: parameters.backgroundRepeatWidth,
        backgroundRepeatHeight: parameters.backgroundRepeatHeight,
        backgroundRepeatOffsetX: parameters.backgroundRepeatOffsetX,
        backgroundRepeatOffsetY: parameters.backgroundRepeatOffsetY,
        borderRadius: parameters.borderRadius ?? DEFAULT_BOARD_APPEARANCE.borderRadius,
        borderWidth: parameters.borderWidth ?? DEFAULT_BOARD_APPEARANCE.borderWidth,
        borderColor: resolveColorValueOrDefault(
            parameters.borderColor,
            DEFAULT_BOARD_APPEARANCE.borderColor,
        ),
        borderDasharray: parameters.borderDasharray,
    }
}

export function getBoardBackgroundRect(
    width: number,
    height: number,
    appearance: BoardAppearance,
): {
    x: number
    y: number
    width: number
    height: number
    rx: number
    ry: number
    fill: string
    stroke: string
    strokeWidth: number
    strokeDasharray?: string
} {
    const halfStroke = appearance.borderWidth / 2

    return {
        x: halfStroke,
        y: halfStroke,
        width: Math.max(0, width - appearance.borderWidth),
        height: Math.max(0, height - appearance.borderWidth),
        rx: Math.max(0, appearance.borderRadius - halfStroke),
        ry: Math.max(0, appearance.borderRadius - halfStroke),
        fill: appearance.background,
        stroke: appearance.borderWidth > 0 ? appearance.borderColor : 'none',
        strokeWidth: appearance.borderWidth,
        strokeDasharray: appearance.borderDasharray || undefined,
    }
}

export interface BoardBackgroundImageRepeat {
    width?: number
    height?: number
    offsetX?: number
    offsetY?: number
}

export type BoardBackgroundImageLayout =
    | {
        mode: 'pattern'
        patternWidth: number
        patternHeight: number
        offsetX: number
        offsetY: number
        imageWidth: number
        imageHeight: number
    }
    | {
        mode: 'single'
        x: number
        y: number
        width: number
        height: number
    }

function safeDim(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 1
}

export function getBoardBackgroundImageLayout(
    boardWidth: number,
    boardHeight: number,
    imageWidth: number,
    imageHeight: number,
    fit: BoardBackgroundImageFit,
    repeat?: BoardBackgroundImageRepeat,
): BoardBackgroundImageLayout {
    const imageW = safeDim(imageWidth)
    const imageH = safeDim(imageHeight)
    const boardW = Math.max(0, boardWidth)
    const boardH = Math.max(0, boardHeight)

    switch (fit) {
        case BoardBackgroundImageFit.tile:
            return {
                mode: 'pattern',
                patternWidth: imageW,
                patternHeight: imageH,
                offsetX: 0,
                offsetY: 0,
                imageWidth: imageW,
                imageHeight: imageH,
            }
        case BoardBackgroundImageFit.repeat:
            return {
                mode: 'pattern',
                patternWidth: safeDim(repeat?.width ?? imageW),
                patternHeight: safeDim(repeat?.height ?? imageH),
                offsetX: repeat?.offsetX ?? 0,
                offsetY: repeat?.offsetY ?? 0,
                imageWidth: safeDim(repeat?.width ?? imageW),
                imageHeight: safeDim(repeat?.height ?? imageH),
            }
        case BoardBackgroundImageFit.center:
            return {
                mode: 'single',
                x: (boardW - imageW) / 2,
                y: (boardH - imageH) / 2,
                width: imageW,
                height: imageH,
            }
        case BoardBackgroundImageFit.fitWidth: {
            const height = imageH * (boardW / imageW)

            return {
                mode: 'single',
                x: 0,
                y: (boardH - height) / 2,
                width: boardW,
                height,
            }
        }
        case BoardBackgroundImageFit.fitHeight: {
            const width = imageW * (boardH / imageH)

            return {
                mode: 'single',
                x: (boardW - width) / 2,
                y: 0,
                width,
                height: boardH,
            }
        }
    }
}

export function useAssetImageSize(url: string | undefined): { width: number; height: number } | null {
    const [size, setSize] = useState<{ width: number; height: number } | null>(null)

    useEffect(() => {
        if (!url) {
            setSize(null)
            return
        }

        let cancelled = false
        const image = new Image()

        image.onload = () => {
            if (!cancelled) {
                setSize({
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                })
            }
        }

        image.onerror = () => {
            if (!cancelled) {
                setSize(null)
            }
        }

        image.src = url

        return () => {
            cancelled = true
        }
    }, [url])

    return size
}
