export function getSignalingUrl(): string {
    const fromEnv = import.meta.env.VITE_SIGNALING_URL

    if (fromEnv) {
        return fromEnv
    }

    return 'ws://127.0.0.1:8787'
}

export const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
]

export const DATA_CHANNEL_LABEL = 'collab-v1'
