import { profiler, profileDebug, isProfilerPanelChannel } from '../profiler'
import { CellCoord } from './types/coords'
import {
    DisplaceFigureActionParams,
    GameAction,
    GameActionType,
    FigureEventType,
    SetOtherStateActionParams,
    SetSelfStateActionParams,
    SpawnFigureActionParams,
} from './types/events'
import { FigurePlacement } from './types/figures'
import { resolvePlacementStateIndex } from './figureView'

const MAX_CONSOLE_LINES = 200
const MAX_MOVE_EVENTS = 200
const CONSOLE_PREFIX = '[moves] '

let moveSeq = 0

export type GameMovesDebugEvent = {
    at: number
    moveSeq: number
    text: string
    nested: boolean
    data?: Record<string, unknown>
}

const moveEvents: GameMovesDebugEvent[] = []

function enabled(): boolean {
    return import.meta.env.DEV
}

function formatCoord(coord: CellCoord | undefined): string {
    if (!coord) {
        return '—'
    }

    return `(${coord.i},${coord.j})`
}

function formatPlacement(placement: FigurePlacement | undefined): string {
    if (!placement) {
        return '—'
    }

    const shortId = placement.instanceId.slice(0, 8)

    return `${placement.figureId}#${resolvePlacementStateIndex(placement)}@${shortId}`
}

function formatAction(action: GameAction): string {
    switch (action.type) {
        case GameActionType.spawnFigure: {
            const params = action.params as SpawnFigureActionParams
            return `spawnFigure ${params.figureId}@${params.x},${params.y}#${params.stateIndex ?? 0}`
        }
        case GameActionType.setSelfState: {
            const params = action.params as SetSelfStateActionParams
            return `setSelfState → ${params.stateIndex}`
        }
        case GameActionType.setOtherState: {
            const params = action.params as SetOtherStateActionParams
            return `setOtherState ${params.target} → ${params.stateIndex}`
        }
        case GameActionType.moveToTray:
            return 'moveToTray'
        case GameActionType.displaceFigure: {
            const params = action.params as DisplaceFigureActionParams
            return `displaceFigure Δ(${params.dx},${params.dy})`
        }
        default:
            return String(action.type)
    }
}

function formatActions(actions: GameAction[]): string {
    if (actions.length === 0) {
        return '—'
    }

    return actions.map(formatAction).join('; ')
}

function trimConsoleLines(): void {
    const lines = profiler.getPanelLines('console')
    const moveLines = lines.filter(line => line.startsWith(CONSOLE_PREFIX))

    if (moveLines.length <= MAX_CONSOLE_LINES) {
        return
    }

    const otherLines = lines.filter(line => !line.startsWith(CONSOLE_PREFIX))
    profiler.setPanelText('console', [...otherLines, ...moveLines.slice(-MAX_CONSOLE_LINES)].join('\n'))
}

