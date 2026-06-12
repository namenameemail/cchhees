import { collabLog, collabWarn } from './debug'
import { collabXferLog } from './collabXferLog'
import { createSnapshotMessage, createPatchMessage, createOpsMessage } from './syncEngine'
import { CollabOp } from './ops'
import { ProjectPersistData } from '../projects/types'
import { ProjectFileAsset } from '../projects/projectFile'
import { CollabSyncMessage } from './types'

/** WebRTC DataChannel safe payload limit (bytes). */
export const MAX_MESSAGE_BYTES = 56_000

/** Raw JSON fragment size (envelope adds overhead). */
const CHUNK_PAYLOAD_BYTES = 48_000

export function measureJsonBytes(value: unknown): number {
    return new TextEncoder().encode(JSON.stringify(value)).length
}

export function sendJsonMessage(
    channel: RTCDataChannel,
    message: unknown,
    targetPeer?: string,
): boolean {
    if (channel.readyState !== 'open') {
        collabWarn('send skipped: channel not open', channel.readyState, (message as { type?: string }).type)
        collabXferLog.warn(`send skipped: channel ${channel.readyState} type ${(message as { type?: string }).type}`)
        return false
    }

    const bytes = measureJsonBytes(message)

    if (bytes > MAX_MESSAGE_BYTES) {
        collabWarn('send skipped: message too large', (message as { type?: string }).type, bytes, 'bytes')
        collabXferLog.warn(`send skipped: too large ${(message as { type?: string }).type} ${bytes}B`)
        return false
    }

    try {
        channel.send(JSON.stringify(message))
        collabLog('sent', (message as { type?: string }).type, bytes, 'bytes')

        const typed = message as CollabSyncMessage

        if (typed?.type && typeof typed.revision === 'number') {
            collabXferLog.tx(typed, bytes, targetPeer)
        }

        return true
    } catch (error) {
        collabWarn('send failed', (message as { type?: string }).type, error)
        collabXferLog.error(`send failed ${(message as { type?: string }).type}: ${String(error)}`)
        return false
    }
}

function splitUtf8String(text: string, maxBytes: number): string[] {
    if (new TextEncoder().encode(text).length <= maxBytes) {
        return [text]
    }

    const chunks: string[] = []
    let offset = 0

    while (offset < text.length) {
        let low = offset + 1
        let high = text.length
        let best = offset + 1

        while (low <= high) {
            const mid = Math.floor((low + high) / 2)
            const slice = text.slice(offset, mid)
            const size = new TextEncoder().encode(slice).length

            if (size <= maxBytes) {
                best = mid
                low = mid + 1
            } else {
                high = mid - 1
            }
        }

        if (best === offset) {
            throw new Error('Cannot chunk state: single character exceeds limit')
        }

        chunks.push(text.slice(offset, best))
        offset = best
    }

    return chunks
}

export interface SendSnapshotStateOptions {
    channel: RTCDataChannel
    peerId: string
    revision: number
    projectName: string
    hostProjectId: string
    data: ProjectPersistData
    pendingAssetCount: number
    onChunkProgress?: (sent: number, total: number) => void
}

