import { DATA_CHANNEL_LABEL, ICE_SERVERS } from './config'
import { collabLog } from './debug'
import { sendJsonMessage } from './dataChannelSend'
import { SignalPayload } from './types'

export interface PeerConnectionCallbacks {
    onSignal: (payload: SignalPayload) => void
    onDataChannel: (channel: RTCDataChannel) => void
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
}

export function createPeerConnection(callbacks: PeerConnectionCallbacks): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = (event) => {
        callbacks.onSignal({
            kind: 'ice',
            candidate: event.candidate?.toJSON() ?? null,
        })
    }

    pc.onconnectionstatechange = () => {
        collabLog('pc connectionState', pc.connectionState)
        callbacks.onConnectionStateChange?.(pc.connectionState)
    }

    pc.oniceconnectionstatechange = () => {
        collabLog('pc iceConnectionState', pc.iceConnectionState)
    }

    pc.ondatachannel = (event) => {
        callbacks.onDataChannel(event.channel)
    }

    return pc
}

export function createHostDataChannel(pc: RTCPeerConnection): RTCDataChannel {
    return pc.createDataChannel(DATA_CHANNEL_LABEL, { ordered: true })
}

export function waitForDataChannelOpen(channel: RTCDataChannel): Promise<void> {
    if (channel.readyState === 'open') {
        return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
        const handleOpen = () => {
            cleanup()
            resolve()
        }

        const handleError = () => {
            cleanup()
            reject(new Error('Data channel failed to open'))
        }

        const cleanup = () => {
            channel.removeEventListener('open', handleOpen)
            channel.removeEventListener('error', handleError)
        }

        channel.addEventListener('open', handleOpen)
        channel.addEventListener('error', handleError)
    })
}

export async function applySignalPayload(
    pc: RTCPeerConnection,
    payload: SignalPayload,
    createAnswer: boolean,
    pendingIce: RTCIceCandidateInit[] = [],
): Promise<RTCSessionDescriptionInit | null> {
    if (payload.kind === 'offer') {
        await pc.setRemoteDescription(payload.sdp)

        if (!createAnswer) {
            await flushPendingIce(pc, pendingIce)
            return null
        }

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await flushPendingIce(pc, pendingIce)
        return answer
    }

    if (payload.kind === 'answer') {
        await pc.setRemoteDescription(payload.sdp)
        await flushPendingIce(pc, pendingIce)
        return null
    }

    if (payload.candidate) {
        if (!pc.remoteDescription) {
            pendingIce.push(payload.candidate)
        } else {
            await pc.addIceCandidate(payload.candidate)
        }
    }

    return null
}

async function flushPendingIce(pc: RTCPeerConnection, pendingIce: RTCIceCandidateInit[]) {
    while (pendingIce.length > 0) {
        const candidate = pendingIce.shift()

        if (candidate) {
            await pc.addIceCandidate(candidate)
        }
    }
}

export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    return offer
}

export function attachDataChannelHandlers(
    channel: RTCDataChannel,
    onMessage: (data: string) => void,
    onOpen?: () => void,
) {
    channel.onopen = () => onOpen?.()
    channel.onmessage = (event) => {
        if (typeof event.data === 'string') {
            onMessage(event.data)
        }
    }
}

export function sendDataChannelMessage(
    channel: RTCDataChannel,
    message: unknown,
    targetPeer?: string,
) {
    return sendJsonMessage(channel, message, targetPeer)
}
