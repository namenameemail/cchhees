import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyFiguresSlice } from '../moveDebug/compareFigureBoards'
import { testBoardParameters } from '../testFixtures'
import {
    appendMoveRecMove,
    getMoveRecMoveCount,
    getMoveRecSession,
    hasMoveRecData,
    MOVE_REC_PROFILE_FILE,
    resetMoveRecSession,
    saveMoveRecToProject,
    startMoveRecRecording,
    stopMoveRecRecording,
} from './moveRecLog'

vi.mock('../../profiler', () => ({
    profiler: {
        config: {
            isDev: true,
            clickSaveEndpoint: '/__profiling/save-clicks',
        },
    },
}))

describe('moveRecLog', () => {
    beforeEach(() => {
        resetMoveRecSession()
        vi.restoreAllMocks()
    })

    it('captures setup once when recording starts', () => {
        startMoveRecRecording({
            boardParameters: testBoardParameters,
            figureTeams: [{ id: 0, name: 'White' }],
            catalog: [{ id: 'king', states: [{ viewParams: {} }] }],
            eventRules: [],
            figuresSlice: emptyFiguresSlice(),
        })

        const session = getMoveRecSession()

        expect(session.setup).not.toBeNull()
        expect(session.setup?.boardParameters).toEqual(testBoardParameters)
        expect(session.moves).toEqual([])
    })

    it('appends moves with monotonic indices', () => {
        startMoveRecRecording({
            boardParameters: testBoardParameters,
            figureTeams: [],
            catalog: [],
            eventRules: [],
            figuresSlice: emptyFiguresSlice(),
        })

        const before = emptyFiguresSlice()
        const after = emptyFiguresSlice()

        appendMoveRecMove({
            from: { i: 0, j: 0 },
            to: { i: 1, j: 0 },
            before,
            after,
            chain: [],
        })
        appendMoveRecMove({
            from: { i: 1, j: 0 },
            to: { i: 2, j: 0 },
            before: after,
            after,
            chain: [],
        })

        expect(getMoveRecMoveCount()).toBe(2)
        expect(getMoveRecSession().moves.map(entry => entry.index)).toEqual([0, 1])
    })

    it('does not append when recording is stopped', () => {
        startMoveRecRecording({
            boardParameters: testBoardParameters,
            figureTeams: [],
            catalog: [],
            eventRules: [],
            figuresSlice: emptyFiguresSlice(),
        })
        stopMoveRecRecording()

        appendMoveRecMove({
            from: { i: 0, j: 0 },
            to: { i: 1, j: 0 },
            before: emptyFiguresSlice(),
            after: emptyFiguresSlice(),
            chain: [],
        })

        expect(getMoveRecMoveCount()).toBe(0)
    })

    it('saveMoveRecToProject posts move_rec payload', async () => {
        startMoveRecRecording({
            boardParameters: testBoardParameters,
            figureTeams: [],
            catalog: [],
            eventRules: [],
            figuresSlice: emptyFiguresSlice(),
        })

        appendMoveRecMove({
            from: { i: 0, j: 0 },
            to: { i: 1, j: 0 },
            before: emptyFiguresSlice(),
            after: emptyFiguresSlice(),
            chain: [],
        })

        expect(hasMoveRecData()).toBe(true)

        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ path: `profiling/${MOVE_REC_PROFILE_FILE}.json` }),
        } as Response)

        const result = await saveMoveRecToProject()

        expect(result.ok).toBe(true)
        expect(fetchMock).toHaveBeenCalledOnce()

        const [, requestInit] = fetchMock.mock.calls[0]
        const body = JSON.parse(String(requestInit?.body))

        expect(body.fileName).toBe(MOVE_REC_PROFILE_FILE)
        expect(JSON.parse(body.content).moves).toHaveLength(1)
    })
})
