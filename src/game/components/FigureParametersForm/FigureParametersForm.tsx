import React, { FC, useCallback, useMemo } from 'react'
import { useGameContext } from '../../context'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import { ParameterTypes } from '../../../components/Form1/types'
import { FigureDisplayType, FigureId, FigureViewParams } from '../../types/figures'
import { FigureSVG } from '../FigureSVG'
import { ProjectImageSelect } from '../../../projects/components/ProjectImageSelect'
import { ProjectFontSelect } from '../../../projects/components/ProjectFontSelect'
import {
    isSvgManualHeight,
    isSvgManualWidth,
    normalizeSvgCellParams,
} from '../../cellSvgSize'
import {
    getDefaultFigureViewParams,
    resolveFigureViewParams,
} from '../../figureView'
import { BlurEnterTextInput } from '../../../components/inputs/BlurEnterTextInput/BlurEnterTextInput'
import styles from './styles.module.css'

const FontAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    return (
        <ProjectFontSelect
            name={name}
            value={typeof value === 'number' ? value : null}
            placeholder="font"
            title="font"
            onChange={(assetId) => onChange(name, assetId)}
        />
    )
}

const ImageAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    return (
        <ProjectImageSelect
            name={name}
            value={typeof value === 'number' ? value : null}
            placeholder="image asset"
            title="image asset"
            onChange={(assetId) => onChange(name, assetId)}
        />
    )
}

const FigureColorField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const textValue = typeof value === 'string' ? value : ''
    const pickerValue = /^#[0-9a-fA-F]{6}$/.test(textValue) ? textValue : '#000000'

    return (
        <label className={styles.colorField}>
            <span className={styles.colorFieldLabel}>color</span>
            <input
                type="color"
                className={styles.colorPicker}
                value={pickerValue}
                onChange={(event) => onChange(name, event.target.value)}
            />
            <BlurEnterTextInput
                value={textValue}
                changeOnEnter
                changeOnBlur
                resetOnBlur
                onChange={(next) => onChange(name, next)}
                placeholder="#000000"
                title="color"
            />
        </label>
    )
}

const SvgManualDimensionCheckbox: FC<ParameterInputComponentProps> = ({ name, value, onChange, props }) => {
    const checked = value !== false

    return (
        <label className={styles.svgManualCheckbox}>
            <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(name, !checked)}
            />
            <span>{props?.text || name}</span>
        </label>
    )
}

const paramsConfigByDisplayType = {
    [FigureDisplayType.symbol]: () => [
        {
            name: 'symbol',
            type: ParameterTypes.TextInput,
            props: { placeholder: 'symbol' },
        },
        {
            name: 'fontSize',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'font size' },
        },
        {
            name: 'fontAssetId',
            Component: FontAssetSelectField,
        },
        {
            name: 'color',
            Component: FigureColorField,
        },
    ],
    [FigureDisplayType.image]: () => [
        {
            name: 'assetId',
            Component: ImageAssetSelectField,
        },
        {
            name: 'manualWidth',
            Component: SvgManualDimensionCheckbox,
            props: { text: 'width' },
        },
        {
            name: 'width',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'width %' },
            propsByState: (state: Record<string, unknown>) => ({
                disabled: !isSvgManualWidth(state),
            }),
        },
        {
            name: 'manualHeight',
            Component: SvgManualDimensionCheckbox,
            props: { text: 'height' },
        },
        {
            name: 'height',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'height %' },
            propsByState: (state: Record<string, unknown>) => ({
                disabled: !isSvgManualHeight(state),
            }),
        },
    ],
}

const parametersConfig = (value: FigureViewParams) => {
    const displayType = value.displayType ?? FigureDisplayType.symbol
    const typeConfig = paramsConfigByDisplayType[displayType]

    return [
        {
            name: 'displayType',
            type: ParameterTypes.SelectArray,
            props: {
                className: styles.displayType,
                options: Object.values(FigureDisplayType),
                title: 'type',
            },
        },
        {
            name: 'paramsByDisplayType',
            type: ParameterTypes.Form1,
            props: {
                config: [
                    {
                        name: displayType,
                        type: ParameterTypes.Form1,
                        props: {
                            config: typeConfig,
                            className: styles.figureParametersFormByType,
                        },
                    },
                ],
            },
        },
    ]
}

export interface FigureParametersFormBaseProps {
    className?: string
    figureId: FigureId
    value: FigureViewParams
    onChange: (value: FigureViewParams) => void
}

export const FigureParametersFormBase: FC<FigureParametersFormBaseProps> = ({
    figureId,
    value,
    onChange,
    className,
}) => {
    const formValue = useMemo(() => {
        const displayType = value.displayType ?? FigureDisplayType.symbol
        const { displayType: _displayType, ...rest } = value

        return {
            displayType,
            paramsByDisplayType: {
                [displayType]: rest,
            },
        }
    }, [value])

    const handleChange = useCallback((nextValue: {
        displayType?: FigureDisplayType
        paramsByDisplayType?: Partial<Record<FigureDisplayType, FigureViewParams>>
    }) => {
        const displayType = nextValue.displayType ?? FigureDisplayType.symbol
        const typeParams = nextValue.paramsByDisplayType?.[displayType] ?? {}
        const merged: FigureViewParams = {
            ...getDefaultFigureViewParams(figureId),
            ...typeParams,
            displayType,
        }

        if (displayType === FigureDisplayType.image) {
            const normalized = normalizeSvgCellParams(merged)
            onChange(normalized)
            return
        }

        onChange(merged)
    }, [figureId, onChange])

    return (
        <Form1
            className={className}
            config={parametersConfig}
            value={formValue}
            onChange={handleChange}
        />
    )
}

export const FigureParametersForm: FC = () => {
    const { activeFigure, state, setFigureDefinition } = useGameContext()

    const viewParams = useMemo(() => {
        if (!activeFigure) {
            return getDefaultFigureViewParams()
        }
        return resolveFigureViewParams(activeFigure, state.figureCatalog)
    }, [activeFigure, state.figureCatalog])

    const handleChange = useCallback((nextValue: FigureViewParams) => {
        if (!activeFigure) {
            return
        }
        setFigureDefinition(activeFigure, nextValue)
    }, [activeFigure, setFigureDefinition])

    if (!activeFigure) {
        return (
            <div className={styles.hint}>
                Выберите фигуру выше, чтобы настроить её внешний вид
            </div>
        )
    }

    return (
        <div className={styles.figureParametersFormLayout}>
            <div className={styles.topRow}>
                <div>figure: {activeFigure}</div>
            </div>
            <div className={styles.secondRow}>
                <FigureParametersFormBase
                    className={styles.figureParametersForm}
                    figureId={activeFigure}
                    value={viewParams}
                    onChange={handleChange}
                />
                <FigureSVG figureId={activeFigure} highlighted />
            </div>
        </div>
    )
}
