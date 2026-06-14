import React, { FC, useCallback, useState } from 'react'
import { useGameContext } from '../../context'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import {
    BoardBackgroundImageFit,
    BoardParameters,
} from '../../types/boardParameters'
import { ParameterTypes } from '../../../components/Form1/types'
import { atLeastOne, nonNegative } from '../../../components/Form1/numberInputConstraints'
import { ProjectImageSelect } from '../../../projects/components/ProjectImageSelect'
import { BoardStyleRules } from '../BoardStyleRules'
import { BoardAxisLabelsForm } from './BoardAxisLabelsForm'
import { resolveAxisLabelsSettings } from '../../boardAxisLabels'
import styles from './styles.module.css'

type BoardSectionTab = 'view' | 'cells' | 'numbering'

const BOARD_SECTION_TABS: Array<{ id: BoardSectionTab; label: string }> = [
    { id: 'view', label: 'вид' },
    { id: 'cells', label: 'клетки' },
    { id: 'numbering', label: 'нумерация' },
]

const BackgroundAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const hasAsset = typeof value === 'number'

    return (
        <div className={styles.fullWidth}>
            <div className={styles.backgroundAssetField}>
                <ProjectImageSelect
                    name={name}
                    value={hasAsset ? value : null}
                    placeholder="background image"
                    title="background image"
                    onChange={(assetId) => onChange(name, assetId)}
                />
                {hasAsset && (
                    <button
                        type="button"
                        className={styles.clearBackgroundImage}
                        title="Сбросить изображение"
                        onClick={() => onChange(name, null)}
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    )
}

const viewParametersConfig = (value: BoardParameters) => {
    const hasBackgroundImage = value.backgroundAssetId != null
    const imageFit = value.backgroundImageFit ?? BoardBackgroundImageFit.tile

    return [
        {
            name: 'n',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'n', ...atLeastOne },
        },
        {
            name: 'm',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'm', ...atLeastOne },
        },
        {
            name: 'cellXDistance',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'cellXDistance', ...atLeastOne },
        },
        {
            name: 'cellYDistance',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'cellYDistance', ...atLeastOne },
        },
        {
            name: 'background',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'background', className: styles.fullWidth },
        },
        {
            name: 'backgroundAssetId',
            Component: BackgroundAssetSelectField,
        },
        {
            name: 'backgroundImageFit',
            type: ParameterTypes.SelectArray,
            visibility: () => hasBackgroundImage,
            props: {
                className: styles.fullWidth,
                title: 'image fit',
                options: Object.values(BoardBackgroundImageFit),
            },
        },
        {
            name: 'backgroundRepeatWidth',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { placeholder: 'repeat width', ...atLeastOne },
        },
        {
            name: 'backgroundRepeatHeight',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { placeholder: 'repeat height', ...atLeastOne },
        },
        {
            name: 'backgroundRepeatOffsetX',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { placeholder: 'repeat offsetX' },
        },
        {
            name: 'backgroundRepeatOffsetY',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { placeholder: 'repeat offsetY' },
        },
        {
            name: 'borderRadius',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'borderRadius', ...nonNegative },
        },
        {
            name: 'borderWidth',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'borderWidth', ...nonNegative },
        },
        {
            name: 'borderColor',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'borderColor', className: styles.fullWidth },
        },
        {
            name: 'borderDasharray',
            type: ParameterTypes.TextInput,
            props: { placeholder: 'borderDasharray' },
        },
    ]
}

export const BoardSettingsPanel: FC = () => {
    const { state, setBoardParameters } = useGameContext()
    const [activeSection, setActiveSection] = useState<BoardSectionTab>('view')

    const handleViewChange = useCallback((value: BoardParameters) => {
        setBoardParameters({
            ...value,
            axisLabels: resolveAxisLabelsSettings(state.boardParameters),
        })
    }, [setBoardParameters, state.boardParameters])

    return (
        <div className={styles.boardSettingsLayout}>
            <div className={styles.sectionTabsRow}>
                {BOARD_SECTION_TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={activeSection === tab.id ? styles.sectionTabActive : styles.sectionTab}
                        onClick={() => setActiveSection(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeSection === 'view' && (
                <div className={styles.sectionPanel}>
                    <Form1<BoardParameters>
                        className={styles.boardParametersForm}
                        value={state.boardParameters}
                        config={viewParametersConfig}
                        onChange={handleViewChange}
                    />
                </div>
            )}
            {activeSection === 'cells' && (
                <div className={styles.sectionPanel}>
                    <BoardStyleRules />
                </div>
            )}
            {activeSection === 'numbering' && (
                <div className={styles.sectionPanel}>
                    <BoardAxisLabelsForm />
                </div>
            )}
        </div>
    )
}
