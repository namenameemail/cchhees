import { describe, expect, it } from 'vitest'
import {
    FIGURE_SUBJECT_MOVED,
    FIGURE_SUBJECT_STEPPED_ON,
} from '../../figureFilter'
import { createFigurePlacement } from '../../figureView'
import { coordKey } from '../../types/coords'
import {
    FigureEventType,
    GameActionType,
} from '../../types/events'
import {
    buildActionSubjectResolutionContext,
    buildSteppedOnActionSubjectContext,
    resolveActionSubject,
    resolveActionSubjects,
} from './resolveActionSubjects'

describe('resolveActionSubject', () => {
    it('defaults to moved role for onMove', () => {
        expect(resolveActionSubject(
            { type: GameActionType.displaceFigure, params: { dx: 1, dy: 0 } },
            FigureEventType.onMove,
        )).toEqual({
            entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
            matchMode: 'any',
        })
    })

    it('defaults to steppedOn role for steppedOnBy', () => {
        expect(resolveActionSubject(
            { type: GameActionType.moveToCell, params: { x: 2, y: 3 } },
            FigureEventType.steppedOnBy,
        )).toEqual({
            entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
            matchMode: 'any',
        })
    })

    it('migrates legacy setOtherState.target steppedOn', () => {
        expect(resolveActionSubject(
            {
                type: GameActionType.setOtherState,
                params: { stateIndex: 1, target: 'steppedOn' },
            },
            FigureEventType.steppedOnBy,
        )).toEqual({
            entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
            matchMode: 'any',
        })
    })

    it('migrates legacy setOtherState.target steppedBy', () => {
        expect(resolveActionSubject(
            {
                type: GameActionType.setOtherState,
                params: { stateIndex: 1, target: 'steppedBy' },
            },
            FigureEventType.steppedOnBy,
        )).toEqual({
            entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
            matchMode: 'any',
        })
    })
})

describe('resolveActionSubjects', () => {
    it('resolves moved role from move context', () => {
        const actor = createFigurePlacement('pawn')
        const ctx = buildActionSubjectResolutionContext({
            from: { i: 0, j: 0 },
            to: { i: 1, j: 1 },
            actorPlacement: actor,
            boardParameters: { n: 8, m: 8 } as never,
            catalog: [],
            eventRules: [],
            stepCause: 'manual',
            eventType: FigureEventType.onMove,
        }, { [coordKey({ i: 1, j: 1 })]: [actor] })

        const instances = resolveActionSubjects({
            type: GameActionType.displaceFigure,
            params: { dx: 1, dy: 0 },
        }, ctx)

        expect(instances).toHaveLength(1)
        expect(instances[0]?.placement.instanceId).toBe(actor.instanceId)
    })

    it('resolves steppedOn role from steppedOn context', () => {
        const stepper = createFigurePlacement('knight')
        const target = createFigurePlacement('rook')
        const ctx = buildSteppedOnActionSubjectContext({
            stepperPlacement: stepper,
            stepperCoord: { i: 0, j: 0 },
            targetPlacement: target,
            targetCoord: { i: 1, j: 1 },
            cause: 'manual',
        }, { [coordKey({ i: 1, j: 1 })]: [target] }, target.figureId)

        const instances = resolveActionSubjects({
            type: GameActionType.moveToCell,
            params: { x: 3, y: 4 },
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                matchMode: 'any',
            },
        }, ctx)

        expect(instances).toHaveLength(1)
        expect(instances[0]?.placement.instanceId).toBe(target.instanceId)
    })

    it('returns empty when matchMode all is not satisfied', () => {
        const actor = createFigurePlacement('pawn')
        const ctx = buildActionSubjectResolutionContext({
            from: { i: 0, j: 0 },
            to: { i: 1, j: 1 },
            actorPlacement: actor,
            boardParameters: { n: 8, m: 8 } as never,
            catalog: [],
            eventRules: [],
            stepCause: 'manual',
            eventType: FigureEventType.onMove,
        }, { [coordKey({ i: 1, j: 1 })]: [actor] })

        const instances = resolveActionSubjects({
            type: GameActionType.moveToTray,
            subject: {
                entries: [
                    { figureId: FIGURE_SUBJECT_MOVED },
                    { figureId: FIGURE_SUBJECT_STEPPED_ON },
                ],
                matchMode: 'all',
            },
            params: {},
        }, ctx)

        expect(instances).toEqual([])
    })

    it('returns empty for spawnFigure', () => {
        const actor = createFigurePlacement('pawn')
        const ctx = buildActionSubjectResolutionContext({
            from: { i: 0, j: 0 },
            to: { i: 1, j: 1 },
            actorPlacement: actor,
            boardParameters: { n: 8, m: 8 } as never,
            catalog: [],
            eventRules: [],
            stepCause: 'manual',
        }, { [coordKey({ i: 1, j: 1 })]: [actor] })

        expect(resolveActionSubjects({
            type: GameActionType.spawnFigure,
            params: { figureId: 'pawn', x: 1, y: 1, stateIndex: 0 },
        }, ctx)).toEqual([])
    })
})
