import { getSignalingUrl } from './config'
import { collabError, collabLog, collabWarn } from './debug'
import { collabProfiler } from './collabProfiler'
import { collabXferLog } from './collabXferLog'
import { measureJsonBytes, sendAsset, sendLiveAsset, sendLiveAssetRemove, sendOps, sendSnapshotState } from './dataChannelSend'
import { CollabOp } from './ops'
import { buildJoinPersistData } from './joinPersist'
import { pruneMissingAssetReferencesInPersistData } from '../projects/assets/assetReferences'
import {
    applySignalPayload,
    attachDataChannelHandlers,
    createHostDataChannel,
    createOffer,
    createPeerConnection,
    sendDataChannelMessage,
    waitForDataChannelOpen,
} from './peerConnection'
import { SignalingClient, SignalingServerMessage } from './signalingClient'
import { createHelloMessage, parseCollabMessage } from './syncEngine'
import { CollabSnapshot, CollabSyncMessage, SignalPayload } from './types'
import { ProjectFileAsset } from '../projects/projectFile'
import { ProjectPersistData } from '../projects/types'
import { HostSnapshotProgress, hostSnapshotProgressForPhase } from './hostSnapshotProgress'

export interface CollabSessionCallbacks {
    onStatusChange?: (status: CollabSession['status']) => void
    onRoomId?: (roomId: string) => void
    onPeerCountChange?: (count: number) => void
    /** Return a relay message to fan out to other guests (host only). */
    onRemoteMessage?: (message: CollabSyncMessage) => CollabSyncMessage | void | Promise<CollabSyncMessage | void>
    onError?: (error: Error) => void
    onHostSnapshotProgress?: (progress: HostSnapshotProgress) => void
}

interface GuestConnection {
    peerId: string
    pc: RTCPeerConnection
    channel: RTCDataChannel | null
    pendingIce: RTCIceCandidateInit[]
    snapshotSent: boolean
    snapshotSendInFlight: Promise<void> | null
}

export class CollabSession {
    status: 'idle' | 'connecting' | 'hosting' | 'joining' | 'connected' | 'error' = 'idle'
    roomId: string | null = null
    role: 'host' | 'guest' | null = null
    peerId: string | null = null
    hostPeerId: string | null = null
    revision = 0
    private roomParticipantCount: number | null = null

    private signaling: SignalingClient | null = null
    private readonly callbacks: CollabSessionCallbacks
    private guestConnections = new Map<string, GuestConnection>()
    private guestPc: RTCPeerConnection | null = null
    private guestChannel: RTCDataChannel | null = null
    private guestPendingIce: RTCIceCandidateInit[] = []
    private projectName = ''
    private hostProjectId = ''
    private getPersistData: (() => ProjectPersistData | null) | null = null
    private getSnapshot: (() => Promise<CollabSnapshot | null>) | null = null
    private pendingHostResolve: { resolve: (roomId: string) => void; reject: (error: Error) => void } | null = null
    private pendingGuestResolve: { resolve: () => void; reject: (error: Error) => void } | null = null
    private signalQueue: Promise<void> = Promise.resolve()

    constructor(callbacks: CollabSessionCallbacks = {}) {
        this.callbacks = callbacks
    }

    setPersistProviders(
        getPersistData: () => ProjectPersistData | null,
        getSnapshot: () => Promise<CollabSnapshot | null>,
        projectName: string,
        hostProjectId: string,
    ) {
        this.getPersistData = getPersistData
        this.getSnapshot = getSnapshot
        this.projectName = projectName
        this.hostProjectId = hostProjectId
    }

    private setStatus(status: CollabSession['status']) {
        collabLog(this.role ?? '?', this.peerId?.slice(0, 8), 'status →', status)
        this.status = status
        collabProfiler.syncSession({ status })
        this.callbacks.onStatusChange?.(status)
    }

    private setError(error: Error) {
        this.setStatus('error')
        collabProfiler.syncSession({ error: error.message, status: 'error' })
        collabProfiler.logEvent(`error ${error.message}`)
        this.callbacks.onError?.(error)
    }

