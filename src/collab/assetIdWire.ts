import { isCellStyleRule } from '../game/types/styleRules'
import {
    invertHostAssetIdRemap,
    remapAssetIdWithFallback,
    remapCellParametersWithFallback,
    remapFigureViewParamsWithFallback,
    remapAssetIdsInBoardSliceWithFallback,
    toAssetIdMap,
} from '../projects/assetIdRemap'
import { assetsDebugLog } from '../projects/assets/assetsDebugLog'
import { CollabOp } from './ops'

function remapStyleRulesWithFallback(
    styleRules: Extract<CollabOp, { kind: 'style-rules' }>['styleRules'],
    map: ReturnType<typeof toAssetIdMap>,
) {
    if (!map || map.size === 0) {
        return styleRules
    }

    return styleRules.map(rule => {
        if (!isCellStyleRule(rule)) {
            return rule
        }

        return {
            ...rule,
            cellParams: remapCellParametersWithFallback(rule.cellParams, map) ?? rule.cellParams,
        }
    })
}

function remapOp(op: CollabOp, map: ReturnType<typeof toAssetIdMap>): CollabOp {
    if (!map || map.size === 0) {
        return op
    }

    switch (op.kind) {
        case 'style-rules':
            return {
                ...op,
                styleRules: remapStyleRulesWithFallback(op.styleRules, map),
            }
        case 'cell-parameters':
            return {
                ...op,
                parameters: remapCellParametersWithFallback(op.parameters, map) ?? op.parameters,
            }
        case 'figure-view-params':
            return {
                ...op,
                viewParams: remapFigureViewParamsWithFallback(op.viewParams, map),
            }
        case 'figure-add':
            return {
                ...op,
                figure: {
                    ...op.figure,
                    states: op.figure.states.map(state => ({
                        ...state,
                        viewParams: remapFigureViewParamsWithFallback(state.viewParams, map),
                    })),
                },
            }
        case 'board-sync':
            return {
                ...op,
                board: remapAssetIdsInBoardSliceWithFallback(op.board, map),
            }
        default:
            return op
    }
}

function logRemappedOps(
    ops: CollabOp[],
    remappedOps: CollabOp[],
    direction: 'host→local' | 'local→host',
): void {
    if (!import.meta.env.DEV) {
        return
    }

    for (let index = 0; index < ops.length; index += 1) {
        const before = ops[index]
        const after = remappedOps[index]

        if (JSON.stringify(before) === JSON.stringify(after)) {
            continue
        }

        assetsDebugLog.warn(`collab remap ${direction} op=${before.kind}`, {
            kind: before.kind,
            direction,
        })
    }
}

export function remapCollabOpsAssetIds(
    ops: CollabOp[],
    idRemap: Record<number, number> | null | undefined,
): CollabOp[] {
    const map = toAssetIdMap(idRemap)

    if (!map) {
        return ops
    }

    const remapped = ops.map(op => remapOp(op, map))
    logRemappedOps(ops, remapped, 'host→local')
    return remapped
}

export function remapCollabOpsToHostWire(
    ops: CollabOp[],
    hostAssetIdRemap: Record<number, number> | null | undefined,
): CollabOp[] {
    const localToHost = invertHostAssetIdRemap(hostAssetIdRemap)
    const map = toAssetIdMap(localToHost)

    if (!map) {
        return ops
    }

    const remapped = ops.map(op => remapOp(op, map))
    logRemappedOps(ops, remapped, 'local→host')
    return remapped
}

export function remapIncomingCollabOpsAssetIds(
    ops: CollabOp[],
    hostAssetIdRemap?: Record<number, number> | null,
): CollabOp[] {
    return remapCollabOpsAssetIds(ops, hostAssetIdRemap)
}

export function remapIncomingCollabAssetId(
    assetId: number,
    hostAssetIdRemap?: Record<number, number> | null,
): number {
    const map = toAssetIdMap(hostAssetIdRemap)
    return remapAssetIdWithFallback(map, assetId) as number
}

export function remapOutgoingCollabAssetId(
    assetId: number,
    hostAssetIdRemap?: Record<number, number> | null,
): number {
    const localToHost = invertHostAssetIdRemap(hostAssetIdRemap)
    const map = toAssetIdMap(localToHost)
    return remapAssetIdWithFallback(map, assetId) as number
}
