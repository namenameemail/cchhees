export interface SliceHistory<T> {
    before: T[]
    after: T[]
}

export type GameStateHistory = SliceHistory<import('./gameState').GameState>

export function historyInit<T>(): SliceHistory<T> {
    return {
        before: [],
        after: [],
    }
}

export interface HistoryResult<T> {
    history: SliceHistory<T>
    current: T
}

const historyLength = 100

export function historyPush<T>(
    history: SliceHistory<T>,
    current: T,
    newCurrent: T,
): HistoryResult<T> {
    const beforeNext: T[] = [...history.before, current]
    const afterNext: T[] = []

    if (beforeNext.length > historyLength) {
        beforeNext.shift()
    }

    return {
        history: {
            before: beforeNext,
            after: afterNext,
        },
        current: newCurrent,
    }
}

export function historyUndo<T>(history: SliceHistory<T>, current: T): HistoryResult<T> {
    if (history.before.length === 0) {
        return { history, current }
    }

    const prev = history.before[history.before.length - 1]
    const beforeNext = history.before.slice(0, history.before.length - 1)
    const afterNext = [current, ...history.after]

    return {
        history: {
            before: beforeNext,
            after: afterNext,
        },
        current: prev,
    }
}

export function historyRedo<T>(history: SliceHistory<T>, current: T): HistoryResult<T> {
    if (history.after.length === 0) {
        return { history, current }
    }

    const next = history.after[0]
    const beforeNext = [...history.before, current]
    const afterNext = history.after.slice(1)

    return {
        history: {
            before: beforeNext,
            after: afterNext,
        },
        current: next,
    }
}