    private updatePeerCount() {
        if (this.role === 'host') {
            this.callbacks.onPeerCountChange?.(this.guestConnections.size)
            return
        }

        if (this.roomParticipantCount != null) {
            this.callbacks.onPeerCountChange?.(Math.max(0, this.roomParticipantCount - 1))
            return
        }

        this.callbacks.onPeerCountChange?.(this.hostPeerId ? 1 : 0)
    }

    private setRoomParticipantCount(count: number) {
        this.roomParticipantCount = count
        this.updatePeerCount()
    }

    private async ensureSignaling() {
        if (this.signaling) {
            return
        }

        this.setStatus('connecting')

        this.signaling = new SignalingClient({
            url: getSignalingUrl(),
            onMessage: (message) => this.handleSignalingMessage(message),
            onClose: () => {
                if (this.status !== 'idle') {
                    this.setError(new Error('Signaling connection closed'))
                }
            },
        })

        await this.signaling.connect()
        this.peerId = this.signaling.peerId
        collabLog('signaling connected', this.peerId)
        collabProfiler.syncSession({ selfPeerId: this.peerId })
        collabProfiler.logEvent(`signaling connected ${this.peerId?.slice(0, 8) ?? '?'}`)
    }

    async hostRoom(): Promise<string> {
        await this.ensureSignaling()
        this.role = 'host'
        collabXferLog.reset('host')
        this.setStatus('hosting')

        return new Promise((resolve, reject) => {
            this.pendingHostResolve = { resolve, reject }
            this.signaling!.send({ type: 'create-room' })
        })
    }

    async joinRoom(roomId: string): Promise<void> {
        await this.ensureSignaling()
        this.role = 'guest'
        collabXferLog.reset('guest')
        this.setStatus('joining')

        return new Promise((resolve, reject) => {
            this.pendingGuestResolve = { resolve, reject }
            this.signaling!.send({ type: 'join-room', roomId: roomId.toUpperCase() })
        })
    }

    private handleSignalingMessage(message: SignalingServerMessage) {
        if (message.type === 'error') {
            this.setError(new Error(message.error))
            this.pendingHostResolve?.reject(new Error(message.error))
            this.pendingGuestResolve?.reject(new Error(message.error))
            this.pendingHostResolve = null
            this.pendingGuestResolve = null
            return
        }

        if (message.type === 'room-created') {
            this.roomId = message.roomId
            collabLog('host room created', message.roomId)
            collabProfiler.syncSession({ role: 'host', roomId: message.roomId })
            collabProfiler.logConnection('host', 'room created')
            this.callbacks.onRoomId?.(message.roomId)
            this.pendingHostResolve?.resolve(message.roomId)
            this.pendingHostResolve = null
            return
        }

        if (message.type === 'joined') {
            this.roomId = message.roomId
            this.hostPeerId = message.hostPeerId

            if (message.participantCount != null) {
                this.setRoomParticipantCount(message.participantCount)
            } else {
                this.updatePeerCount()
            }

            collabLog(
                'guest joined room',
                message.roomId,
                'host',
                message.hostPeerId,
                'participants',
                message.participantCount ?? '?',
            )
            collabProfiler.syncSession({
                role: 'guest',
                roomId: message.roomId,
                ...(message.participantCount != null
                    ? { peerCount: Math.max(0, message.participantCount - 1) }
                    : {}),
            })
            collabProfiler.logConnection(
                'guest',
                'joined room',
                message.hostPeerId,
                `${message.participantCount ?? '?'} participants`,
            )
            this.callbacks.onRoomId?.(message.roomId)
            this.pendingGuestResolve?.resolve()
            this.pendingGuestResolve = null
            return
        }

        if (message.type === 'room-peers-updated') {
            if (this.roomId === message.roomId) {
                this.setRoomParticipantCount(message.participantCount)
                collabLog('room peers updated:', message.participantCount)
                collabProfiler.logEvent(`room peers ${message.participantCount}`)
            }
            return
        }

        if (message.type === 'guest-joined' && this.role === 'host') {
            collabLog('guest joined (webrtc setup)', message.peerId)
            collabProfiler.logConnection('host', 'guest signaling', message.peerId)
            void this.setupGuestConnection(message.peerId)
            return
        }

        if (message.type === 'guest-left' && this.role === 'host') {
            collabProfiler.logConnection('host', 'guest left', message.peerId)
            this.teardownGuestConnection(message.peerId)
            return
        }

        if (message.type === 'room-closed') {
            this.setError(new Error('Room closed by host'))
            return
        }

        if (message.type === 'signal') {
            this.enqueueSignal(message.from, message.payload)
        }
    }

