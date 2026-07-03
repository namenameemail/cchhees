import { FigureEventConditionType } from '../../types/events'

/** Sync with docs/figure-events-contract.md */
export type ConditionContext = 'move' | 'event'

export type ConditionContextScope = ConditionContext | 'both'

export const CONDITION_CONTEXTS: Record<FigureEventConditionType, ConditionContextScope> = {
    [FigureEventConditionType.inBoardArea]: 'both',
    [FigureEventConditionType.inFigureArea]: 'both',
    [FigureEventConditionType.movedBy]: 'both',
    [FigureEventConditionType.isFigure]: 'both',
    [FigureEventConditionType.isNotFigure]: 'both',
    [FigureEventConditionType.exitedBoard]: 'both',
    [FigureEventConditionType.hoppedOverFigures]: 'both',
    [FigureEventConditionType.hasFigureInArea]: 'both',
}

export function getConditionTypesForContext(context: ConditionContext): FigureEventConditionType[] {
    return Object.values(FigureEventConditionType).filter(type => {
        const scope = CONDITION_CONTEXTS[type]
        return scope === 'both' || scope === context
    })
}

export function isConditionTypeAllowedInContext(
    type: FigureEventConditionType,
    context: ConditionContext,
): boolean {
    const scope = CONDITION_CONTEXTS[type]
    return scope === 'both' || scope === context
}