export function sendSnapshotState(options: SendSnapshotStateOptions): boolean {
    const {
        channel,
        peerId,
        revision,
        projectName,
        hostProjectId,
        data,
        pendingAssetCount,
        onChunkProgress,
    } = options

    const singleMessage = createSnapshotMessage(peerId, revision, projectName, hostProjectId, data, [])

    if (pendingAssetCount === 0 && measureJsonBytes({ ...singleMessage, pendingAssetCount: 0 }) <= MAX_MESSAGE_BYTES) {
        return sendJsonMessage(channel, { ...singleMessage, pendingAssetCount: 0 })
    }

    const dataJson = JSON.stringify(data)
    const chunks = splitUtf8String(dataJson, CHUNK_PAYLOAD_BYTES)

    collabLog(
        'sendSnapshot: chunking state into',
        chunks.length,
        'parts,',
        new TextEncoder().encode(dataJson).length,
        'bytes',
    )

    const metaMessage = {
        type: 'snapshot-meta' as const,
        revision,
        peerId,
        projectName,
        hostProjectId,
        stateChunkCount: chunks.length,
        pendingAssetCount,
    }

    if (!sendJsonMessage(channel, metaMessage)) {
        return false
    }

    for (let index = 0; index < chunks.length; index += 1) {
        onChunkProgress?.(index, chunks.length)

        const sent = sendJsonMessage(channel, {
            type: 'state-chunk' as const,
            revision,
            peerId,
            index,
            total: chunks.length,
            data: chunks[index],
        })

        if (!sent) {
            collabWarn('sendSnapshot: failed at state chunk', index + 1, '/', chunks.length)
            return false
        }
    }

    onChunkProgress?.(chunks.length, chunks.length)
    return true
}

export interface SendAssetOptions {
    channel: RTCDataChannel
    peerId: string
    revision: number
    assetIndex: number
    assetTotal: number
    asset: ProjectFileAsset
    onDataChunkProgress?: (sent: number, total: number) => void
}

export function sendAsset(options: SendAssetOptions): boolean {
    const {
        channel,
        peerId,
        revision,
        assetIndex,
        assetTotal,
        asset,
        onDataChunkProgress,
    } = options

    const inlineMessage = {
        type: 'asset-chunk' as const,
        peerId,
        revision,
        assetIndex,
        assetTotal,
        asset,
    }

    if (measureJsonBytes(inlineMessage) <= MAX_MESSAGE_BYTES) {
        return sendJsonMessage(channel, inlineMessage)
    }

    const dataChunks = splitUtf8String(asset.data, CHUNK_PAYLOAD_BYTES)

    collabLog(
        'sendAsset: chunking',
        asset.name,
        'into',
        dataChunks.length,
        'parts,',
        asset.data.length,
        'base64 chars',
    )

    const metaMessage = {
        type: 'asset-meta' as const,
        peerId,
        revision,
        assetIndex,
        assetTotal,
        assetId: asset.id,
        assetName: asset.name,
        mimeType: asset.mimeType,
        dataChunkCount: dataChunks.length,
    }

    if (!sendJsonMessage(channel, metaMessage)) {
        return false
    }

    for (let index = 0; index < dataChunks.length; index += 1) {
        onDataChunkProgress?.(index, dataChunks.length)

        const sent = sendJsonMessage(channel, {
            type: 'asset-data-chunk' as const,
            peerId,
            revision,
            assetIndex,
            assetId: asset.id,
            index,
            total: dataChunks.length,
            data: dataChunks[index],
        })

        if (!sent) {
            collabWarn('sendAsset: failed at data chunk', index + 1, '/', dataChunks.length, asset.name)
            return false
        }
    }

    onDataChunkProgress?.(dataChunks.length, dataChunks.length)
    return true
}

export interface SendLiveAssetOptions {
    channel: RTCDataChannel
    peerId: string
    revision: number
    asset: ProjectFileAsset
    targetPeer?: string
}

export function sendLiveAsset(options: SendLiveAssetOptions): boolean {
    const { channel, peerId, revision, asset, targetPeer } = options

    const inlineMessage = {
        type: 'live-asset-chunk' as const,
        peerId,
        revision,
        asset,
    }

    if (measureJsonBytes(inlineMessage) <= MAX_MESSAGE_BYTES) {
        return sendJsonMessage(channel, inlineMessage, targetPeer)
    }

    const dataChunks = splitUtf8String(asset.data, CHUNK_PAYLOAD_BYTES)

    collabLog(
        'sendLiveAsset: chunking',
        asset.name,
        'into',
        dataChunks.length,
        'parts',
    )

    const metaMessage = {
        type: 'live-asset-meta' as const,
        peerId,
        revision,
        assetId: asset.id,
        assetName: asset.name,
        mimeType: asset.mimeType,
        dataChunkCount: dataChunks.length,
    }

    if (!sendJsonMessage(channel, metaMessage, targetPeer)) {
        return false
    }

    for (let index = 0; index < dataChunks.length; index += 1) {
        const sent = sendJsonMessage(channel, {
            type: 'live-asset-data-chunk' as const,
            peerId,
            revision,
            assetId: asset.id,
            index,
            total: dataChunks.length,
            data: dataChunks[index],
        }, targetPeer)

        if (!sent) {
            collabWarn('sendLiveAsset: failed at data chunk', index + 1, '/', dataChunks.length, asset.name)
            return false
        }
    }

    return true
}

