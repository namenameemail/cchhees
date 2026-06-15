import { BoardParameters } from './types/boardParameters'
import {
    BoardMarkAppearance,
    BoardMarkFill,
    BoardMarkFillType,
    BoardMarkGradientStop,
    BoardMarkKind,
    BoardMarkLayer,
    BoardMarkOverlay,
    BoardMarksSettings,
    BoardMarkStroke,
} from './types/boardMarks'
import { resolveColorValue, resolveColorValueOrDefault } from './resolveColorValue'
import React from 'react'

export interface ResolvedBoardMarks {
    selection: BoardMarkAppearance
    legalMove: BoardMarkAppearance
    cursor: BoardMarkAppearance
}

export interface BoardMarkPaintStyle {
    fill: string
    stroke: string
    strokeWidth: number
    strokeDasharray?: string
    mixBlendMode: string
}

const DEFAULT_SELECTION_STOPS: BoardMarkGradientStop[] = [
    { offset: 5, color: '#ff00FF99' },
    { offset: 95, color: '#ff000000' },
]

const DEFAULT_LEGAL_MOVE_STOPS: BoardMarkGradientStop[] = [
    { offset: 5, color: '#00aa4455' },
    { offset: 95, color: '#00aa4400' },
]

function normalizeStop(stop?: BoardMarkGradientStop): BoardMarkGradientStop | null {
    if (!stop?.color?.trim()) {
        return null
    }

    const offset = Number.isFinite(stop.offset)
        ? Math.min(100, Math.max(0, stop.offset))
        : 0

    return {
        offset,
        color: stop.color.trim(),
    }
}

function normalizeStops(stops?: BoardMarkGradientStop[], fallback?: BoardMarkGradientStop[]): BoardMarkGradientStop[] {
    const normalized = (stops ?? [])
        .map(normalizeStop)
        .filter((stop): stop is BoardMarkGradientStop => stop != null)

    if (normalized.length > 0) {
        return normalized
    }

    return fallback ? [...fallback] : []
}

function normalizePercent(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback
    }

    return Math.min(100, Math.max(0, value!))
}

function normalizeFill(
    fill: BoardMarkFill | undefined,
    defaults: BoardMarkFill,
): BoardMarkFill {
    const type: BoardMarkFillType = fill?.type ?? defaults.type

    if (type === 'none') {
        return { type: 'none' }
    }

    if (type === 'solid') {
        return {
            type: 'solid',
            color: resolveColorValueOrDefault(fill?.color, defaults.color ?? 'transparent'),
        }
    }

    if (type === 'linear') {
        return {
            type: 'linear',
            stops: normalizeStops(fill?.stops, defaults.stops),
            linearX1: normalizePercent(fill?.linearX1, defaults.linearX1 ?? 0),
            linearY1: normalizePercent(fill?.linearY1, defaults.linearY1 ?? 0),
            linearX2: normalizePercent(fill?.linearX2, defaults.linearX2 ?? 0),
            linearY2: normalizePercent(fill?.linearY2, defaults.linearY2 ?? 100),
        }
    }

    return {
        type: 'radial',
        stops: normalizeStops(fill?.stops, defaults.stops),
        radialCx: normalizePercent(fill?.radialCx, defaults.radialCx ?? 50),
        radialCy: normalizePercent(fill?.radialCy, defaults.radialCy ?? 50),
        radialR: normalizePercent(fill?.radialR, defaults.radialR ?? 50),
    }
}

function normalizeStroke(
    stroke: BoardMarkStroke | undefined,
    defaults: BoardMarkStroke,
): BoardMarkStroke {
    const normalized: BoardMarkStroke = {}

    const color = stroke?.color ?? defaults.color
    if (color != null && color.trim() !== '') {
        normalized.color = color.trim()
    }

    const width = stroke?.width ?? defaults.width
    if (width != null && Number.isFinite(width)) {
        normalized.width = Math.max(0, width)
    }

    const dasharray = stroke?.dasharray ?? defaults.dasharray
    if (dasharray != null && dasharray.trim() !== '') {
        normalized.dasharray = dasharray.trim()
    }

    return normalized
}

function normalizeOverlay(
    overlay: BoardMarkOverlay | undefined,
    defaults: BoardMarkOverlay,
): BoardMarkOverlay {
    return {
        fill: normalizeFill(overlay?.fill, defaults.fill ?? { type: 'none' }),
        stroke: normalizeStroke(overlay?.stroke, defaults.stroke ?? {}),
        mixBlendMode: overlay?.mixBlendMode ?? defaults.mixBlendMode ?? 'normal',
    }
}

function normalizeAppearance(
    appearance: BoardMarkAppearance | undefined,
    defaults: BoardMarkAppearance,
): BoardMarkAppearance {
    const normalized: BoardMarkAppearance = {
        fill: normalizeFill(appearance?.fill, defaults.fill),
        stroke: normalizeStroke(appearance?.stroke, defaults.stroke),
        layer: appearance?.layer ?? defaults.layer,
        mixBlendMode: appearance?.mixBlendMode ?? defaults.mixBlendMode,
    }

    if (defaults.overlay != null) {
        normalized.overlay = normalizeOverlay(appearance?.overlay, defaults.overlay)
    } else if (appearance?.overlay != null) {
        normalized.overlay = normalizeOverlay(appearance.overlay, {
            fill: { type: 'none' },
            stroke: {},
            mixBlendMode: 'normal',
        })
    }

    return normalized
}

