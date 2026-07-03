import { createChannelDebugLog } from '../../../channelDebugLog'
import type { DiceSimState } from './dicePhysics'

const log = createChannelDebugLog({ channel: 'dice', consolePrefix: '[dice] ' })

export const diceDebugLog = {
    simState(next: DiceSimState): void {
        log.append(`simState → ${next}`, {}, { logToConsole: true })
    },

    thresholdCross(speed: number, counter: number, wentBelow: boolean): void {
        const dir = wentBelow ? '▼ below' : '▲ above'
        log.append(`${dir} thr  speed=${speed.toFixed(4)}  ctr=${counter}`, {}, { logToConsole: true })
    },

    frame(speed: number, counter: number): void {
        log.append(`speed=${speed.toFixed(4)}  ctr=${counter}`)
    },

    counterReset(): void {
        log.append('counter → 0 (speed spike)', {}, { logToConsole: true })
    },

    settled(): void {
        log.append('SETTLED ✓', {}, { logToConsole: true })
    },

    timeout(elapsed: number): void {
        log.append(`TIMEOUT force-settle at ${elapsed.toFixed(2)}s`, {}, { logToConsole: true })
    },
}
