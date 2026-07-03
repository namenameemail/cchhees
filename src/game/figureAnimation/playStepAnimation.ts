import { BoardParameters } from '../types/boardParameters'
import { FigureId } from '../types/figures'
import { FiguresSlice } from '../state/slices'
import {
    coordToPixelCenter,
    diffFigureBoard,
    isFigureBoardDiffEmpty,
} from './diffFigureBoard'
import { ResolvedFigureAnimationSettings } from './resolveFigureAnimationSettings'

export interface FigureOverlayAnimItem {
    id: string
    kind: 'move' | 'remove'
    instanceId: string
    figureId: FigureId
    stateIndex: number
    fromX: number
    fromY: number
    toX: number
    toY: number
    /** длительность фазы перемещения (transform) */
    transformDurationMs: number
    /** длительность фазы затухания (opacity) */
    opacityDurationMs: number
    /** задержка перед началом затухания — для двухфазного «улёт за край, затем fade» */
    opacityDelayMs: number
}

export interface FigureBoardAnimationState {
    overlayItems: FigureOverlayAnimItem[]
    hiddenInstanceIds: ReadonlySet<string>
}

const EMPTY_ANIMATION_STATE: FigureBoardAnimationState = {
    overlayItems: [],
    hiddenInstanceIds: new Set(),
}

export type ExitHints = Record<string, { dx: number; dy: number }>

export function buildFigureBoardAnimationState(
    prev: FiguresSlice,
    next: FiguresSlice,
    boardParameters: BoardParameters,
    settings: ResolvedFigureAnimationSettings,
    exitHints?: ExitHints,
): FigureBoardAnimationState {
    const diff = diffFigureBoard(prev, next)

    if (isFigureBoardDiffEmpty(diff)) {
        return EMPTY_ANIMATION_STATE
    }

    const hiddenInstanceIds = new Set<string>()
    const overlayItems: FigureOverlayAnimItem[] = []

    for (const move of diff.moves) {
        if (settings.moveDurationMs <= 0) {
            continue
        }

        hiddenInstanceIds.add(move.instanceId)
        const from = coordToPixelCenter(move.fromCoord, boardParameters)
        const to = coordToPixelCenter(move.toCoord, boardParameters)

        overlayItems.push({
            id: `move:${move.instanceId}`,
            kind: 'move',
            instanceId: move.instanceId,
            figureId: move.placement.figureId,
            stateIndex: move.placement.stateIndex ?? 0,
            fromX: from.x,
            fromY: from.y,
            toX: to.x,
            toY: to.y,
            transformDurationMs: settings.moveDurationMs,
            opacityDurationMs: 0,
            opacityDelayMs: 0,
        })
    }

    for (const remove of diff.removes) {
        if (settings.fadeDurationMs <= 0) {
            continue
        }

        hiddenInstanceIds.add(remove.instanceId)
        const from = coordToPixelCenter(remove.fromCoord, boardParameters)
        const hint = exitHints?.[remove.instanceId]

        if (hint && settings.moveDurationMs > 0) {
            const exitCoord = {
                i: remove.fromCoord.i + Math.sign(hint.dx),
                j: remove.fromCoord.j + Math.sign(hint.dy),
            }
            const to = coordToPixelCenter(exitCoord, boardParameters)

            overlayItems.push({
                id: `remove:${remove.instanceId}`,
                kind: 'remove',
                instanceId: remove.instanceId,
                figureId: remove.placement.figureId,
                stateIndex: remove.placement.stateIndex ?? 0,
                fromX: from.x,
                fromY: from.y,
                toX: to.x,
                toY: to.y,
                transformDurationMs: settings.moveDurationMs,
                opacityDurationMs: settings.fadeDurationMs,
                opacityDelayMs: settings.moveDurationMs,
            })
            continue
        }

        overlayItems.push({
            id: `remove:${remove.instanceId}`,
            kind: 'remove',
            instanceId: remove.instanceId,
            figureId: remove.placement.figureId,
            stateIndex: remove.placement.stateIndex ?? 0,
            fromX: from.x,
            fromY: from.y,
            toX: from.x,
            toY: from.y,
            transformDurationMs: 0,
            opacityDurationMs: settings.fadeDurationMs,
            opacityDelayMs: 0,
        })
    }

    return {
        overlayItems,
        hiddenInstanceIds,
    }
}

export function getStepAnimationDurationMs(
    animationState: FigureBoardAnimationState,
): number {
    if (animationState.overlayItems.length === 0) {
        return 0
    }

    return animationState.overlayItems.reduce((max, item) => {
        const duration = item.kind === 'move'
            ? item.transformDurationMs
            : Math.max(item.transformDurationMs, item.opacityDelayMs + item.opacityDurationMs)

        return Math.max(max, duration)
    }, 0)
}

export async function playStepAnimation(
    prev: FiguresSlice,
    next: FiguresSlice,
    boardParameters: BoardParameters,
    settings: ResolvedFigureAnimationSettings,
    setAnimationState: (state: FigureBoardAnimationState) => void,
    waitForCompletion: (durationMs: number) => Promise<void>,
    exitHints?: ExitHints,
): Promise<void> {
    const animationState = buildFigureBoardAnimationState(
        prev,
        next,
        boardParameters,
        settings,
        exitHints,
    )

    const durationMs = getStepAnimationDurationMs(animationState)

    if (durationMs <= 0) {
        setAnimationState(EMPTY_ANIMATION_STATE)
        return
    }

    setAnimationState(animationState)
    await waitForCompletion(durationMs)
    setAnimationState(EMPTY_ANIMATION_STATE)
}

export function createEmptyFigureBoardAnimationState(): FigureBoardAnimationState {
    return {
        overlayItems: [],
        hiddenInstanceIds: new Set(),
    }
}
