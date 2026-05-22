import { CellParameters } from '../../types/cells'

export class CopyCellParamsService {
    value?: CellParameters

    constructor() {
    }

    setValue = (value?: CellParameters) => {
        this.value = value
    }
    getValue = () => {
        return this.value
    }

}

export const copyCellParamsService = new CopyCellParamsService()