import { FigurePlacement } from './figures'

export enum CellShape {
    rect = 'rect',
    circle = 'circle',
    img = 'img',
}

export interface CellImageShapeParams {
    assetId?: number | null
    /** Percent of cell width (100 = full cell) */
    width?: number
    /** Percent of cell height (100 = full cell) */
    height?: number
    /** false = height follows image aspect ratio from width */
    manualWidth?: boolean
    /** false = width follows image aspect ratio from height */
    manualHeight?: boolean
    /** @deprecated legacy inline data URL */
    file?: string
}

export interface CellParameters {
    shape?: CellShape

    paramsByShape?: {
        [CellShape.rect]?: {
            colour?: string
            width?: number
            height?: number
            strokeWidth?: number
            strokeColor?: string
            strokeDasharray?: string
        }
        [CellShape.circle]?: {
            colour?: string
            width?: number
            height?: number
            strokeWidth?: number
            strokeColor?: string
            strokeDasharray?: string
        }
        [CellShape.img]?: CellImageShapeParams
    }
}


export interface Cell {
    parameters?: CellParameters
    /** @deprecated use figures; top of stack mirror for legacy readers */
    figure?: FigurePlacement
    figures?: FigurePlacement[]
}