export enum BoardBackgroundImageFit {
    tile = 'tile',
    center = 'center',
    fitWidth = 'fitWidth',
    fitHeight = 'fitHeight',
    repeat = 'repeat',
}

export interface BoardParameters {
    n: number
    m: number
    cellWidth: number
    cellHeight: number
    cellXDistance: number
    cellYDistance: number
    swapOnEat: boolean
    background?: string
    backgroundAssetId?: number | null
    backgroundImageFit?: BoardBackgroundImageFit
    backgroundRepeatWidth?: number
    backgroundRepeatHeight?: number
    backgroundRepeatOffsetX?: number
    backgroundRepeatOffsetY?: number
    borderRadius?: number
    borderWidth?: number
    borderColor?: string
    borderDasharray?: string
}
