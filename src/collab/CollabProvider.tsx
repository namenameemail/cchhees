import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { CollabSession, waitForGuestConnection } from './CollabSession'
import { buildCollabSnapshot, buildCollabSnapshotFromPersist, exportAssetById } from './snapshot'
import { applyOpsToPersistData, opsAffectVisibleGameState } from './applyOpsToPersistData'
import { importLiveAsset } from './liveAsset'
import { deleteAsset } from '../projects/db'
import { ProjectSessionKind } from '../projects/visitedRooms/types'
import { shouldApplyRevision } from './syncEngine'
import { CollabOp, normalizeCollabOps } from './ops'
import { CollabSessionStatus, CollabSnapshot, CollabSyncMessage } from './types'
import { useProjectContext } from '../projects/ProjectContext'
import { ActiveBoardPersistPayload } from '../projects/projectPersist'
import { ProjectPersistData } from '../projects/types'
import { GameState } from '../game/types/gameState'
import { ProjectFileAsset } from '../projects/projectFile'
import { collabError, collabLog, collabWarn } from './debug'
import { collabProfiler } from './collabProfiler'
import { collabXferLog } from './collabXferLog'
import { collectAssetIdsFromOps } from './collectOpsAssetIds'
import {
    remapCollabOpsToHostWire,
    remapIncomingCollabAssetId,
    remapIncomingCollabOpsAssetIds,
    remapOutgoingCollabAssetId,
} from './assetIdWire'
import { HostSnapshotProgress, hostSnapshotProgressForPhase, IDLE_HOST_SNAPSHOT_PROGRESS } from './hostSnapshotProgress'
import { IDLE_JOIN_PROGRESS, joinProgressForPhase, JoinProgress } from './joinProgress'

const BROADCAST_DELAY_MS = 150
const JOIN_SNAPSHOT_TIMEOUT_MS = 5 * 60 * 1000

interface PendingAssetAssembly {
    id: number
    name: string
    mimeType: string
    dataChunkCount: number
    dataChunks: string[]
}

function countReceivedAssets(assets: (ProjectFileAsset | undefined)[]): number {
    return assets.reduce((count, asset) => count + (asset ? 1 : 0), 0)
}

function buildAssetsArray(assets: (ProjectFileAsset | undefined)[]): ProjectFileAsset[] {
    return assets.filter((asset): asset is ProjectFileAsset => asset !== undefined)
}

export interface CollabGameBridge {
    getPersistData: () => ProjectPersistData | null
    applyRemotePersist: (data: ProjectPersistData) => void
    applyRemoteOps: (ops: CollabOp[]) => GameState
    onRemoteOps?: (ops: CollabOp[]) => void
}

export interface CollabAssetsBridge {
    onRemoteAsset: (asset: ProjectFileAsset) => Promise<void>
    onRemoteAssetRemoved: (assetId: number) => Promise<void>
}

export interface CollabSessionTarget {
    projectId: string
    projectKind: ProjectSessionKind
    projectName: string
    hostProjectId?: string
}

export interface CollabContextValue {
    status: CollabSessionStatus
    roomId: string | null
    peerCount: number
    error: string | null
    joinProgress: JoinProgress
    hostSnapshotProgress: HostSnapshotProgress
    collabSessionTarget: CollabSessionTarget | null
    isViewingCollabTarget: boolean
    registerGameBridge: (bridge: CollabGameBridge | null) => void
    registerAssetsBridge: (bridge: CollabAssetsBridge | null) => void
    broadcastAssetAdded: (assetId: number) => Promise<void>
    broadcastAssetRemoved: (assetId: number) => Promise<void>
    createCollabOnPersist: (basePersist: (data: ActiveBoardPersistPayload) => void) => (data: ActiveBoardPersistPayload) => void
    createCollabOnOp: () => (op: CollabOp | CollabOp[]) => void
    startHosting: () => Promise<void>
    joinRoomAndImport: (roomId: string) => Promise<void>
    leaveSession: () => void
}

const defaultValue: CollabContextValue = {
    status: 'idle',
    roomId: null,
    peerCount: 0,
    error: null,
    joinProgress: IDLE_JOIN_PROGRESS,
    hostSnapshotProgress: IDLE_HOST_SNAPSHOT_PROGRESS,
    collabSessionTarget: null,
    isViewingCollabTarget: false,
    registerGameBridge: () => {},
    registerAssetsBridge: () => {},
    broadcastAssetAdded: async () => {},
    broadcastAssetRemoved: async () => {},
    createCollabOnPersist: base => base,
    createCollabOnOp: () => () => {},
    startHosting: async () => {},
    joinRoomAndImport: async () => {},
    leaveSession: () => {},
}

export const CollabContext = createContext<CollabContextValue>(defaultValue)