    private enqueueSignal(fromPeerId: string, payload: SignalPayload) {
        collabLog('signal queued', this.role, payload.kind, 'from', fromPeerId.slice(0, 8))
        this.signalQueue = this.signalQueue
            .then(() => this.handleSignal(fromPeerId, payload))
            .catch((error) => {
                collabError('signal handling failed:', error)
            })
    }

    private async setupGuestConnection(guestPeerId: string) {
        if (!this.roomId || this.guestConnections.has(guestPeerId)) {
            return
        }

        const pc = createPeerConnection({
            onSignal: (payload) => {
                this.signaling?.send({
                    type: 'signal',
                    roomId: this.roomId!,
                    to: guestPeerId,
                    payload,
                })
            },
            onDataChannel: (channel) => {
                const connection = this.guestConnections.get(guestPeerId)

                if (!connection) {
                    return
                }

                connection.channel = channel
                this.attachChannel(channel, guestPeerId)
            },
        })

        this.guestConnections.set(guestPeerId, {
            peerId: guestPeerId,
            pc,
            channel: null,
            pendingIce: [],
            snapshotSent: false,
            snapshotSendInFlight: null,
        })

        const channel = createHostDataChannel(pc)
        const connection = this.guestConnections.get(guestPeerId)

        if (connection) {
            connection.channel = channel
            this.attachChannel(channel, guestPeerId)
        }

        const offer = await createOffer(pc)
        this.signaling?.send({
            type: 'signal',
            roomId: this.roomId,
            to: guestPeerId,
            payload: { kind: 'offer', sdp: offer },
        })

        this.updatePeerCount()
    }

    private teardownGuestConnection(guestPeerId: string) {
        const connection = this.guestConnections.get(guestPeerId)

        if (!connection) {
            return
        }

        connection.channel?.close()
        connection.pc.close()
        this.guestConnections.delete(guestPeerId)
        this.updatePeerCount()
    }

    private async handleSignal(fromPeerId: string, payload: SignalPayload) {
        if (this.role === 'host') {
            const connection = this.guestConnections.get(fromPeerId)

            if (!connection) {
                return
            }

            await applySignalPayload(connection.pc, payload, false, connection.pendingIce)
            return
        }

        if (this.role !== 'guest') {
            return
        }

        if (payload.kind === 'offer') {
            if (!this.guestPc) {
                this.guestPc = createPeerConnection({
                    onSignal: (outgoing) => {
                        if (!this.roomId || !this.hostPeerId) {
                            return
                        }

                        this.signaling?.send({
                            type: 'signal',
                            roomId: this.roomId,
                            to: this.hostPeerId,
                            payload: outgoing,
                        })
                    },
                    onDataChannel: (channel) => {
                        this.guestChannel = channel
                        this.attachChannel(channel, fromPeerId)
                    },
                })
            }

            const answer = await applySignalPayload(this.guestPc, payload, true, this.guestPendingIce)

            if (answer && this.roomId && this.hostPeerId) {
                this.signaling?.send({
                    type: 'signal',
                    roomId: this.roomId,
                    to: this.hostPeerId,
                    payload: { kind: 'answer', sdp: answer },
                })
            }

            return
        }

        if (payload.kind === 'ice' && payload.candidate && !this.guestPc) {
            this.guestPendingIce.push(payload.candidate)
            return
        }

        if (this.guestPc) {
            await applySignalPayload(this.guestPc, payload, false, this.guestPendingIce)
        }
    }

