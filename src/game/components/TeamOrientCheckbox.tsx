import React, { FC } from 'react'
import { ParameterInputComponentProps } from '../../components/Form1'
import { Form1FieldConfig } from '../../components/Form1/types'
import formStyles from './FigureParametersForm/styles.module.css'

export const TEAM_ORIENT_CHECKBOX_TITLE = 'Смещения в канонической системе (вперёд = y+1), повёрнутые по направлению команды якоря'

export const TeamOrientCheckbox: FC<ParameterInputComponentProps> = ({
    name,
    value,
    onChange,
    props,
}) => {
    const checked = value === true
    const text = (props as { text?: string } | undefined)?.text ?? 'учёт направления команды'
    const title = (props as { title?: string } | undefined)?.title ?? TEAM_ORIENT_CHECKBOX_TITLE

    return (
        <label className={formStyles.svgManualCheckbox} title={title}>
            <input
                type="checkbox"
                checked={checked}
                onChange={event => onChange(name, event.target.checked)}
            />
            <span>{text}</span>
        </label>
    )
}

export function createTeamOrientFieldConfig<StateType extends Record<string, unknown>>(
    options?: { title?: string; text?: string },
): Form1FieldConfig<StateType> {
    return {
        name: 'orientToTeamDirection' as keyof StateType & string,
        Component: TeamOrientCheckbox,
        props: {
            text: options?.text ?? 'учёт направления команды',
            title: options?.title ?? TEAM_ORIENT_CHECKBOX_TITLE,
        },
    }
}
