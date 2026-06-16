import { CellParameters } from '../types/cells'
import { ConnectionParams } from '../types/connections'
import { CopyParamsService } from './CopyParamsService'

export const copyCellParamsService = new CopyParamsService<CellParameters>()
export const copyConnectionParamsService = new CopyParamsService<ConnectionParams>()
