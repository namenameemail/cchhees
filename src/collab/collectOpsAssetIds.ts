import { collectReferencedAssetIdsFromBoardSlice, collectReferencedAssetIdsFromGameState } from '../projects/assets/assetReferences'
import { CollabOp } from './ops'

const emptyBoardParameters = {
    n: 1,
    m: 1,
    cellWidth: 1,
    cellHeight: 1,
    cellXDistance: 1,
    cellYDistance: 1,
    swapOnEat: false,
}

export function collectAssetIdsFromOps(ops: CollabOp[]): number[] {
    const ids = new Set<number>()

    for (const op of ops) {
        switch (op.kind) {
            case 'figure-view-params':
                if (op.viewParams.assetId != null) {
                    ids.add(op.viewParams.assetId)
                }

                if (op.viewParams.fontAssetId != null) {
                    ids.add(op.viewParams.fontAssetId)
                }
                break
            case 'figure-states':
                for (const state of op.states) {
                    if (state.viewParams.assetId != null) {
                        ids.add(state.viewParams.assetId)
                    }

                    if (state.viewParams.fontAssetId != null) {
                        ids.add(state.viewParams.fontAssetId)
                    }
                }
                break
            case 'style-rules':
                for (const id of collectReferencedAssetIdsFromGameState({
                    cells: [],
                    tray: [],
                    boardParameters: emptyBoardParameters,
                    styleRules: op.styleRules,
                    figureCatalog: [],
                })) {
                    ids.add(id)
                }
                break
            case 'board-sync':
                for (const id of collectReferencedAssetIdsFromBoardSlice(op.board)) {
                    ids.add(id)
                }
                break
            case 'cell-parameters':
                if (op.parameters?.paramsByShape?.img?.assetId != null) {
                    ids.add(op.parameters.paramsByShape.img.assetId)
                }
                break
            case 'figure-add':
                for (const state of op.figure.states) {
                    if (state.viewParams.assetId != null) {
                        ids.add(state.viewParams.assetId)
                    }

                    if (state.viewParams.fontAssetId != null) {
                        ids.add(state.viewParams.fontAssetId)
                    }
                }
                break
            case 'dice-model':
                if (op.modelAssetId != null) {
                    ids.add(op.modelAssetId)
                }
                break
            default:
                break
        }
    }

    return [...ids].sort((left, right) => left - right)
}
