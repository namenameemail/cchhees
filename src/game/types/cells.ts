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

        }
    }



}


export interface Cell {
    parameters?: CellParameters
    figure?: FigureTypes
}