    private attachChannel(channel: RTCDataChannel, remotePeerId: string, onOpenExtra?: () => void) {
        attachDataChannelHandlers(channel, (raw) => {
            const message = parseCollabMessage(raw)

            if (!message) {
                collabXferLog.warn(`parse failed from ${remotePeerId.slice(0, 8)} ${raw.length}B`)
                return
            }

            collabXferLog.rx(message, remotePeerId, raw.length)

            if (message.type === 'hello' && this.role === 'host') {
                collabLog('hello from guest', remotePeerId.slice(0, 8), 'rev', message.revision)
                collabXferLog.snapshotPhase('hello-request', remotePeerId.slice(0, 8))

                const connection = this.guestConnections.get(remotePeerId)
                const channel = connection?.channel

                if (!channel) {
                    collabWarn('hello from guest but data channel missing', remotePeerId.slice(0, 8))
                    collabXferLog.warn(`hello without channel from ${remotePeerId.slice(0, 8)}`)
                    return
                }

                if (connection.snapshotSent && !connection.snapshotSendInFlight) {
                    collabLog('hello: retry snapshot (guest may have missed first send)')
                    connection.snapshotSent = false
                }

                void this.sendSnapshotToChannel(channel, remotePeerId).catch((error) => {
                    collabError('sendSnapshot after hello failed:', error)
                    collabXferLog.error(`snapshot after hello failed: ${String(error)}`)
                })
                return
            }

            if (message.peerId === this.peerId) {
                return
            }

            void (async () => {
                const relay = await this.callbacks.onRemoteMessage?.(message)

                if (this.role === 'host') {
                    this.fanOut(relay ?? message, remotePeerId)
                }
            })()
        }, () => {
            collabLog('data channel open', this.role, 'remote', remotePeerId.slice(0, 8))
            this.setStatus('connected')
            collabProfiler.logConnection(this.role ?? 'guest', 'p2p connected', remotePeerId)

            if (this.role === 'guest') {
                this.updatePeerCount()

                if (this.peerId) {
                    sendDataChannelMessage(
                        channel,
                        createHelloMessage(this.peerId, this.revision, this.projectName, this.hostProjectId || undefined),
                    )
                }
            }

            onOpenExtra?.()
        })
    }

    private fanOut(message: CollabSyncMessage, sourcePeerId: string) {
        for (const [peerId, connection] of this.guestConnections.entries()) {
            if (peerId === sourcePeerId || !connection.channel) {
                continue
            }

            collabXferLog.relay(message, sourcePeerId, peerId)
            sendDataChannelMessage(connection.channel, message, peerId)
        }
    }

    private sendSnapshotToChannel(channel: RTCDataChannel, guestPeerId?: string): Promise<void> {
        const connection = guestPeerId ? this.guestConnections.get(guestPeerId) : undefined

        if (connection?.snapshotSent) {
            collabLog('sendSnapshot: already sent to', guestPeerId?.slice(0, 8))
            return Promise.resolve()
        }

        if (connection?.snapshotSendInFlight) {
            collabLog('sendSnapshot: already in flight for', guestPeerId?.slice(0, 8))
            return connection.snapshotSendInFlight
        }

        const sendPromise = this.sendSnapshotToChannelInner(channel, guestPeerId)

        if (connection) {
            connection.snapshotSendInFlight = sendPromise
        }

        return sendPromise.finally(() => {
            if (connection) {
                connection.snapshotSendInFlight = null
            }
        })
    }

    private async sendSnapshotToChannelInner(channel: RTCDataChannel, guestPeerId?: string) {
        if (!this.peerId) {
            collabWarn('sendSnapshot: no peerId')
            return
        }

        const connection = guestPeerId ? this.guestConnections.get(guestPeerId) : undefined

        if (connection?.snapshotSent) {
            return
        }

        if (connection) {
            connection.snapshotSent = true
        }

        try {
            await this.sendSnapshotPayload(channel, guestPeerId, connection)
        } catch (error) {
            if (connection) {
                connection.snapshotSent = false
            }
            throw error
        }
    }

    private async sendSnapshotPayload(
        channel: RTCDataChannel,
        guestPeerId: string | undefined,
        _connection: GuestConnection | undefined,
    ) {
        this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('preparing', { guestPeerId }))

        if (channel.readyState !== 'open') {
            collabLog('sendSnapshot: waiting for channel open...')
            await waitForDataChannelOpen(channel)
        }

        const persistDataRaw = this.getPersistData?.() ?? null