export interface SendLiveAssetRemoveOptions {
    channel: RTCDataChannel
    peerId: string
    revision: number
    assetId: number
    targetPeer?: string
}

export function sendLiveAssetRemove(options: SendLiveAssetRemoveOptions): boolean {
    const { channel, peerId, revision, assetId, targetPeer } = options

    return sendJsonMessage(channel, {
        type: 'live-asset-remove' as const,
        peerId,
        revision,
        assetId,
    }, targetPeer)
}

export interface SendOpsOptions {
    channel: RTCDataChannel
    peerId: string
    revision: number
    ops: CollabOp[]
    targetPeer?: string
}

export function sendOps(options: SendOpsOptions): boolean {
    const { channel, peerId, revision, ops, targetPeer } = options

    const singleMessage = createOpsMessage(peerId, revision, ops)

    if (measureJsonBytes(singleMessage) <= MAX_MESSAGE_BYTES) {
        return sendJsonMessage(channel, singleMessage, targetPeer)
    }

    const payloadJson = JSON.stringify(ops)
    const chunks = splitUtf8String(payloadJson, CHUNK_PAYLOAD_BYTES)

    collabLog(
        'sendOps: chunking',
        ops.length,
        'ops into',
        chunks.length,
        'parts,',
        new TextEncoder().encode(payloadJson).length,
        'bytes',
    )

    const metaMessage = {
        type: 'ops-meta' as const,
        revision,
        peerId,
        stateChunkCount: chunks.length,
    }

    if (!sendJsonMessage(channel, metaMessage, targetPeer)) {
        return false
    }

    for (let index = 0; index < chunks.length; index += 1) {
        const sent = sendJsonMessage(channel, {
            type: 'ops-chunk' as const,
            revision,
            peerId,
            index,
            total: chunks.length,
            data: chunks[index],
        }, targetPeer)

        if (!sent) {
            collabWarn('sendOps: failed at chunk', index + 1, '/', chunks.length)
            return false
        }
    }

    return true
}

export interface SendPatchOptions {
    channel: RTCDataChannel
    peerId: string
    revision: number
    data: ProjectPersistData
}

export function sendPatch(options: SendPatchOptions): boolean {
    const { channel, peerId, revision, data } = options

    const singleMessage = createPatchMessage(peerId, revision, data)

    if (measureJsonBytes(singleMessage) <= MAX_MESSAGE_BYTES) {
        return sendJsonMessage(channel, singleMessage)
    }

    const dataJson = JSON.stringify(data)
    const chunks = splitUtf8String(dataJson, CHUNK_PAYLOAD_BYTES)

    collabLog(
        'sendPatch: chunking into',
        chunks.length,
        'parts,',
        new TextEncoder().encode(dataJson).length,
        'bytes',
    )

    const metaMessage = {
        type: 'patch-meta' as const,
        revision,
        peerId,
        stateChunkCount: chunks.length,
    }

    if (!sendJsonMessage(channel, metaMessage)) {
        return false
    }

    for (let index = 0; index < chunks.length; index += 1) {
        const sent = sendJsonMessage(channel, {
            type: 'patch-chunk' as const,
            revision,
            peerId,
            index,
            total: chunks.length,
            data: chunks[index],
        })

        if (!sent) {
            collabWarn('sendPatch: failed at chunk', index + 1, '/', chunks.length)
            return false
        }
    }

    return true
}
