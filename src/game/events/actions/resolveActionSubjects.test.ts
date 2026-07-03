import { describe, expect, it } from 'vitest'
import {
    FIGURE_SUBJECT_HOPPED_OVER,
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

    it('resolves hoppedOver role from move context', () => {
        const actor = createFigurePlacement('knight')
        const pawn = createFigurePlacement('pawn')
        const ctx = buildActionSubjectResolutionContext({
            from: { i: 0, j: 0 },
            to: { i: 0, j: 2 },
            actorPlacement: actor,
            boardParameters: { n: 8, m: 8 } as never,
            catalog: [],
            eventRules: [],
            stepCause: 'manual',
            eventType: FigureEventType.onMove,
            hoppedFigures: [pawn],
        }, {
            [coordKey({ i: 0, j: 1 })]: [pawn],
            [coordKey({ i: 0, j: 2 })]: [actor],
        })

        const instances = resolveActionSubjects({
            type: GameActionType.moveToTray,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_HOPPED_OVER }],
                matchMode: 'any',
            },
            params: {},
        }, ctx)

        expect(instances).toHaveLength(1)
        expect(instances[0]?.placement.instanceId).toBe(pawn.instanceId)
        expect(instances[0]?.coord).toEqual({ i: 0, j: 1 })
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

    it('resolves nearby figures around moved anchor', () => {
        const actor = createFigurePlacement('king')
        const rook = createFigurePlacement('rook')
        const ctx = buildActionSubjectResolutionContext({
            from: { i: 0, j: 2 },
            to: { i: 2, j: 2 },
            actorPlacement: actor,
            boardParameters: { n: 8, m: 8 } as never,
            catalog: [],
            eventRules: [],
            stepCause: 'manual',
            eventType: FigureEventType.onMove,
        }, {
            [coordKey({ i: 2, j: 2 })]: [actor],
            [coordKey({ i: 3, j: 2 })]: [rook],
        })

        const instances = resolveActionSubjects({
            type: GameActionType.moveToTray,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
                nearby: {
                    enabled: true,
                    cells: [{ x: 1, y: 0 }],
                },
            },
            params: {},
        }, ctx)

        expect(instances).toHaveLength(1)
        expect(instances[0]?.placement.instanceId).toBe(rook.instanceId)
        expect(instances[0]?.coord).toEqual({ i: 3, j: 2 })
    })

    it('orients nearby cells when orientToTeamDirection is true', () => {
        const actor = createFigurePlacement('king')
        const pawn = createFigurePlacement('pawn')
        const catalog = [{ id: 'king', team: 0, states: [{ viewParams: {} }] }]
        const ctx = buildActionSubjectResolutionContext({
            from: { i: 2, j: 2 },
            to: { i: 3, j: 2 },
            actorPlacement: actor,
            boardParameters: {
                n: 8,
                m: 8,
                teamMoveDirections: { 0: 'right' as const },
            } as never,
            catalog,
            eventRules: [],
            stepCause: 'manual',
            eventType: FigureEventType.onMove,
        }, {
            [coordKey({ i: 3, j: 2 })]: [actor],
            [coordKey({ i: 2, j: 2 })]: [pawn],
        })

        const instances = resolveActionSubjects({
            type: GameActionType.moveToTray,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
                nearby: {
                    enabled: true,
                    cells: [{ x: 0, y: 1 }],
                    orientToTeamDirection: true,
                },
            },
            params: {},
        }, ctx)

        expect(instances).toHaveLength(1)
        expect(instances[0]?.placement.instanceId).toBe(pawn.instanceId)
        expect(instances[0]?.coord).toEqual({ i: 2, j: 2 })
    })

    it('does not include anchor in its own nearby scan', () => {
        const actor = createFigurePlacement('pawn')
        const ctx = buildActionSubjectResolutionContext({
            from: { i: 2, j: 2 },
            to: { i: 3, j: 2 },
            actorPlacement: actor,
            boardParameters: { n: 8, m: 8 } as never,
            catalog: [],
            eventRules: [],
            stepCause: 'manual',
            eventType: FigureEventType.onMove,
        }, {
            [coordKey({ i: 2, j: 2 })]: [actor],
        })

        const instances = resolveActionSubjects({
            type: GameActionType.moveToTray,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
                nearby: {
                    enabled: true,
                    cells: [{ x: 0, y: 0 }],
                },
            },
            params: {},
        }, ctx)

        expect(instances).toEqual([])
    })

    it('finds another anchor when it falls in nearby area', () => {
        const king = createFigurePlacement('king')
        const rook = createFigurePlacement('rook')
        const ctx = buildActionSubjectResolutionContext({
            from: { i: 0, j: 2 },
            to: { i: 2, j: 2 },
            actorPlacement: king,
            targetAtTo: rook,
            boardParameters: { n: 8, m: 8 } as never,
            catalog: [],
            eventRules: [],
            stepCause: 'manual',
            eventType: FigureEventType.onMove,
        }, {
            [coordKey({ i: 2, j: 2 })]: [king],
            [coordKey({ i: 3, j: 2 })]: [rook],
        })

        const instances = resolveActionSubjects({
            type: GameActionType.moveToTray,
            subject: {
                entries: [
                    { figureId: FIGURE_SUBJECT_MOVED },
                    { figureId: 'rook' },
                ],
                matchMode: 'any',
                nearby: {
                    enabled: true,
                    cells: [{ x: 1, y: 0 }],
                },
            },
            params: {},
        }, ctx)

        expect(instances).toHaveLength(1)
        expect(instances[0]?.placement.instanceId).toBe(rook.instanceId)
    })

    it('returns empty for nearby when matchMode all is not satisfied', () => {
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
        }, { [coordKey({ i: 0, j: 0 })]: [actor] })

        const instances = resolveActionSubjects({
            type: GameActionType.moveToTray,
            subject: {
                entries: [
                    { figureId: FIGURE_SUBJECT_MOVED },
                    { figureId: FIGURE_SUBJECT_STEPPED_ON },
                ],
                matchMode: 'all',
                nearby: {
                    enabled: true,
                    cells: [{ x: 1, y: 0 }],
                },
            },
            params: {},
        }, ctx)

        expect(instances).toEqual([])
    })

    it('returns empty when nearby enabled but cells are empty', () => {
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
        }, { [coordKey({ i: 0, j: 0 })]: [actor] })

        const instances = resolveActionSubjects({
            type: GameActionType.moveToTray,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
                nearby: { enabled: true, cells: [] },
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
