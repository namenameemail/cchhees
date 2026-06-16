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
    moveDurationMs: number
    fadeDurationMs: number
}

export interface FigureBoardAnimationState {
    overlayItems: FigureOverlayAnimItem[]
    hiddenInstanceIds: ReadonlySet<string>
}

const EMPTY_ANIMATION_STATE: FigureBoardAnimationState = {
    overlayItems: [],
    hiddenInstanceIds: new Set(),
}

export function buildFigureBoardAnimationState(
    prev: FiguresSlice,
    next: FiguresSlice,
    boardParameters: BoardParameters,
    settings: ResolvedFigureAnimationSettings,
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
            moveDurationMs: settings.moveDurationMs,
            fadeDurationMs: settings.fadeDurationMs,
        })
    }

    for (const remove of diff.removes) {
        if (settings.fadeDurationMs <= 0) {
            continue
        }

        const from = coordToPixelCenter(remove.fromCoord, boardParameters)

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
            moveDurationMs: settings.moveDurationMs,
            fadeDurationMs: settings.fadeDurationMs,
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
            ? item.moveDurationMs
            : item.fadeDurationMs

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
): Promise<void> {
    const animationState = buildFigureBoardAnimationState(
        prev,
        next,
        boardParameters,
        settings,
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
