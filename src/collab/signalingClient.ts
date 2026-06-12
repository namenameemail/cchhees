import { SignalPayload } from './types'
import { collabXferLog } from './collabXferLog'

export type SignalingServerMessage =
    | { type: 'welcome'; peerId: string }
    | { type: 'room-created'; roomId: string; peerId: string }
    | { type: 'joined'; roomId: string; peerId: string; hostPeerId: string; participantCount?: number }
    | { type: 'guest-joined'; roomId: string; peerId: string }
    | { type: 'guest-left'; roomId: string; peerId: string }
    | { type: 'room-peers-updated'; roomId: string; participantCount: number }
    | { type: 'room-closed'; roomId: string }
    | { type: 'signal'; roomId: string; from: string; payload: SignalPayload }
    | { type: 'left' }
    | { type: 'error'; error: string }

export type SignalingClientMessage =
    | { type: 'create-room' }
    | { type: 'join-room'; roomId: string }
    | { type: 'signal'; roomId: string; to: string; payload: SignalPayload }
    | { type: 'leave-room' }

export interface SignalingClientOptions {
    url: string
    onMessage: (message: SignalingServerMessage) => void
    onOpen?: () => void
    onClose?: () => void
    onError?: (error: Error) => void
}

export class SignalingClient {
    private ws: WebSocket | null = null
    private readonly options: SignalingClientOptions
    peerId: string | null = null

    constructor(options: SignalingClientOptions) {
        this.options = options
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.options.url)
            this.ws = ws

            ws.onopen = () => {
                this.options.onOpen?.()
            }

            ws.onerror = () => {
                const error = new Error('Signaling connection failed')
                this.options.onError?.(error)
                reject(error)
            }

            ws.onclose = () => {
                this.options.onClose?.()
            }

            ws.onmessage = (event) => {
                let message: SignalingServerMessage

                try {
                    message = JSON.parse(String(event.data)) as SignalingServerMessage
                } catch {
                    return
                }

                if (message.type === 'welcome') {
                    this.peerId = message.peerId
                    resolve()
                }

                collabXferLog.signaling('rx', message.type, describeSignalingMessage(message), message.type === 'signal' ? message.from : undefined)

                this.options.onMessage(message)
            }
        })
    }

    send(message: SignalingClientMessage) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Signaling socket is not open')
        }

        collabXferLog.signaling('tx', message.type, describeSignalingClientMessage(message))

        this.ws.send(JSON.stringify(message))
    }

    close() {
        this.ws?.close()
        this.ws = null
    }
}

function describeSignalingClientMessage(message: SignalingClientMessage): string | undefined {
    switch (message.type) {
        case 'join-room':
            return message.roomId
        case 'signal':
            return `${message.payload.kind} →${message.to.slice(0, 8)}`
        default:
            return undefined
    }
}

function describeSignalingMessage(message: SignalingServerMessage): string | undefined {
    switch (message.type) {
        case 'joined':
            return `host ${message.hostPeerId.slice(0, 8)} peers ${message.participantCount ?? '?'}`
        case 'guest-joined':
        case 'guest-left':
            return message.peerId.slice(0, 8)
        case 'room-peers-updated':
            return `peers ${message.participantCount}`
        case 'signal':
            return message.payload.kind
        case 'error':
            return message.error
        default:
            return undefined
    }
}
