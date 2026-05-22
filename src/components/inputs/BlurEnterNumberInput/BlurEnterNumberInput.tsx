import * as React from "react";
import {useEffect, useState} from "react";
import cn from 'classnames';
import './BlurEnterNumberInput.css';

export interface BlurEnterInputProps extends Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, 'onChange'> {
    className?: string
    value: number | undefined
    onChange: (value: number | undefined) => void
    changeOnBlur?: boolean
    resetOnBlur?: boolean
    changeOnEnter?: boolean
}

export function BlurEnterNumberInput(props: BlurEnterInputProps) {

    const {
        className,
        value,
        onChange,
        changeOnBlur,
        resetOnBlur,
        changeOnEnter,
        ...restProps
    } = props;

    const [_value, setValue] = useState<number | undefined>(value);

    const handleChange = React.useCallback((e) => {
        let value = e.target.value;
        setValue(value);
    }, []);

    const handleKeyDown = React.useCallback((e) => {
        if (changeOnEnter && e.key === 'Enter') {
            onChange(_value);
        }
    }, [onChange, changeOnEnter, _value]);

    const handleBlur = React.useCallback(() => {
        if (changeOnBlur) {
            onChange(_value);
        } else if (resetOnBlur) {
            setValue(value);
        }
    }, [onChange, changeOnBlur, _value, value]);

    useEffect(() => {
        if (value !== _value) {
            setValue(value);
        }
    }, [value]);

    return (
        <input
            className={cn('blur-text-input', className)}
            value={_value}
            type={'number'}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            {...restProps}
        />
    );
}
