import { CellCoord } from '../types/coords'
import { getFigureActionsDebugEvents } from '../figureActionsDebugLog'
import { getFigureEventRulesDebugEvents } from '../figureEventRulesDebugLog'
import { getGameMovesDebugEvents } from '../gameMovesDebugLog'
import type { FigureMoveDebugInfo } from './figureMoveDebugInfo'

export type MoveDebugChainChannel = 'moves' | 'events' | 'actions'

export interface MoveDebugChainStep {
    channel: MoveDebugChainChannel
    at: number
    summary: string
    detail?: unknown
}

export interface MoveDebugMoveInfo {
    from: CellCoord
    to: CellCoord
    actorFigure?: FigureMoveDebugInfo
    targetFigure?: FigureMoveDebugInfo
}

let chainStartAt = 0

export function beginMoveDebugChain(): void {
    chainStartAt = Date.now()
}

function formatMoveSummary(text: string, moveSeq: number, nested: boolean): string {
    const prefix = nested ? `  #${moveSeq} ` : `#${moveSeq} `
    return `${prefix}${text}`
}

function formatEventSummary(event: ReturnType<typeof getFigureEventRulesDebugEvents>[number]): string {
    const parts = [event.action]

    if (event.figureId) {
        parts.push(`figure=${event.figureId}`)
    }

    if (event.ruleId) {
        parts.push(`rule=${event.ruleId.slice(0, 8)}`)
    }

    return parts.join(' ')
}

function formatActionSummary(event: ReturnType<typeof getFigureActionsDebugEvents>[number]): string {
    const parts = [event.action]

    if (event.context) {
        parts.push(`ctx=${event.context}`)
    }

    if (event.subject) {
        parts.push(`subject=${event.subject}`)
    }

    if (event.result) {
        parts.push(`result=${event.result}`)
    }

    if (event.reason) {
        parts.push(`reason=${event.reason}`)
    }

    return parts.join(' ')
}

export function collectMoveDebugChain(): MoveDebugChainStep[] {
    const steps: MoveDebugChainStep[] = []

    for (const event of getGameMovesDebugEvents()) {
        if (event.at < chainStartAt) {
            continue
        }

        steps.push({
            channel: 'moves',
            at: event.at,
            summary: formatMoveSummary(event.text, event.moveSeq, event.nested),
            detail: event.data,
        })
    }

    for (const event of getFigureEventRulesDebugEvents()) {
        if (event.at < chainStartAt) {
            continue
        }

        steps.push({
            channel: 'events',
            at: event.at,
            summary: formatEventSummary(event),
            detail: {
                figureId: event.figureId,
                ruleId: event.ruleId,
                ruleIndex: event.ruleIndex,
                before: event.before,
                after: event.after,
                ...event.detail,
            },
        })
    }

    for (const event of getFigureActionsDebugEvents()) {
        if (event.at < chainStartAt) {
            continue
        }

        steps.push({
            channel: 'actions',
            at: event.at,
            summary: formatActionSummary(event),
            detail: {
                context: event.context,
                subject: event.subject,
                gameAction: event.gameAction,
                result: event.result,
                reason: event.reason,
                ...event.detail,
            },
        })
    }

    steps.sort((a, b) => a.at - b.at || a.channel.localeCompare(b.channel))

    return steps
}
