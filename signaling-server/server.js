import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT || 8787)
const DEBUG = process.env.SIGNALING_DEBUG !== '0'
const ROOM_ID_LENGTH = 6
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** @type {Map<string, { host: import('ws').WebSocket, hostPeerId: string, guests: Map<string, import('ws').WebSocket> }>} */
const rooms = new Map()

/** @type {Map<import('ws').WebSocket, { peerId: string, roomId: string | null, role: 'host' | 'guest' | null }>} */
const peers = new Map()

function log(...args) {
    if (DEBUG) {
        console.log('[signaling]', new Date().toISOString(), ...args)
    }
}

function signalKind(payload) {
    if (!payload || typeof payload !== 'object') {
        return '?'
    }

    return payload.kind ?? '?'
}

function summarizeClientMessage(message) {
    switch (message.type) {
        case 'join-room':
            return `room=${String(message.roomId || '').toUpperCase()}`
        case 'signal':
            return `to=${message.to?.slice(0, 8) ?? '?'} kind=${signalKind(message.payload)}`
        default:
            return ''
    }
}

function summarizeServerMessage(message) {
    switch (message.type) {
        case 'room-created':
            return `room=${message.roomId}`
        case 'joined':
            return `room=${message.roomId} host=${message.hostPeerId?.slice(0, 8)} peers=${message.participantCount ?? '?'}`
        case 'guest-joined':
        case 'guest-left':
            return `peer=${message.peerId?.slice(0, 8)} room=${message.roomId}`
        case 'room-peers-updated':
            return `room=${message.roomId} peers=${message.participantCount}`
        case 'signal':
            return `from=${message.from?.slice(0, 8)} kind=${signalKind(message.payload)}`
        case 'error':
            return message.error
        default:
            return ''
    }
}

function roomSummary(roomId) {
    const room = rooms.get(roomId)

    if (!room) {
        return 'room=?'
    }

    return `room=${roomId} host=${room.hostPeerId.slice(0, 8)} guests=${room.guests.size}`
}

function generatePeerId() {
    return randomBytes(8).toString('hex')
}

function generateRoomId() {
    const bytes = randomBytes(ROOM_ID_LENGTH)
    let id = ''

    for (let index = 0; index < ROOM_ID_LENGTH; index += 1) {
        id += ROOM_ALPHABET[bytes[index] % ROOM_ALPHABET.length]
    }

    if (rooms.has(id)) {
        return generateRoomId()
    }

    return id
}

function send(ws, message) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message))
    }
}

function sendError(ws, error) {
    const meta = peers.get(ws)
    log('error →', meta?.peerId?.slice(0, 8) ?? '?', error)
    send(ws, { type: 'error', error })
}

function getParticipantCount(room) {
    return 1 + room.guests.size
}

function broadcastRoomPeers(roomId) {
    const room = rooms.get(roomId)

    if (!room) {
        return
    }

    const participantCount = getParticipantCount(room)
    const message = { type: 'room-peers-updated', roomId, participantCount }

    send(room.host, message)

    for (const guestWs of room.guests.values()) {
        send(guestWs, message)
    }
}

function removeGuest(roomId, guestPeerId) {
    const room = rooms.get(roomId)

    if (!room) {
        return
    }

    room.guests.delete(guestPeerId)
    log('guest-left', roomId, guestPeerId.slice(0, 8))
    send(room.host, { type: 'guest-left', roomId, peerId: guestPeerId })
    broadcastRoomPeers(roomId)
}

function destroyRoom(roomId) {
    const room = rooms.get(roomId)

    if (!room) {
        return
    }

    log('room destroyed', roomId)

    for (const guestWs of room.guests.values()) {
        send(guestWs, { type: 'room-closed', roomId })
        const meta = peers.get(guestWs)

        if (meta) {
            meta.roomId = null
            meta.role = null
        }
    }

    rooms.delete(roomId)
}

function cleanupPeer(ws) {
    const meta = peers.get(ws)

    if (!meta?.roomId) {
        if (meta) {
            log('disconnect', meta.peerId.slice(0, 8), '(no room)')
        }
        peers.delete(ws)
        return
    }

    const { roomId, role, peerId } = meta
    log('disconnect', peerId.slice(0, 8), role, 'room', roomId)

    if (role === 'host') {
        destroyRoom(roomId)
    } else if (role === 'guest') {
        removeGuest(roomId, peerId)
    }

    peers.delete(ws)
}

