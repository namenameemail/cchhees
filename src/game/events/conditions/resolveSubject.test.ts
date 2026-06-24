import { describe, expect, it } from 'vitest'
import {
    FIGURE_SUBJECT_HOPPED_OVER,
    FIGURE_SUBJECT_MOVED,
    FIGURE_SUBJECT_STEPPED_ON,
    canonicalizeConditionSubjectEntries,
    toggleSubjectRoleInEntries,
} from '../../figureFilter'
import { createFigurePlacement } from '../../figureView'
import { resolveSubjectInstances } from './resolveSubject'

const movedSubject = {
    entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
    matchMode: 'any' as const,
}

describe('canonicalizeConditionSubjectEntries', () => {
    it('defaults empty to moved role', () => {
        expect(canonicalizeConditionSubjectEntries([])).toEqual([
            { figureId: FIGURE_SUBJECT_MOVED },
        ])
    })

    it('keeps roles with concrete figures', () => {
        expect(canonicalizeConditionSubjectEntries([
            { figureId: FIGURE_SUBJECT_MOVED },
            { figureId: FIGURE_SUBJECT_STEPPED_ON },
            { figureId: 'pawn' },
        ])).toEqual([
            { figureId: FIGURE_SUBJECT_MOVED },
            { figureId: FIGURE_SUBJECT_STEPPED_ON },
            { figureId: 'pawn' },
        ])
    })

    it('preserves roles when selecting all figures', () => {
        expect(toggleSubjectRoleInEntries(
            [{ figureId: FIGURE_SUBJECT_MOVED }],
            FIGURE_SUBJECT_STEPPED_ON,
        )).toEqual([
            { figureId: FIGURE_SUBJECT_MOVED },
            { figureId: FIGURE_SUBJECT_STEPPED_ON },
        ])
    })
})

describe('resolveSubjectInstances', () => {
    it('resolves moved role from move context', () => {
        const actor = createFigurePlacement('pawn')
        const instances = resolveSubjectInstances(movedSubject, {
            move: {
                from: { i: 1, j: 2 },
                to: { i: 2, j: 3 },
                actorPlacement: actor,
                boardParameters: {} as never,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: { '2,3': [actor] },
        })

        expect(instances).toHaveLength(1)
        expect(instances[0]?.placement.instanceId).toBe(actor.instanceId)
        expect(instances[0]?.coord).toEqual({ i: 1, j: 2 })
        expect(instances[0]?.beforeCoord).toEqual({ i: 1, j: 2 })
    })

    it('unions moved and steppedOn roles', () => {
        const actor = createFigurePlacement('knight')
        const rook = createFigurePlacement('rook')

        const instances = resolveSubjectInstances({
            entries: [
                { figureId: FIGURE_SUBJECT_MOVED },
                { figureId: FIGURE_SUBJECT_STEPPED_ON },
            ],
            matchMode: 'any',
        }, {
            move: {
                from: { i: 0, j: 0 },
                to: { i: 2, j: 2 },
                actorPlacement: actor,
                targetAtTo: rook,
                boardParameters: {} as never,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: { '2,2': [rook, actor] },
        })

        expect(instances).toHaveLength(2)
        expect(instances.map(item => item.placement.figureId).sort()).toEqual(['knight', 'rook'])
    })

    it('resolves hoppedOver role from move context', () => {
        const actor = createFigurePlacement('knight')
        const pawn = createFigurePlacement('pawn')

        const instances = resolveSubjectInstances({
            entries: [{ figureId: FIGURE_SUBJECT_HOPPED_OVER }],
            matchMode: 'any',
        }, {
            move: {
                from: { i: 0, j: 0 },
                to: { i: 0, j: 2 },
                actorPlacement: actor,
                boardParameters: {} as never,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
                hoppedFigures: [pawn],
            },
            figuresByCoord: {
                '0,1': [pawn],
                '0,2': [actor],
            },
            beforeBoard: {
                '0,0': [actor],
                '0,1': [pawn],
            },
        })

        expect(instances).toHaveLength(1)
        expect(instances[0]?.placement.instanceId).toBe(pawn.instanceId)
        expect(instances[0]?.coord).toEqual({ i: 0, j: 1 })
    })
})
