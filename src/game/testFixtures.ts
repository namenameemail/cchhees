import { BoardParameters } from './types/boardParameters'
import { FigureDefinition } from './types/figures'
import { BoardBackgroundImageFit } from './types/boardParameters'

export const testBoardParameters: BoardParameters = {
    n: 8,
    m: 8,
    cellWidth: 20,
    cellHeight: 20,
    cellXDistance: 50,
    cellYDistance: 50,
    swapOnEat: false,
    background: 'white',
    backgroundAssetId: null,
    backgroundImageFit: BoardBackgroundImageFit.tile,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'black',
    axisNumberings: [],
}

export const rookDefinition: FigureDefinition = {
    id: 'rook',
    states: [{
        viewParams: {},
        moveRules: [{ x: 1, y: 0 }, { x: 0, y: 1 }],
    }],
}