export function CollabProvider({ children }: { children: React.ReactNode }) {
    const {
        currentProject,
        currentProjectKind,
        persistProjectData,
        importCollaborativeProject,
        getPersistDataForSession,
        persistProjectDataForSession,
        getHostAssetIdRemapFor,
        appendHostAssetIdRemapFor,
    } = useProjectContext()

    const [status, setStatus] = useState<CollabSessionStatus>('idle')
    const [roomId, setRoomId] = useState<string | null>(null)
    const [peerCount, setPeerCount] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [joinProgress, setJoinProgress] = useState<JoinProgress>(IDLE_JOIN_PROGRESS)
    const [hostSnapshotProgress, setHostSnapshotProgress] = useState<HostSnapshotProgress>(IDLE_HOST_SNAPSHOT_PROGRESS)
    const [collabSessionTarget, setCollabSessionTarget] = useState<CollabSessionTarget | null>(null)

    const sessionRef = useRef<CollabSession | null>(null)
    const collabSessionTargetRef = useRef<CollabSessionTarget | null>(null)
    const isViewingCollabTargetRef = useRef(false)
    const joinActiveRef = useRef(false)
    const hostSnapshotResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const gameBridgeRef = useRef<CollabGameBridge | null>(null)
    const assetsBridgeRef = useRef<CollabAssetsBridge | null>(null)
    const liveAssetChunksRef = useRef<Map<number, PendingAssetAssembly>>(new Map())
    const pendingLiveAssetImportsRef = useRef<Map<number, Promise<void>>>(new Map())
    const remoteMessageChainRef = useRef<Promise<CollabSyncMessage | void>>(Promise.resolve())
    const revisionRef = useRef(0)
    const isApplyingRemoteRef = useRef(false)
    const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pendingSnapshotRef = useRef<{
        resolve: (snapshot: CollabSnapshot) => void
        reject: (error: Error) => void
    } | null>(null)
    const patchAssemblyRef = useRef<{
        revision: number
        peerId: string
        stateChunkCount: number
        stateChunks: string[]
    } | null>(null)
    const pendingOpsRef = useRef<CollabOp[]>([])
    const snapshotAssemblyRef = useRef<{
        snapshot: CollabSnapshot
        expectedAssets: number
        receivedAssets: (ProjectFileAsset | undefined)[]
        pendingAssetChunks: Map<number, PendingAssetAssembly>
        stateChunkCount: number
        stateChunks: string[]
        stateComplete: boolean
    } | null>(null)

    const tryFinishSnapshotAssembly = useCallback(() => {
        const assembly = snapshotAssemblyRef.current

        if (!assembly || !assembly.stateComplete) {
            collabXferLog.assemblyWaiting(
                assembly?.stateComplete ?? false,
                countReceivedAssets(assembly?.receivedAssets ?? []),
                assembly?.expectedAssets ?? 0,
                [],
                [],
            )
            return
        }

        const receivedCount = countReceivedAssets(assembly.receivedAssets)

        if (receivedCount < assembly.expectedAssets) {
            const missingIndices = assembly.receivedAssets
                .map((a, i) => (a === undefined ? i : -1))
                .filter(i => i >= 0)
            const pendingChunks = [...assembly.pendingAssetChunks.entries()].map(
                ([idx, p]) => `slot${idx} «${p.name}» ${p.dataChunks.filter(c => c.length > 0).length}/${p.dataChunkCount}ch`,
            )
            collabXferLog.assemblyWaiting(
                true,
                receivedCount,
                assembly.expectedAssets,
                missingIndices,
                pendingChunks,
            )
            if (joinActiveRef.current) {
                setJoinProgress(joinProgressForPhase(
                    'assets',
                    undefined,
                    receivedCount,
                    assembly.expectedAssets,
                ))
            }
            return
        }

        const complete: CollabSnapshot = {
            ...assembly.snapshot,
            assets: buildAssetsArray(assembly.receivedAssets),
        }

        collabLog('snapshot complete:', complete.projectName, complete.assets.length, 'assets')
        const styleRulesCount = complete.data?.boards.find(board => board.id === complete.data?.activeBoardId)?.gameState.styleRules?.length ?? 0
        collabProfiler.snapshotComplete(complete.assets.length, styleRulesCount, complete.projectName)
        collabXferLog.snapshotPhase('import-ready', `«${complete.projectName}» assets ${complete.assets.length} rules ${styleRulesCount}`)
        snapshotAssemblyRef.current = null
        revisionRef.current = Math.max(revisionRef.current, complete.revision)

        if (sessionRef.current) {
            sessionRef.current.revision = revisionRef.current
        }

        collabProfiler.syncSession({ revision: revisionRef.current })

        pendingSnapshotRef.current?.resolve(complete)
        pendingSnapshotRef.current = null
    }, [])

    const beginSnapshotAssembly = useCallback((
        revision: number,
        projectName: string,
        hostProjectId: string,
        expectedAssets: number,
        stateChunkCount: number,
    ) => {
        snapshotAssemblyRef.current = {
            snapshot: {
                revision,
                projectName,
                hostProjectId,
                data: null as unknown as ProjectPersistData,
                assets: [],
            },
            expectedAssets,
            receivedAssets: expectedAssets > 0 ? new Array(expectedAssets) : [],
            pendingAssetChunks: new Map(),
            stateChunkCount,
            stateChunks: stateChunkCount > 0 ? new Array(stateChunkCount).fill('') : [],
            stateComplete: stateChunkCount === 0,
        }
    }, [])

    const applySnapshotData = useCallback((data: ProjectPersistData) => {
        const assembly = snapshotAssemblyRef.current

        if (!assembly) {
            return
        }

        assembly.snapshot = {
            ...assembly.snapshot,
            data,
        }
        assembly.stateComplete = true
        const activeBoard = data.boards.find(board => board.id === data.activeBoardId) ?? data.boards[0]
        collabProfiler.updateSnapshotState(activeBoard?.gameState.styleRules?.length ?? 0)
        tryFinishSnapshotAssembly()
    }, [tryFinishSnapshotAssembly])

    const isGuestOrigin = useCallback((message: CollabSyncMessage) => {
        const session = sessionRef.current
        return session?.role === 'host' && message.peerId !== session.peerId
    }, [])

    const isViewingCollabTarget = useMemo(() => {
        if (!collabSessionTarget || !currentProject) {
            return false
        }

        return collabSessionTarget.projectId === currentProject.id
            && collabSessionTarget.projectKind === currentProjectKind
    }, [collabSessionTarget, currentProject, currentProjectKind])

    useEffect(() => {
        isViewingCollabTargetRef.current = isViewingCollabTarget
    }, [isViewingCollabTarget])

    const getSessionHostAssetIdRemap = useCallback((): Record<number, number> | undefined => {
        const target = collabSessionTargetRef.current

        if (!target || target.projectKind !== 'visited') {
            return undefined
        }

        return getHostAssetIdRemapFor(target.projectId)
    }, [getHostAssetIdRemapFor])

    const applyIncomingOps = useCallback(async (
        revision: number,
        ops: CollabOp[],
        forceApply = false,
    ): Promise<CollabSyncMessage | void> => {
        if (ops.length === 0) {
            return
        }

        let effectiveRevision = revision

        if (forceApply && sessionRef.current?.role === 'host') {
            effectiveRevision = revisionRef.current + 1
        } else if (!shouldApplyRevision(revision, revisionRef.current)) {
            collabLog('ops skipped: stale revision', revision, '<=', revisionRef.current)
            collabXferLog.opsSkipped(`stale rev ${revision} <= local ${revisionRef.current}`, revision)
            return
        }

        revisionRef.current = effectiveRevision

        if (sessionRef.current) {
            sessionRef.current.revision = effectiveRevision
        }

        const target = collabSessionTargetRef.current

        if (!target) {
            collabWarn('ops received but no session target')
            collabXferLog.opsSkipped('no session target', revision)
            return
        }

        const hostRemap = target.projectKind === 'visited'
            ? getHostAssetIdRemapFor(target.projectId)
            : undefined
        const remappedOps = remapIncomingCollabOpsAssetIds(ops, hostRemap)

        isApplyingRemoteRef.current = true

        if (isViewingCollabTargetRef.current) {
            const bridge = gameBridgeRef.current

            if (!bridge) {
                collabWarn('ops received but game bridge is not ready')
                collabXferLog.opsSkipped('game bridge not ready', revision)
                isApplyingRemoteRef.current = false
                return
            }

            bridge.onRemoteOps?.(remappedOps)

            const data = bridge.getPersistData()

            if (!data) {
                collabWarn('ops received but persist data missing')
                collabXferLog.opsSkipped('persist data missing', revision)
                isApplyingRemoteRef.current = false
                return
            }

            const visibleBoardId = data.activeBoardId
            const next = applyOpsToPersistData(data, remappedOps, visibleBoardId)

            await persistProjectDataForSession(target.projectId, target.projectKind, next)

            if (opsAffectVisibleGameState(remappedOps, visibleBoardId, visibleBoardId)) {
                bridge.applyRemotePersist(next)
            }
        } else {
            const data = getPersistDataForSession(target.projectId, target.projectKind)

            if (!data) {
                collabWarn('ops offline: no persist data for session target')
                collabXferLog.opsSkipped('offline persist missing', revision)
                isApplyingRemoteRef.current = false
                return
            }

            const next = applyOpsToPersistData(data, remappedOps, data.activeBoardId)
            await persistProjectDataForSession(target.projectId, target.projectKind, next)
        }

        isApplyingRemoteRef.current = false
        collabLog('ops applied:', ops.length, 'revision', effectiveRevision)
        collabProfiler.opsApplied(ops.length, effectiveRevision)
        collabXferLog.opsApplied(remappedOps, effectiveRevision, forceApply ? 'guest→host relay' : 'remote')

        if (forceApply && sessionRef.current?.role === 'host' && sessionRef.current.peerId) {
            return {
                type: 'ops',
                revision: effectiveRevision,
                peerId: sessionRef.current.peerId,
                ops,
            }
        }

        return undefined
    }, [
        persistProjectData,
        getPersistDataForSession,
        persistProjectDataForSession,
        getHostAssetIdRemapFor,
    ])

    const waitForPendingAssetImports = useCallback(async (ops: CollabOp[]) => {
        const assetIds = collectAssetIdsFromOps(ops)

        if (assetIds.length === 0) {
            return
        }

        await Promise.all(
            assetIds.map(id => pendingLiveAssetImportsRef.current.get(id) ?? Promise.resolve()),
        )
    }, [])

    const handleRemoteLiveAsset = useCallback(async (asset: ProjectFileAsset) => {
        const inFlight = pendingLiveAssetImportsRef.current.get(asset.id)

        if (inFlight) {
            await inFlight
            return
        }

        const importPromise = (async () => {
            const target = collabSessionTargetRef.current

            if (!target) {
                collabWarn('live asset: no session target')
                collabXferLog.assetSkipped('no session target', asset.id, asset.name)
                return
            }

            if (isViewingCollabTargetRef.current) {
                const bridge = assetsBridgeRef.current

                if (!bridge) {
                    collabWarn('live asset: assets bridge not ready')
                    collabXferLog.assetSkipped('assets bridge not ready', asset.id, asset.name)
                    return
                }

                try {
                    await bridge.onRemoteAsset(asset)
                    collabLog('live asset applied:', asset.name, asset.id)
                    collabProfiler.logEvent(`live asset in ${asset.name}`)
                    collabXferLog.assetApplied(asset.id, asset.name, 'p2p')
                } catch (error) {
                    collabError('live asset import failed:', error)
                    collabXferLog.error(`live asset import «${asset.name}»: ${String(error)}`)
                    throw error
                }

                return
            }

            try {
                const importResult = await importLiveAsset(target.projectId, asset)

                if (target.projectKind === 'visited' && importResult.remappedFrom != null) {
                    await appendHostAssetIdRemapFor(
                        target.projectId,
                        importResult.remappedFrom,
                        importResult.id,
                    )
                }

                collabLog('live asset applied offline:', asset.name, asset.id)
                collabProfiler.logEvent(`live asset offline ${asset.name}`)
                collabXferLog.assetApplied(asset.id, asset.name, 'offline')
            } catch (error) {
                collabError('live asset offline import failed:', error)
                collabXferLog.error(`live asset offline «${asset.name}»: ${String(error)}`)
                throw error
            }
        })()

        pendingLiveAssetImportsRef.current.set(asset.id, importPromise)

        try {
            await importPromise
        } finally {
            if (pendingLiveAssetImportsRef.current.get(asset.id) === importPromise) {
                pendingLiveAssetImportsRef.current.delete(asset.id)
            }
        }
    }, [appendHostAssetIdRemapFor])

    const handleRemoteLiveAssetRemove = useCallback(async (assetId: number) => {
        const target = collabSessionTargetRef.current
        const hostRemap = target?.projectKind === 'visited'
            ? getHostAssetIdRemapFor(target.projectId)
            : undefined
        const localAssetId = remapIncomingCollabAssetId(assetId, hostRemap)

        liveAssetChunksRef.current.delete(assetId)
        pendingLiveAssetImportsRef.current.delete(assetId)

        if (isViewingCollabTargetRef.current) {
            const bridge = assetsBridgeRef.current

            if (!bridge) {
                collabWarn('live asset remove: assets bridge not ready', localAssetId)
                collabXferLog.assetSkipped('assets bridge not ready', localAssetId)
                return
            }

            try {
                await bridge.onRemoteAssetRemoved(localAssetId)
                collabLog('live asset removed:', assetId, localAssetId !== assetId ? `→ local ${localAssetId}` : '')
                collabProfiler.logEvent(`live asset out id=${localAssetId}`)
                collabXferLog.assetRemoveApplied(localAssetId, 'p2p')
            } catch (error) {
                collabError('live asset remove failed:', error)
                collabXferLog.error(`live asset remove id=${localAssetId}: ${String(error)}`)
                throw error
            }

            return
        }

        if (!target) {
            collabWarn('live asset remove: no session target', localAssetId)
            collabXferLog.assetSkipped('no session target', localAssetId)
            return
        }

        try {
            await deleteAsset(localAssetId)
            collabLog('live asset removed offline:', assetId, localAssetId !== assetId ? `→ local ${localAssetId}` : '')
            collabProfiler.logEvent(`live asset out offline id=${localAssetId}`)
            collabXferLog.assetRemoveApplied(localAssetId, 'offline')
        } catch (error) {
            collabError('live asset offline remove failed:', error)
            collabXferLog.error(`live asset offline remove id=${localAssetId}: ${String(error)}`)
            throw error
        }
    }, [getHostAssetIdRemapFor])

    const processRemoteMessage = useCallback(async (message: CollabSyncMessage): Promise<CollabSyncMessage | void> => {
        if (message.type === 'state-chunk' && typeof message.data === 'string' && message.index !== undefined) {
            const assembly = snapshotAssemblyRef.current

            if (!assembly || message.revision !== assembly.snapshot.revision) {
                collabWarn('state-chunk without matching assembly')
                return
            }

            assembly.stateChunks[message.index] = message.data

            if (joinActiveRef.current) {
                const received = assembly.stateChunks.filter(chunk => chunk.length > 0).length
                collabProfiler.updateStateChunks(received, assembly.stateChunkCount)
                setJoinProgress(joinProgressForPhase(
                    'snapshot',
                    `${received} / ${assembly.stateChunkCount} частей`,
                ))
            }

            const allReceived = assembly.stateChunks.every(chunk => chunk.length > 0)

            if (!allReceived) {
                return
            }

            try {
                const parsed = JSON.parse(assembly.stateChunks.join('')) as ProjectPersistData
                applySnapshotData(parsed)
            } catch (error) {
                collabError('state-chunk parse failed:', error)
                pendingSnapshotRef.current?.reject(new Error('Не удалось собрать snapshot'))
                pendingSnapshotRef.current = null
                snapshotAssemblyRef.current = null
            }

            return
        }

        if (message.type === 'snapshot-meta') {
            if (!pendingSnapshotRef.current) {
                collabLog('snapshot-meta ignored: no pending join')
                return
            }

            const existing = snapshotAssemblyRef.current

            if (
                existing
                && existing.snapshot.revision === message.revision
                && (existing.stateComplete || existing.receivedAssets.some(asset => asset !== undefined))
            ) {
                collabLog('snapshot-meta ignored: duplicate while assembling')
                collabXferLog.warn(`duplicate snapshot-meta rev ${message.revision}`)
                return
            }

            const expectedAssets = message.pendingAssetCount ?? 0
            const stateChunkCount = message.stateChunkCount ?? 0

            collabLog(
                'snapshot-meta:',
                message.projectName,
                stateChunkCount,
                'state chunks,',
                expectedAssets,
                'assets',
            )

            if (!message.hostProjectId) {
                collabWarn('snapshot-meta missing hostProjectId')
                collabXferLog.warn('snapshot-meta missing hostProjectId')
                return
            }

            beginSnapshotAssembly(
                message.revision,
                message.projectName ?? 'Комната',
                message.hostProjectId,
                expectedAssets,
                stateChunkCount,
            )

            collabProfiler.beginSnapshot(
                message.projectName ?? 'Комната',
                expectedAssets,
                stateChunkCount,
            )

            if (joinActiveRef.current) {
                setJoinProgress(joinProgressForPhase(
                    'snapshot',
                    stateChunkCount > 1 ? `0 / ${stateChunkCount} частей` : undefined,
                ))
            }

            return
        }

        if (message.type === 'asset-meta') {
            const assembly = snapshotAssemblyRef.current

            if (
                !assembly
                || message.revision !== assembly.snapshot.revision
                || message.assetIndex === undefined
                || message.assetId === undefined
                || !message.assetName
                || !message.mimeType
                || !message.dataChunkCount
            ) {
                collabWarn('asset-meta without matching assembly')
                return
            }

            collabLog(
                'asset-meta',
                message.assetIndex + 1,
                '/',
                message.assetTotal,
                message.assetName,
                message.dataChunkCount,
                'chunks',
            )

            assembly.pendingAssetChunks.set(message.assetIndex, {
                id: message.assetId,
                name: message.assetName,
                mimeType: message.mimeType,
                dataChunkCount: message.dataChunkCount,
                dataChunks: new Array(message.dataChunkCount).fill(''),
            })

            if (joinActiveRef.current) {
                setJoinProgress(joinProgressForPhase(
                    'assets',
                    `${message.assetName}: 0 / ${message.dataChunkCount} частей`,
                    countReceivedAssets(assembly.receivedAssets),
                    assembly.expectedAssets,
                ))
            }

            return
        }

        if (
            message.type === 'asset-data-chunk'
            && typeof message.data === 'string'
            && message.assetIndex !== undefined
            && message.index !== undefined
        ) {
            const assembly = snapshotAssemblyRef.current

            if (!assembly || message.revision !== assembly.snapshot.revision) {
                collabWarn('asset-data-chunk without matching assembly')
                return
            }

            const pending = assembly.pendingAssetChunks.get(message.assetIndex)

            if (!pending) {
                collabWarn('asset-data-chunk without pending meta', message.assetIndex)
                return
            }

            pending.dataChunks[message.index] = message.data

            const receivedParts = pending.dataChunks.filter(chunk => chunk.length > 0).length

            // Log first, last, and every 5th chunk so we can see if chunks arrive or stop mid-way
            if (message.index === 0 || message.index === pending.dataChunkCount - 1 || message.index % 5 === 0) {
                collabXferLog.assetChunkProgress(
                    message.assetIndex,
                    assembly.expectedAssets,
                    pending.name,
                    receivedParts,
                    pending.dataChunkCount,
                )
            }

            if (joinActiveRef.current) {
                setJoinProgress(joinProgressForPhase(
                    'assets',
                    `${pending.name}: ${receivedParts} / ${pending.dataChunkCount} частей`,
                    countReceivedAssets(assembly.receivedAssets),
                    assembly.expectedAssets,
                ))
            }

            if (!pending.dataChunks.every(chunk => chunk.length > 0)) {
                return
            }

            assembly.receivedAssets[message.assetIndex] = {
                id: pending.id,
                name: pending.name,
                mimeType: pending.mimeType,
                data: pending.dataChunks.join(''),
            }
            assembly.pendingAssetChunks.delete(message.assetIndex)

            collabLog('asset complete:', message.assetIndex + 1, pending.name)

            const receivedAssets = countReceivedAssets(assembly.receivedAssets)
            collabXferLog.assetAssembled(
                message.assetIndex,
                assembly.expectedAssets,
                pending.name,
                receivedAssets,
                assembly.expectedAssets,
            )
            collabProfiler.assetReceived(pending.name, receivedAssets, assembly.expectedAssets)

            if (joinActiveRef.current) {
                setJoinProgress(joinProgressForPhase(
                    'assets',
                    undefined,
                    countReceivedAssets(assembly.receivedAssets),
                    assembly.expectedAssets,
                ))
            }

            tryFinishSnapshotAssembly()
            return
        }

        if (message.type === 'asset-chunk' && message.asset) {
            collabLog('asset-chunk', (message.assetIndex ?? 0) + 1, '/', message.assetTotal)

            if (!snapshotAssemblyRef.current) {
                collabWarn('asset-chunk without pending snapshot')
                collabXferLog.warn('asset-chunk without join assembly')
                return
            }

            const assembly = snapshotAssemblyRef.current
            const assetIndex = message.assetIndex ?? countReceivedAssets(assembly.receivedAssets)
            assembly.receivedAssets[assetIndex] = message.asset

            if (joinActiveRef.current) {
                setJoinProgress(joinProgressForPhase(
                    'assets',
                    undefined,
                    countReceivedAssets(assembly.receivedAssets),
                    assembly.expectedAssets,
                ))
            }

            tryFinishSnapshotAssembly()
            return
        }

        if (message.type === 'live-asset-chunk' && message.asset) {
            collabLog('live-asset-chunk', message.asset.name)
            await handleRemoteLiveAsset(message.asset)
            return message
        }

        if (
            message.type === 'live-asset-meta'
            && message.assetId !== undefined
            && message.assetName
            && message.mimeType
            && message.dataChunkCount
        ) {
            liveAssetChunksRef.current.set(message.assetId, {
                id: message.assetId,
                name: message.assetName,
                mimeType: message.mimeType,
                dataChunkCount: message.dataChunkCount,
                dataChunks: new Array(message.dataChunkCount).fill(''),
            })
            collabLog('live-asset-meta', message.assetName, message.dataChunkCount, 'chunks')
            return message
        }

        if (
            message.type === 'live-asset-data-chunk'
            && typeof message.data === 'string'
            && message.assetId !== undefined
            && message.index !== undefined
        ) {
            const pending = liveAssetChunksRef.current.get(message.assetId)

            if (!pending) {
                collabWarn('live-asset-data-chunk without pending meta', message.assetId)
                collabXferLog.warn(`live-asset-data-chunk orphan id ${message.assetId}`)
                return message
            }

            pending.dataChunks[message.index] = message.data

            if (!pending.dataChunks.every(chunk => chunk.length > 0)) {
                return message
            }

            liveAssetChunksRef.current.delete(message.assetId)

            const asset: ProjectFileAsset = {
                id: pending.id,
                name: pending.name,
                mimeType: pending.mimeType,
                data: pending.dataChunks.join(''),
            }

            collabLog('live-asset complete:', asset.name)
            await handleRemoteLiveAsset(asset)
            return message
        }

        if (message.type === 'live-asset-remove' && message.assetId !== undefined) {
            collabLog('live-asset-remove', message.assetId)
            await handleRemoteLiveAssetRemove(message.assetId)
            return message
        }

        if (message.type === 'snapshot' && message.data && typeof message.data === 'object') {
            const inlineAssets = message.assets ?? []
            const expectedAssets = message.pendingAssetCount ?? inlineAssets.length

            collabLog('snapshot received:', message.projectName, 'expect', expectedAssets, 'assets')

            if (!message.hostProjectId) {
                collabWarn('snapshot missing hostProjectId')
                collabXferLog.warn('snapshot missing hostProjectId')
                return
            }

            beginSnapshotAssembly(
                message.revision,
                message.projectName ?? 'Комната',
                message.hostProjectId,
                expectedAssets,
                0,
            )

            applySnapshotData(message.data)

            if (expectedAssets > inlineAssets.length && snapshotAssemblyRef.current) {
                inlineAssets.forEach((asset, index) => {
                    snapshotAssemblyRef.current!.receivedAssets[index] = asset
                })

                if (joinActiveRef.current) {
                    setJoinProgress(joinProgressForPhase(
                        'assets',
                        undefined,
                        countReceivedAssets(snapshotAssemblyRef.current.receivedAssets),
                        expectedAssets,
                    ))
                }

                tryFinishSnapshotAssembly()
                return
            }

            if (joinActiveRef.current) {
                setJoinProgress(joinProgressForPhase('snapshot'))
            }

            if (snapshotAssemblyRef.current && inlineAssets.length) {
                inlineAssets.forEach((asset, index) => {
                    snapshotAssemblyRef.current!.receivedAssets[index] = asset
                })
            }

            tryFinishSnapshotAssembly()
            return
        }

        if (message.type === 'ops-meta') {
            const stateChunkCount = message.stateChunkCount ?? 0

            patchAssemblyRef.current = {
                revision: message.revision,
                peerId: message.peerId,
                stateChunkCount,
                stateChunks: stateChunkCount > 0 ? new Array(stateChunkCount).fill('') : [],
            }

            collabLog('ops-meta: expecting', stateChunkCount, 'chunks, revision', message.revision)
            return
        }

        if (message.type === 'ops-chunk' && typeof message.data === 'string' && message.index !== undefined) {
            const assembly = patchAssemblyRef.current

            if (!assembly || message.revision !== assembly.revision) {
                collabWarn('ops-chunk without matching assembly')
                return
            }

            assembly.stateChunks[message.index] = message.data

            if (!assembly.stateChunks.every(chunk => chunk.length > 0)) {
                return
            }

            patchAssemblyRef.current = null

            try {
                const parsed = JSON.parse(assembly.stateChunks.join('')) as CollabOp[]
                const fromGuest = isGuestOrigin({ ...message, peerId: assembly.peerId })
                await waitForPendingAssetImports(parsed)
                return await applyIncomingOps(message.revision, parsed, fromGuest)
            } catch (error) {
                collabError('ops-chunk parse failed:', error)
            }

            return
        }

        if (message.type === 'ops' && message.ops?.length) {
            await waitForPendingAssetImports(message.ops)
            return await applyIncomingOps(message.revision, message.ops, isGuestOrigin(message))
        }
    }, [tryFinishSnapshotAssembly, beginSnapshotAssembly, applySnapshotData, applyIncomingOps, isGuestOrigin, handleRemoteLiveAsset, handleRemoteLiveAssetRemove, waitForPendingAssetImports])

    const processRemoteMessageRef = useRef(processRemoteMessage)
    processRemoteMessageRef.current = processRemoteMessage

    const enqueueRemoteMessage = useCallback((message: CollabSyncMessage): Promise<CollabSyncMessage | void> => {
        const task = remoteMessageChainRef.current.then(
            () => processRemoteMessageRef.current(message),
            () => processRemoteMessageRef.current(message),
        )
        remoteMessageChainRef.current = task.catch(() => {})
        return task
    }, [])

    const enqueueRemoteMessageRef = useRef(enqueueRemoteMessage)
    enqueueRemoteMessageRef.current = enqueueRemoteMessage

    const handleHostSnapshotProgress = useCallback((progress: HostSnapshotProgress) => {
        setHostSnapshotProgress(progress)
        collabProfiler.hostSnapshotPhase(progress.label, progress.detail)

        if (hostSnapshotResetTimerRef.current) {
            clearTimeout(hostSnapshotResetTimerRef.current)
            hostSnapshotResetTimerRef.current = null
        }

        if (progress.phase === 'done') {
            hostSnapshotResetTimerRef.current = setTimeout(() => {
                setHostSnapshotProgress(IDLE_HOST_SNAPSHOT_PROGRESS)
            }, 2500)
        } else if (progress.phase === 'error') {
            hostSnapshotResetTimerRef.current = setTimeout(() => {
                setHostSnapshotProgress(IDLE_HOST_SNAPSHOT_PROGRESS)
            }, 5000)
        }
    }, [])

    const handleHostSnapshotProgressRef = useRef(handleHostSnapshotProgress)
    handleHostSnapshotProgressRef.current = handleHostSnapshotProgress

    useEffect(() => {
        if (!joinActiveRef.current) {
            return
        }

        if (status === 'connecting') {
            setJoinProgress(joinProgressForPhase('connecting'))
        } else if (status === 'joining') {
            setJoinProgress(joinProgressForPhase('room-join'))
        } else if (status === 'connected') {
            setJoinProgress(current => {
                if (current.phase === 'assets' || current.phase === 'import' || current.phase === 'done') {
                    return current
                }

                return joinProgressForPhase('snapshot')
            })
        }
    }, [status])

    useEffect(() => {
        collabProfiler.syncSession({
            status,
            roomId,
            peerCount,
            error,
            revision: revisionRef.current,
            projectName: currentProject?.name ?? null,
            role: sessionRef.current?.role ?? null,
            selfPeerId: sessionRef.current?.peerId ?? null,
            joinProgress,
        })
    }, [status, roomId, peerCount, error, joinProgress, currentProject?.name])

    useEffect(() => {
        const session = new CollabSession({
            onStatusChange: setStatus,
            onRoomId: setRoomId,
            onPeerCountChange: setPeerCount,
            onRemoteMessage: (message) => enqueueRemoteMessageRef.current(message),
            onError: (sessionError) => setError(sessionError.message),
            onHostSnapshotProgress: (progress) => handleHostSnapshotProgressRef.current(progress),
        })

        sessionRef.current = session

        return () => {
            if (broadcastTimerRef.current) {
                clearTimeout(broadcastTimerRef.current)
            }

            if (hostSnapshotResetTimerRef.current) {
                clearTimeout(hostSnapshotResetTimerRef.current)
            }

            session.close()
            sessionRef.current = null
        }
    }, [])

    const currentProjectRef = useRef(currentProject)
    currentProjectRef.current = currentProject

    useEffect(() => {
        const session = sessionRef.current
        const target = collabSessionTarget

        if (!session || !target) {
            return
        }

        const wireHostProjectId = target.projectKind === 'visited'
            ? target.hostProjectId ?? target.projectId
            : target.projectId

        session.setPersistProviders(
            () => {
                if (isViewingCollabTargetRef.current) {
                    return gameBridgeRef.current?.getPersistData() ?? null
                }

                return getPersistDataForSession(target.projectId, target.projectKind)
            },
            async () => {
                const data = isViewingCollabTargetRef.current
                    ? gameBridgeRef.current?.getPersistData()
                    : getPersistDataForSession(target.projectId, target.projectKind)

                if (data) {
                    return buildCollabSnapshotFromPersist(
                        target.projectName,
                        revisionRef.current,
                        data,
                        wireHostProjectId,
                    )
                }

                if (target.projectKind === 'local') {
                    const project = currentProjectRef.current

                    if (project && project.id === target.projectId) {
                        return buildCollabSnapshot(project, revisionRef.current)
                    }
                }

                return null
            },
            target.projectName,
            wireHostProjectId,
        )
    }, [collabSessionTarget, getPersistDataForSession])

    const registerGameBridge = useCallback((bridge: CollabGameBridge | null) => {
        gameBridgeRef.current = bridge
    }, [])

    const registerAssetsBridge = useCallback((bridge: CollabAssetsBridge | null) => {
        assetsBridgeRef.current = bridge
    }, [])

    const broadcastAssetAdded = useCallback(async (assetId: number) => {
        const session = sessionRef.current

        if (!session || (session.status !== 'hosting' && session.status !== 'connected')) {
            return
        }

        try {
            const asset = await exportAssetById(assetId)

            if (!asset) {
                collabWarn('broadcastAssetAdded: asset not found', assetId)
                return
            }

            collabLog('broadcast live asset:', asset.name, asset.id)
            collabProfiler.logEvent(`broadcast asset ${asset.name}`)
            collabXferLog.assetBroadcast(asset.id, asset.name, session.role ?? 'guest')
            session.broadcastLiveAsset(asset)
        } catch (error) {
            collabError('broadcastAssetAdded failed:', error)
        }
    }, [])

    const broadcastAssetRemoved = useCallback(async (assetId: number) => {
        const session = sessionRef.current

        if (!session || (session.status !== 'hosting' && session.status !== 'connected')) {
            return
        }

        try {
            const wireAssetId = session.role === 'guest'
                ? remapOutgoingCollabAssetId(assetId, getSessionHostAssetIdRemap())
                : assetId

            collabLog('broadcast live asset remove:', assetId, wireAssetId !== assetId ? `→ wire ${wireAssetId}` : '')
            collabProfiler.logEvent(`broadcast asset remove id=${wireAssetId}`)
            collabXferLog.assetRemoveBroadcast(wireAssetId, session.role ?? 'guest')
            session.broadcastLiveAssetRemove(wireAssetId)
        } catch (error) {
            collabError('broadcastAssetRemoved failed:', error)
        }
    }, [getSessionHostAssetIdRemap])

    const scheduleOpsBroadcast = useCallback(() => {
        if (broadcastTimerRef.current) {
            clearTimeout(broadcastTimerRef.current)
        }

        broadcastTimerRef.current = setTimeout(() => {
            broadcastTimerRef.current = null

            const ops = pendingOpsRef.current

            if (ops.length === 0) {
                return
            }

            pendingOpsRef.current = []
            const session = sessionRef.current

            if (!session) {
                return
            }

            if (session.role === 'host') {
                revisionRef.current += 1
                collabXferLog.opsBroadcast(revisionRef.current, ops, 'host')
                session.broadcastOps(revisionRef.current, ops)
                return
            }

            collabXferLog.opsBroadcast(revisionRef.current, ops, 'guest')
            session.broadcastOps(revisionRef.current, ops)
        }, BROADCAST_DELAY_MS)
    }, [])

    const createCollabOnPersist = useCallback((basePersist: (data: ActiveBoardPersistPayload) => void) => {
        return (data: ActiveBoardPersistPayload) => {
            basePersist(data)
        }
    }, [])

    const createCollabOnOp = useCallback(() => {
        return (op: CollabOp | CollabOp[]) => {
            if (isApplyingRemoteRef.current) {
                return
            }

            if (!isViewingCollabTargetRef.current) {
                return
            }

            const session = sessionRef.current

            if (session?.status !== 'hosting' && session?.status !== 'connected') {
                return
            }

            let ops = normalizeCollabOps(op)

            if (session.role === 'guest') {
                ops = remapCollabOpsToHostWire(ops, getSessionHostAssetIdRemap())
            }

            pendingOpsRef.current.push(...ops)
            collabXferLog.opsLocalEnqueue(ops, pendingOpsRef.current.length)
            scheduleOpsBroadcast()
        }
    }, [scheduleOpsBroadcast, getSessionHostAssetIdRemap])

    const startHosting = useCallback(async () => {
        if (!currentProject) {
            throw new Error('Откройте проект перед созданием комнаты')
        }

        setError(null)
        revisionRef.current = 0
        collabProfiler.syncSession({ role: 'host', error: null })
        collabProfiler.logEvent('hosting started')

        const session = sessionRef.current

        if (!session) {
            throw new Error('Collaboration session is not ready')
        }

        const target: CollabSessionTarget = {
            projectId: currentProject.id,
            projectKind: 'local',
            projectName: currentProject.name,
        }

        collabSessionTargetRef.current = target
        setCollabSessionTarget(target)

        await session.hostRoom()
    }, [currentProject])

    const joinRoomAndImport = useCallback(async (rawRoomId: string) => {
        const normalizedRoomId = rawRoomId.trim().toUpperCase()

        if (!normalizedRoomId) {
            throw new Error('Введите ID комнаты')
        }

        setError(null)
        revisionRef.current = 0
        snapshotAssemblyRef.current = null
        patchAssemblyRef.current = null
        joinActiveRef.current = true
        setJoinProgress(joinProgressForPhase('connecting'))
        collabProfiler.logEvent(`join start ${normalizedRoomId}`)

        const session = sessionRef.current

        if (!session) {
            throw new Error('Collaboration session is not ready')
        }

        const snapshotPromise = new Promise<CollabSnapshot>((resolve, reject) => {
            pendingSnapshotRef.current = { resolve, reject }
        })

        const timeoutId = window.setTimeout(() => {
            if (pendingSnapshotRef.current) {
                const assembly = snapshotAssemblyRef.current
                const detail = assembly
                    ? assembly.stateComplete
                        ? assembly.pendingAssetChunks.size > 0
                            ? ` (сборка ${assembly.pendingAssetChunks.size} ассетов)`
                            : ` (получено ${countReceivedAssets(assembly.receivedAssets)}/${assembly.expectedAssets} ассетов)`
                        : ` (получено ${assembly.stateChunks.filter(chunk => chunk.length > 0).length}/${assembly.stateChunkCount} частей состояния)`
                    : ''
                collabError('snapshot timeout', detail, 'status:', session.status, 'role:', session.role)
                pendingSnapshotRef.current.reject(new Error(
                    `Snapshot timed out${detail} — см. [collab] в консоли гостя и [signaling] в терминале`,
                ))
                pendingSnapshotRef.current = null
                snapshotAssemblyRef.current = null
                patchAssemblyRef.current = null
            }
        }, JOIN_SNAPSHOT_TIMEOUT_MS)

        try {
            collabLog('joinRoom start', normalizedRoomId)
            await session.joinRoom(normalizedRoomId)
            collabLog('signaling joined, waiting for snapshot...')
            setJoinProgress(joinProgressForPhase('snapshot'))
            const snapshot = await snapshotPromise
            revisionRef.current = snapshot.revision

            setJoinProgress(joinProgressForPhase('import'))
            const project = await importCollaborativeProject(snapshot, normalizedRoomId)

            const target: CollabSessionTarget = {
                projectId: project.id,
                projectKind: 'visited',
                projectName: project.name,
                hostProjectId: snapshot.hostProjectId,
            }

            collabSessionTargetRef.current = target
            setCollabSessionTarget(target)

            await waitForGuestConnection(session)
            setJoinProgress(joinProgressForPhase('done'))
        } catch (error) {
            pendingSnapshotRef.current?.reject(
                error instanceof Error ? error : new Error(String(error)),
            )
            pendingSnapshotRef.current = null
            snapshotAssemblyRef.current = null
            patchAssemblyRef.current = null
            session.close()
            collabSessionTargetRef.current = null
            setCollabSessionTarget(null)
            setRoomId(null)
            setPeerCount(0)
            revisionRef.current = 0
            throw error
        } finally {
            window.clearTimeout(timeoutId)
            joinActiveRef.current = false
            window.setTimeout(() => setJoinProgress(IDLE_JOIN_PROGRESS), 400)
        }
    }, [importCollaborativeProject])

    const leaveSession = useCallback(() => {
        if (broadcastTimerRef.current) {
            clearTimeout(broadcastTimerRef.current)
            broadcastTimerRef.current = null
        }

        pendingSnapshotRef.current?.reject(new Error('Session closed'))
        pendingSnapshotRef.current = null
        snapshotAssemblyRef.current = null
        patchAssemblyRef.current = null
        pendingOpsRef.current = []
        liveAssetChunksRef.current.clear()
        pendingLiveAssetImportsRef.current.clear()
        remoteMessageChainRef.current = Promise.resolve()
        joinActiveRef.current = false
        setJoinProgress(IDLE_JOIN_PROGRESS)
        setHostSnapshotProgress(IDLE_HOST_SNAPSHOT_PROGRESS)
        sessionRef.current?.close()
        collabSessionTargetRef.current = null
        setCollabSessionTarget(null)
        setRoomId(null)
        setPeerCount(0)
        setError(null)
        revisionRef.current = 0
    }, [])

    const value = useMemo(
        () => ({
            status,
            roomId,
            peerCount,
            error,
            joinProgress,
            hostSnapshotProgress,
            collabSessionTarget,
            isViewingCollabTarget,
            registerGameBridge,
            registerAssetsBridge,
            broadcastAssetAdded,
            broadcastAssetRemoved,
            createCollabOnPersist,
            createCollabOnOp,
            startHosting,
            joinRoomAndImport,
            leaveSession,
        }),
        [
            status,
            roomId,
            peerCount,
            error,
            joinProgress,
            hostSnapshotProgress,
            collabSessionTarget,
            isViewingCollabTarget,
            registerGameBridge,
            registerAssetsBridge,
            broadcastAssetAdded,
            broadcastAssetRemoved,
            createCollabOnPersist,
            createCollabOnOp,
            startHosting,
            joinRoomAndImport,
            leaveSession,
        ],
    )

    return (
        <CollabContext.Provider value={value}>
            {children}
        </CollabContext.Provider>
    )
}

export function useCollab() {
    return useContext(CollabContext)
}
