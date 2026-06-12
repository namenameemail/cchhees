import { FigureDisplayType } from '../game/types/figures'
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
                if (op.viewParams.displayType === FigureDisplayType.image && op.viewParams.assetId != null) {
                    ids.add(op.viewParams.assetId)
                }

                if (op.viewParams.fontAssetId != null) {
                    ids.add(op.viewParams.fontAssetId)
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
                if (op.figure.viewParams.displayType === FigureDisplayType.image && op.figure.viewParams.assetId != null) {
                    ids.add(op.figure.viewParams.assetId)
                }

                if (op.figure.viewParams.fontAssetId != null) {
                    ids.add(op.figure.viewParams.fontAssetId)
                }
                break
            default:
                break
        }
    }

    return [...ids].sort((left, right) => left - right)
}
