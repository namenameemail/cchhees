import { FigureTypes } from './figures'

export enum CellShape {
    rect = 'rect',
    circle = 'circle',
    svg = 'svg',
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
        [CellShape.svg]?: {
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
    }



}


export interface Cell {
    parameters?: CellParameters
    figure?: FigureTypes
}