function relaySignal(fromWs, message) {
    const fromMeta = peers.get(fromWs)
    const room = rooms.get(message.roomId)

    if (!fromMeta?.roomId || !room || fromMeta.roomId !== message.roomId) {
        log('signal relay failed: room not found', fromMeta?.peerId?.slice(0, 8), message.roomId)
        sendError(fromWs, 'Room not found')
        return
    }

    const targetPeerId = message.to

    if (!targetPeerId) {
        sendError(fromWs, 'Missing target peer')
        return
    }

    let targetWs = null

    if (room.hostPeerId === targetPeerId) {
        targetWs = room.host
    } else {
        targetWs = room.guests.get(targetPeerId) ?? null
    }

    if (!targetWs) {
        log('signal relay failed: peer not found', message.to?.slice(0, 8), 'room', message.roomId)
        sendError(fromWs, 'Peer not found')
        return
    }

    log(
        'signal relay',
        message.roomId,
        fromMeta.peerId.slice(0, 8),
        '→',
        targetPeerId.slice(0, 8),
        signalKind(message.payload),
        roomSummary(message.roomId),
    )

    send(targetWs, {
        type: 'signal',
        roomId: message.roomId,
        from: fromMeta.peerId,
        payload: message.payload,
    })
}

function handleMessage(ws, raw) {
    let message

    try {
        message = JSON.parse(String(raw))
    } catch {
        sendError(ws, 'Invalid JSON')
        return
    }

    if (!message?.type) {
        sendError(ws, 'Missing message type')
        return
    }

    const meta = peers.get(ws)
    const rawBytes = typeof raw === 'string' ? raw.length : String(raw).length

    log(
        'recv',
        meta?.peerId?.slice(0, 8) ?? '?',
        meta?.role ?? '-',
        message.type,
        summarizeClientMessage(message),
        `${rawBytes}B`,
        meta?.roomId ? roomSummary(meta.roomId) : '',
    )

    switch (message.type) {
        case 'create-room': {
            if (!meta) {
                sendError(ws, 'Not connected')
                return
            }

            if (meta.roomId) {
                sendError(ws, 'Already in a room')
                return
            }

            const roomId = generateRoomId()
            rooms.set(roomId, {
                host: ws,
                hostPeerId: meta.peerId,
                guests: new Map(),
            })

            meta.roomId = roomId
            meta.role = 'host'

            log('create-room', roomId, 'host', meta.peerId.slice(0, 8), roomSummary(roomId))
            send(ws, { type: 'room-created', roomId, peerId: meta.peerId })
            return
        }

        case 'join-room': {
            const roomId = String(message.roomId || '').toUpperCase()
            const room = rooms.get(roomId)

            if (!meta) {
                sendError(ws, 'Not connected')
                return
            }

            if (meta.roomId) {
                sendError(ws, 'Already in a room')
                return
            }

            if (!room) {
                log('join-room failed: not found', roomId, 'guest', meta.peerId.slice(0, 8))
                sendError(ws, 'Room not found')
                return
            }

            meta.roomId = roomId
            meta.role = 'guest'
            room.guests.set(meta.peerId, ws)

            log('join-room', roomId, 'guest', meta.peerId.slice(0, 8), '→ host', room.hostPeerId.slice(0, 8), roomSummary(roomId))
            const participantCount = getParticipantCount(room)
            send(ws, {
                type: 'joined',
                roomId,
                peerId: meta.peerId,
                hostPeerId: room.hostPeerId,
                participantCount,
            })
            send(room.host, { type: 'guest-joined', roomId, peerId: meta.peerId })
            broadcastRoomPeers(roomId)
            return
        }

        case 'signal': {
            relaySignal(ws, message)
            return
        }

        case 'leave-room': {
            log('leave-room', meta?.peerId?.slice(0, 8), meta?.role, meta?.roomId)
            cleanupPeer(ws)
            send(ws, { type: 'left' })
            return
        }

        default:
            sendError(ws, `Unknown message type: ${message.type}`)
    }
}

const httpServer = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('cchhees signaling server\n')
})

const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws) => {
    const peerId = generatePeerId()
    peers.set(ws, { peerId, roomId: null, role: null })

    log('connect', peerId.slice(0, 8))
    send(ws, { type: 'welcome', peerId })

    ws.on('message', (raw) => handleMessage(ws, raw))
    ws.on('close', () => cleanupPeer(ws))
    ws.on('error', () => cleanupPeer(ws))
})

httpServer.listen(PORT, () => {
    console.log(`[signaling] listening on ws://127.0.0.1:${PORT} (debug=${DEBUG ? 'on' : 'off'})`)
})