function append(text: string, meta?: Record<string, unknown>, nested = false): void {
    if (!enabled()) {
        return
    }

    const time = new Date().toLocaleTimeString(undefined, {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions)

    const prefix = nested ? `  #${moveSeq} ` : `#${moveSeq} `
    const line = `${CONSOLE_PREFIX}${time}  ${prefix}${text}`

    moveEvents.push({
        at: Date.now(),
        moveSeq,
        text,
        nested,
        data: meta,
    })

    if (moveEvents.length > MAX_MOVE_EVENTS) {
        moveEvents.splice(0, moveEvents.length - MAX_MOVE_EVENTS)
    }

    console.log(line)

    if (isProfilerPanelChannel('moves')) {
        profiler.appendPanelText('console', line)
        trimConsoleLines()
    }
    profileDebug('moves', text.slice(0, 160), { moveSeq, ...meta })

    if (profiler.isRecording) {
        profiler.log(`moves ${prefix}${text}`, { moveSeq, ...meta })
        profiler.flushLatest('moves')
    }
}

export const gameMovesDebugLog = {
    moveStart(input: {
        from: CellCoord
        to: CellCoord
        actor: FigurePlacement
        target?: FigurePlacement
        swapOnEat: boolean
    }): void {
        if (!enabled()) {
            return
        }

        moveSeq += 1

        const targetPart = input.target
            ? ` steppedOn=${formatPlacement(input.target)}`
            : ''
        const swapPart = input.swapOnEat ? ' swap' : ''

        append(
            `MOVE ${formatPlacement(input.actor)} ${formatCoord(input.from)}→${formatCoord(input.to)}${targetPart}${swapPart}`,
            {
                kind: 'move',
                from: input.from,
                to: input.to,
                actor: input.actor,
                target: input.target,
                swapOnEat: input.swapOnEat,
            },
        )
    },

    steppedOnQueue(input: {
        stepper: FigurePlacement
        stepperCoord: CellCoord
        target: FigurePlacement
        targetCoord: CellCoord
        cause: 'manual' | 'displacement'
    }): void {
        append(
            `QUEUE steppedOn stepper=${formatPlacement(input.stepper)}@${formatCoord(input.stepperCoord)} `
            + `target=${formatPlacement(input.target)}@${formatCoord(input.targetCoord)} cause=${input.cause}`,
            { kind: 'queue-steppedOn', ...input },
            true,
        )
    },

    leaveBoardQueue(input: {
        placement: FigurePlacement
        fromCoord: CellCoord
        displaceParams?: DisplaceFigureActionParams
    }): void {
        const displacePart = input.displaceParams
            ? ` ${formatAction({ type: GameActionType.displaceFigure, params: input.displaceParams })}`
            : ''

        append(
            `QUEUE leaveBoard ${formatPlacement(input.placement)}@${formatCoord(input.fromCoord)}${displacePart}`,
            { kind: 'queue-leaveBoard', ...input },
            true,
        )
    },

    placeQueue(input: {
        placement: FigurePlacement
        coord: CellCoord
    }): void {
        append(
            `QUEUE place ${formatPlacement(input.placement)}@${formatCoord(input.coord)}`,
            { kind: 'queue-place', ...input },
            true,
        )
    },

    eventMatched(input: {
        eventType: string
        ownerFigureId: string
        ruleId: string
        actions: GameAction[]
        fallback?: boolean
        context?: string
    }): void {
        const fallbackPart = input.fallback ? ' (fallback)' : ''
        const contextPart = input.context ? ` · ${input.context}` : ''

        append(
            `EVENT ${input.eventType} owner=${input.ownerFigureId} rule=${input.ruleId.slice(0, 8)}${fallbackPart}${contextPart}`
            + ` → ${formatActions(input.actions)}`,
            { kind: 'event', ...input },
            true,
        )
    },

    actionApplied(input: {
        action: GameAction
        subject?: string
    }): void {
        const subjectPart = input.subject ? ` · ${input.subject}` : ''

        append(
            `ACTION ${formatAction(input.action)}${subjectPart}`,
            { kind: 'action', action: input.action, subject: input.subject },
            true,
        )
    },

    displace(input: {
        placement: FigurePlacement
        from: CellCoord
        to: CellCoord
        params: DisplaceFigureActionParams
        wrapped?: boolean
        blocked?: boolean
        offBoard?: boolean
        ownerFigureId?: string
        eventType?: FigureEventType
    }): void {
        const modePart = input.wrapped ? ' wrap' : ''
        const blockedPart = input.blocked ? ' blocked→queue' : ''
        const offBoardPart = input.offBoard ? ' off-board' : ''
        const toPart = input.offBoard ? '→off-board' : `→${formatCoord(input.to)}`

        append(
            `DISPLACE ${formatPlacement(input.placement)} ${formatCoord(input.from)}${toPart} `
            + `Δ(${input.params.dx},${input.params.dy})${modePart}${blockedPart}${offBoardPart}`,
            { kind: 'displace', ...input },
            true,
        )
    },

    figureEvent(input: {
        eventType: string
        ownerFigureId: string
        ruleId: string
        actions: GameAction[]
        areaAnchor?: CellCoord
    }): void {
        const anchorPart = input.areaAnchor ? ` anchor=${formatCoord(input.areaAnchor)}` : ''

        append(
            `EVENT ${input.eventType} owner=${input.ownerFigureId} rule=${input.ruleId.slice(0, 8)}${anchorPart}`
            + ` → ${formatActions(input.actions)}`,
            { kind: 'figure-event', ...input },
            true,
        )
    },
}

export function getGameMovesDebugEvents(): GameMovesDebugEvent[] {
    return [...moveEvents]
}

export function getGameMovesDebugMoveSeq(): number {
    return moveSeq
}