        if (!persistDataRaw) {
            collabWarn('sendSnapshot: no data — host must keep a project open in the editor')
            this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('error', {
                guestPeerId,
                error: 'Нет данных проекта — держите редактор открытым',
            }))
            throw new Error('No persist data for snapshot')
        }

        this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('building-assets', {
            guestPeerId,
            detail: 'Подготовка…',
        }))

        let snapshotForAssets: CollabSnapshot | null = null

        try {
            snapshotForAssets = await this.getSnapshot?.() ?? null
        } catch (error) {
            collabError('sendSnapshot: asset export failed:', error)
            this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('error', {
                guestPeerId,
                error: 'Ошибка экспорта ассетов',
            }))
            throw error
        }

        const availableAssetIds = new Set((snapshotForAssets?.assets ?? []).map(asset => asset.id))
        const persistData = buildJoinPersistData(
            pruneMissingAssetReferencesInPersistData(persistDataRaw, availableAssetIds),
        )
        const revision = Math.max(this.revision, snapshotForAssets?.revision ?? 0)
        this.revision = revision

        const pendingAssetCount = snapshotForAssets?.assets.length ?? 0
        const stateBytes = measureJsonBytes(persistData)
        const activeBoard = persistData.boards.find(board => board.id === persistData.activeBoardId)

        collabLog('sendSnapshot: join state', stateBytes, 'bytes,', pendingAssetCount, 'assets pending')
        collabXferLog.snapshotPhase('send-state', `${stateBytes}B rules ${activeBoard?.gameState.styleRules?.length ?? 0} assets pending ${pendingAssetCount} → ${guestPeerId?.slice(0, 8) ?? '?'}`)

        this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('sending-state', { guestPeerId }))

        const sent = sendSnapshotState({
            channel,
            peerId: this.peerId!,
            revision,
            projectName: this.projectName,
            hostProjectId: this.hostProjectId,
            data: persistData,
            pendingAssetCount,
            onChunkProgress: (sentChunks, totalChunks) => {
                this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('sending-state', {
                    guestPeerId,
                    stateChunkSent: sentChunks,
                    stateChunkTotal: totalChunks,
                }))
            },
        })

        if (!sent) {
            collabWarn('sendSnapshot: failed to send state')
            this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('error', {
                guestPeerId,
                error: 'Не удалось отправить состояние',
            }))
            throw new Error('Failed to send snapshot state')
        }

        await this.sendAssetChunks(channel, revision, guestPeerId, snapshotForAssets)
    }

    private async sendAssetChunks(
        channel: RTCDataChannel,
        revision: number,
        guestPeerId?: string,
        prefetchedSnapshot?: CollabSnapshot | null,
    ) {
        if (!this.peerId) {
            this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('done', {
                guestPeerId,
                detail: 'Без ассетов',
            }))
            return
        }

        let snapshot = prefetchedSnapshot ?? null

        if (!snapshot && this.getSnapshot) {
            this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('building-assets', { guestPeerId }))

            try {
                snapshot = await this.getSnapshot()
            } catch (error) {
                collabError('sendSnapshot: asset export failed:', error)
                this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('error', {
                    guestPeerId,
                    error: 'Ошибка экспорта ассетов',
                }))
                return
            }
        }

        if (!snapshot?.assets.length) {
            collabLog('sendSnapshot: no assets to send')
            this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('done', {
                guestPeerId,
                detail: 'Без ассетов',
            }))
            return
        }

        collabLog('sendSnapshot: sending', snapshot.assets.length, 'assets as chunks')
        collabXferLog.snapshotPhase('send-assets', `${snapshot.assets.length} → ${guestPeerId?.slice(0, 8) ?? '?'}`)

        let sentAssets = 0

        for (let index = 0; index < snapshot.assets.length; index += 1) {
            const asset = snapshot.assets[index]

            this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('sending-assets', {
                guestPeerId,
                assetSent: sentAssets,
                assetTotal: snapshot.assets.length,
            }))

            const sent = sendAsset({
                channel,
                peerId: this.peerId,
                revision,
                assetIndex: index,
                assetTotal: snapshot.assets.length,
                asset,
            })

            if (sent) {
                sentAssets += 1
                this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('sending-assets', {
                    guestPeerId,
                    assetSent: sentAssets,
                    assetTotal: snapshot.assets.length,
                }))
            } else {
                collabWarn('sendSnapshot: failed asset', asset.name)
                this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('error', {
                    guestPeerId,
                    error: `Не удалось отправить ассет «${asset.name}»`,
                }))
                return
            }
        }

        collabLog('sendSnapshot: assets sent', sentAssets, '/', snapshot.assets.length)
        collabXferLog.snapshotPhase('assets-done', `${sentAssets}/${snapshot.assets.length}`)
        this.callbacks.onHostSnapshotProgress?.(hostSnapshotProgressForPhase('done', {
            guestPeerId,
            detail: sentAssets === snapshot.assets.length
                ? `${sentAssets} ассетов`
                : `${sentAssets} / ${snapshot.assets.length} ассетов`,
        }))
    }

    broadcastOps(revision: number, ops: CollabOp[]) {
        if (ops.length === 0 || !this.peerId) {
            return
        }

        this.revision = Math.max(this.revision, revision)

        if (this.role === 'host') {
            for (const connection of this.guestConnections.values()) {
                if (connection.channel) {
                    sendOps({
                        channel: connection.channel,
                        peerId: this.peerId,
                        revision,
                        ops,
                        targetPeer: connection.peerId,
                    })
                }
            }
            return
        }

        if (this.guestChannel) {
            sendOps({
                channel: this.guestChannel,
                peerId: this.peerId,
                revision,
                ops,
                targetPeer: this.hostPeerId ?? undefined,
            })
        }
    }

    broadcastLiveAsset(asset: ProjectFileAsset) {
        if (!this.peerId) {
            return
        }

        const revision = this.revision

        if (this.role === 'host') {
            for (const connection of this.guestConnections.values()) {
                if (connection.channel) {
                    sendLiveAsset({
                        channel: connection.channel,
                        peerId: this.peerId,
                        revision,
                        asset,
                        targetPeer: connection.peerId,
                    })
                }
            }
            return
        }

        if (this.guestChannel) {
            sendLiveAsset({
                channel: this.guestChannel,
                peerId: this.peerId,
                revision,
                asset,
                targetPeer: this.hostPeerId ?? undefined,
            })
        }
    }

    broadcastLiveAssetRemove(assetId: number) {
        if (!this.peerId) {
            return
        }

        const revision = this.revision

        if (this.role === 'host') {
            for (const connection of this.guestConnections.values()) {
                if (connection.channel) {
                    sendLiveAssetRemove({
                        channel: connection.channel,
                        peerId: this.peerId,
                        revision,
                        assetId,
                        targetPeer: connection.peerId,
                    })
                }
            }
            return
        }

        if (this.guestChannel) {
            sendLiveAssetRemove({
                channel: this.guestChannel,
                peerId: this.peerId,
                revision,
                assetId,
                targetPeer: this.hostPeerId ?? undefined,
            })
        }
    }

    close() {
        for (const connection of this.guestConnections.values()) {
            connection.channel?.close()
            connection.pc.close()
        }

        this.guestConnections.clear()
        this.guestChannel?.close()
        this.guestPc?.close()
        this.guestChannel = null
        this.guestPc = null

        if (this.signaling) {
            try {
                this.signaling.send({ type: 'leave-room' })
            } catch {
                // ignore
            }
            this.signaling.close()
        }

        this.signaling = null
        this.roomId = null
        this.role = null
        this.hostPeerId = null
        this.roomParticipantCount = null
        collabProfiler.reset()
        this.setStatus('idle')
        this.updatePeerCount()
    }
}

export async function waitForGuestConnection(session: CollabSession, timeoutMs = 15000): Promise<void> {
    if (session.status === 'connected') {
        return
    }

    return new Promise((resolve, reject) => {
        const started = Date.now()
        const timer = window.setInterval(() => {
            if (session.status === 'connected') {
                window.clearInterval(timer)
                resolve()
                return
            }

            if (session.status === 'error') {
                window.clearInterval(timer)
                reject(new Error('Collaboration session failed'))
                return
            }

            if (Date.now() - started > timeoutMs) {
                window.clearInterval(timer)
                reject(new Error('Collaboration connection timed out'))
            }
        }, 100)
    })
}