export const DEFAULT_BOARD_MARKS: BoardMarksSettings = {
    selection: {
        fill: {
            type: 'radial',
            stops: [...DEFAULT_SELECTION_STOPS],
            radialCx: 50,
            radialCy: 50,
            radialR: 50,
        },
        stroke: {
            width: 0,
        },
        layer: 'aboveFigures',
        mixBlendMode: 'darken',
        overlay: {
            fill: { type: 'none' },
            stroke: {
                color: 'white',
                width: 1.5,
            },
            mixBlendMode: 'lighten',
        },
    },
    legalMove: {
        fill: {
            type: 'radial',
            stops: [...DEFAULT_LEGAL_MOVE_STOPS],
            radialCx: 50,
            radialCy: 50,
            radialR: 50,
        },
        stroke: {
            width: 0,
        },
        layer: 'aboveFigures',
        mixBlendMode: 'darken',
    },
    cursor: {
        fill: {
            type: 'none',
        },
        stroke: {
            color: 'grey',
            width: 1,
            dasharray: '4 1',
        },
        layer: 'aboveFigures',
        mixBlendMode: 'darken',
    },
}

export function resolveBoardMarks(boardParameters?: BoardParameters): ResolvedBoardMarks {
    const marks = boardParameters?.boardMarks

    return {
        selection: normalizeAppearance(marks?.selection, DEFAULT_BOARD_MARKS.selection),
        legalMove: normalizeAppearance(marks?.legalMove, DEFAULT_BOARD_MARKS.legalMove),
        cursor: normalizeAppearance(marks?.cursor, DEFAULT_BOARD_MARKS.cursor),
    }
}

export function resolveBoardMark(
    boardParameters: BoardParameters | undefined,
    kind: BoardMarkKind,
): BoardMarkAppearance {
    return resolveBoardMarks(boardParameters)[kind]
}

function percent(value: number): string {
    return `${value}%`
}

export function buildMarkGradientDef(
    fill: BoardMarkFill,
    gradientId: string,
): React.ReactNode | null {
    if (fill.type === 'linear') {
        const stops = normalizeStops(fill.stops)

        if (stops.length === 0) {
            return null
        }

        return React.createElement(
            'linearGradient',
            {
                id: gradientId,
                x1: percent(fill.linearX1 ?? 0),
                y1: percent(fill.linearY1 ?? 0),
                x2: percent(fill.linearX2 ?? 0),
                y2: percent(fill.linearY2 ?? 100),
            },
            stops.map((stop, index) => React.createElement('stop', {
                key: index,
                offset: `${stop.offset}%`,
                stopColor: resolveColorValue(stop.color),
            })),
        )
    }

    if (fill.type === 'radial') {
        const stops = normalizeStops(fill.stops)

        if (stops.length === 0) {
            return null
        }

        return React.createElement(
            'radialGradient',
            {
                id: gradientId,
                cx: percent(fill.radialCx ?? 50),
                cy: percent(fill.radialCy ?? 50),
                r: percent(fill.radialR ?? 50),
            },
            stops.map((stop, index) => React.createElement('stop', {
                key: index,
                offset: `${stop.offset}%`,
                stopColor: resolveColorValue(stop.color),
            })),
        )
    }

    return null
}

export function getOverlayPaintStyle(
    overlay: BoardMarkOverlay,
    gradientId?: string,
): BoardMarkPaintStyle {
    return getMarkPaintStyle({
        fill: overlay.fill ?? { type: 'none' },
        stroke: overlay.stroke ?? {},
        layer: 'aboveFigures',
        mixBlendMode: overlay.mixBlendMode ?? 'normal',
    }, gradientId)
}

export function isOverlayVisible(paint: BoardMarkPaintStyle): boolean {
    const hasFill = paint.fill !== 'transparent'
    const hasStroke = paint.stroke !== 'none' && paint.strokeWidth > 0

    return hasFill || hasStroke
}

export function getMarkPaintStyle(
    appearance: BoardMarkAppearance,
    gradientId?: string,
): BoardMarkPaintStyle {
    const { fill, stroke, mixBlendMode } = appearance

    let fillValue = 'transparent'

    if (fill.type === 'solid') {
        fillValue = resolveColorValue(fill.color)
    } else if ((fill.type === 'linear' || fill.type === 'radial') && gradientId) {
        fillValue = `url(#${gradientId})`
    }

    const strokeWidth = stroke.width ?? 0
    const strokeColor = stroke.color != null && stroke.color.trim() !== ''
        ? resolveColorValue(stroke.color)
        : 'none'

    return {
        fill: fillValue,
        stroke: strokeWidth > 0 ? strokeColor : 'none',
        strokeWidth,
        strokeDasharray: stroke.dasharray || undefined,
        mixBlendMode,
    }
}

export function isMarkLayer(
    appearance: BoardMarkAppearance,
    layer: BoardMarkLayer,
): boolean {
    return appearance.layer === layer
}
