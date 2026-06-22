import React, { FC, useState } from 'react'
import { FigureStateSelect } from '../../game/components/FigureStateSelect/FigureStateSelect'
import { FigureFilterArrayField } from '../../game/components/FigureStateSelect/FigureFilterArrayField'
import { ConditionSubjectField } from '../../game/components/FigureStateSelect/ConditionSubjectField'
import { TeamFiguresPicker } from '../../game/components/TeamsPanel/TeamFiguresPicker'
import { FigureEventFigureFilter } from '../../game/types/events'
import { FigureId } from '../../game/types/figures'
import { FIGURE_SUBJECT_MOVED } from '../../game/figureFilter'
import { DemoCard } from '../DemoCard'

export const FigureStateSelectDemo: FC = () => {
    const [figureId, setFigureId] = useState<FigureId | undefined>('demo-rook')
    const [stateIndex, setStateIndex] = useState(0)

    return (
        <DemoCard
            title="FigureStateSelect"
            usedIn="одиночный выбор фигуры и состояния (FigureStateSelectField)"
            state={{ figureId, stateIndex }}
        >
            <FigureStateSelect
                figureId={figureId}
                stateIndex={stateIndex}
                allowAny
                showStatePicker
                onChange={(nextFigureId, nextStateIndex) => {
                    setFigureId(nextFigureId)
                    if (nextStateIndex !== undefined) {
                        setStateIndex(nextStateIndex)
                    }
                }}
            />
        </DemoCard>
    )
}

export const FigureFilterArrayDemo: FC = () => {
    const [value, setValue] = useState<FigureEventFigureFilter[]>([
        { figureId: 'demo-rook', stateIndex: 0 },
    ])

    return (
        <DemoCard
            title="FigureFilterArrayField"
            usedIn="фильтры фигур в условиях/действиях (eventConditionsForm)"
            state={value}
        >
            <FigureFilterArrayField
                name="figures"
                value={value}
                onChange={(_name, next) => setValue(next as FigureEventFigureFilter[])}
                props={{
                    allowAny: true,
                    showStatePicker: true,
                }}
            />
        </DemoCard>
    )
}

export const ConditionSubjectDemo: FC = () => {
    const [value, setValue] = useState<FigureEventFigureFilter[]>([
        { figureId: FIGURE_SUBJECT_MOVED },
    ])

    return (
        <DemoCard
            title="ConditionSubjectField"
            usedIn="subject условий: роли сф/нф + фильтры (eventConditionsForm)"
            state={value}
        >
            <ConditionSubjectField
                name="entries"
                value={value}
                onChange={(_name, next) => setValue(next as FigureEventFigureFilter[])}
                props={{}}
            />
        </DemoCard>
    )
}

export const TeamFiguresPickerDemo: FC = () => {
    const [figureIds, setFigureIds] = useState<FigureId[]>(['demo-rook', 'demo-bishop'])

    return (
        <DemoCard
            title="TeamFiguresPicker"
            usedIn="состав команды (TeamsPanel)"
            state={{ figureIds }}
        >
            <TeamFiguresPicker
                selectedFigureIds={figureIds}
                onChange={setFigureIds}
            />
        </DemoCard>
    )
}
