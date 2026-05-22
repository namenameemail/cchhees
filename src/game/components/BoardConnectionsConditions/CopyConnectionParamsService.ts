import { ConnectionParams } from '../../types/connections'

export class CopyConnectionParamsService {
    value?: ConnectionParams

    constructor() {
    }

    setValue = (value?: ConnectionParams) => {
        this.value = value
    }
    getValue = () => {
        return this.value
    }

}

export const copyConnectionParamsService = new CopyConnectionParamsService()