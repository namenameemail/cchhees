import { CollabOp } from './ops'
import { CollabSyncMessage } from './types'

export function shouldApplyRevision(incomingRevision: number, localRevision: number): boolean {
    return incomingRevision > localRevision
}

export function parseCollabMessage(raw: string): CollabSyncMessage | null {
    try {
        const parsed = JSON.parse(raw) as CollabSyncMessage

        if (!parsed?.type || typeof parsed.revision !== 'number') {
            return null
        }

        return parsed
    } catch {
        return null
    }
}

export function createOpsMessage(
    peerId: string,
    revision: number,
    ops: CollabOp[],
): CollabSyncMessage {
    return {
        type: 'ops',
        revision,
        peerId,
        ops,
    }
}

export function createPatchMessage(
    peerId: string,
    revision: number,
    data: CollabSyncMessage['data'],
): CollabSyncMessage {
    return {
        type: 'patch',
        revision,
        peerId,
        data,
    }
}

export function createSnapshotMessage(
    peerId: string,
    revision: number,
    projectName: string,
    hostProjectId: string,
    data: CollabSyncMessage['data'],
    assets: CollabSyncMessage['assets'],
): CollabSyncMessage {
    return {
        type: 'snapshot',
        revision,
        peerId,
        projectName,
        hostProjectId,
        data,
        assets,
    }
}

export function createHelloMessage(
    peerId: string,
    revision: number,
    projectName: string,
    hostProjectId?: string,
): CollabSyncMessage {
    return {
        type: 'hello',
        revision,
        peerId,
        projectName,
        hostProjectId,
    }
}
