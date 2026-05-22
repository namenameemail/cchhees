import { GameState } from '../types/gameState'
import { GameStateHistory } from '../types/history'

const historyLength = 100;
//
// const copyState = (state: GameState) => {
//     return {
//         ...state,
//         cells
//     }
// };

export const historyInit = (): GameStateHistory => {
    return {
        before: [],
        after: [],
    }
};

export interface HistoryResult {
    history: GameStateHistory
    current: GameState
}

export const historyPush = (history: GameStateHistory, current: GameState, newCurrent: GameState): HistoryResult => {
    const beforeNext: GameState[] = [...history.before, current];
    const afterNext: GameState[] = [];

    if (beforeNext.length > historyLength)
        beforeNext.shift();

    return {
        history: {
            before: beforeNext,
            after: afterNext,
        },
        current: newCurrent
    }
};

export const historyUndo = (history: GameStateHistory, current: GameState): HistoryResult => {


    if (history.before.length === 0) return {history, current};

    const prev = history.before[history.before.length - 1];

    const beforeNext = history.before.slice(0, history.before.length - 1); // pop
    const afterNext = [current, ...history.after]; // unshift current

    return {
        history: {
            before: beforeNext,
            after: afterNext,
        },
        current: prev,
    }
};

export const historyRedo = (history: GameStateHistory, current: GameState): HistoryResult => {
    if (history.after.length === 0) return {history, current};

    const next = history.after[0];

    const beforeNext = [...history.before, current]; // push current
    const afterNext = history.after.slice(1, history.after.length); // shift

    return {
        history: {
            before: beforeNext,
            after: afterNext,
        },
        current: next
    }
};