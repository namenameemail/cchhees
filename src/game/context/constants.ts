import { CellParameters, CellShape } from '../types/cells'
import { ConnectionParams } from '../types/connections'

export const cellParametersBrushStateInitialValue: CellParameters = {
    shape: CellShape.rect,
    paramsByShape: {
        [CellShape.svg]: {},
        [CellShape.rect]: {
            width: 50,
            height: 50,
            colour: 'white',
            strokeColor: 'black',
            strokeWidth: 1,
        },
        [CellShape.circle]: {
            width: 50,
            height: 50,
            colour: 'white',
            strokeColor: 'black',
            strokeWidth: 1,
        },
    },


}
export const connectionParamsBrushStateInitialValue: ConnectionParams = {
    strokeWidth: 1,
    strokeColor: 'black',

}