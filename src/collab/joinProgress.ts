export type JoinPhase =
    | 'idle'
    | 'connecting'
    | 'room-join'
    | 'p2p'
    | 'snapshot'
    | 'assets'
    | 'import'
    | 'done'

export interface JoinProgress {
    active: boolean
    phase: JoinPhase
    label: string
    detail?: string
    percent: number
}

export const IDLE_JOIN_PROGRESS: JoinProgress = {
    active: false,
    phase: 'idle',
    label: '',
    percent: 0,
}

export function joinProgressForPhase(
    phase: JoinPhase,
    detail?: string,
    assetReceived?: number,
    assetTotal?: number,
): JoinProgress {
    switch (phase) {
        case 'connecting':
            return {
                active: true,
                phase,
                label: 'Подключение к серверу…',
                percent: 10,
            }
        case 'room-join':
            return {
                active: true,
                phase,
                label: 'Вход в комнату…',
                percent: 25,
            }
        case 'p2p':
            return {
                active: true,
                phase,
                label: 'Установка P2P-соединения…',
                detail: 'Обмен ключами WebRTC',
                percent: 40,
            }
        case 'snapshot':
            return {
                active: true,
                phase,
                label: 'Получение проекта…',
                detail: detail ?? 'Ожидание snapshot от хоста',
                percent: 55,
            }
        case 'assets': {
            const received = assetReceived ?? 0
            const total = Math.max(assetTotal ?? 0, 1)
            const span = 30
            const base = 55
            return {
                active: true,
                phase,
                label: 'Загрузка ассетов…',
                detail: `${received} / ${total}`,
                percent: base + Math.round((received / total) * span),
            }
        }
        case 'import':
            return {
                active: true,
                phase,
                label: 'Сохранение локальной копии…',
                percent: 92,
            }
        case 'done':
            return {
                active: true,
                phase,
                label: 'Готово',
                percent: 100,
            }
        default:
            return IDLE_JOIN_PROGRESS
    }
}
