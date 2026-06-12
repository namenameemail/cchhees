import { CollabOp } from './ops'
import { ProjectFileAsset } from '../projects/projectFile'
import { ProjectPersistData } from '../projects/types'

export type CollabSessionStatus =
    | 'idle'
    | 'connecting'
    | 'hosting'
    | 'joining'
    | 'connected'
    | 'error'

export type SignalPayload =
    | { kind: 'offer'; sdp: RTCSessionDescriptionInit }
    | { kind: 'answer'; sdp: RTCSessionDescriptionInit }
    | { kind: 'ice'; candidate: RTCIceCandidateInit | null }

export interface CollabSyncMessage {
    type: 'hello' | 'snapshot' | 'snapshot-meta' | 'state-chunk' | 'patch' | 'patch-meta' | 'patch-chunk'
        | 'ops' | 'ops-meta' | 'ops-chunk'
        | 'asset-chunk' | 'asset-meta' | 'asset-data-chunk'
        | 'live-asset-chunk' | 'live-asset-meta' | 'live-asset-data-chunk'
        | 'live-asset-remove'
    revision: number
    peerId: string
    projectName?: string
    /** Host local project UUID — slot identity for guest visited rooms. */
    hostProjectId?: string
    data?: ProjectPersistData | string
    assets?: ProjectFileAsset[]
    ops?: CollabOp[]
    /** Snapshot sent without assets; guest waits for asset-chunk messages. */
    pendingAssetCount?: number
    /** Chunked state transfer (snapshot-meta + state-chunk). */
    stateChunkCount?: number
    index?: number
    total?: number
    assetIndex?: number
    assetTotal?: number
    asset?: ProjectFileAsset
    /** Chunked asset transfer (asset-meta + asset-data-chunk). */
    assetId?: number
    assetName?: string
    mimeType?: string
    dataChunkCount?: number
}

export interface CollabSnapshot {
    revision: number
    projectName: string
    hostProjectId: string
    data: ProjectPersistData
    assets: ProjectFileAsset[]
}
