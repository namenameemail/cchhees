import * as React from "react";
import {useEffect, useState} from "react";
import cn from 'classnames';
import './BlurEnterTextInput.css';

export interface BlurEnterTextInputProps {
    className?: string
    value: string
    onChange: (value: string) => void
    changeOnBlur?: boolean
    resetOnBlur?: boolean
    changeOnEnter?: boolean
    placeholder?: string
    title?: string
    onFocus?: () => void
    onBlur?: () => void
}

export function BlurEnterTextInput (props: BlurEnterTextInputProps) {

    const {
        className,
        value,
        onChange,
        changeOnBlur,
        resetOnBlur,
        changeOnEnter,
        placeholder,
        title,
        onFocus,
        onBlur,
    } = props;

    const [_value, setValue] = useState<string>('');

    const handleChange = React.useCallback((e) => {
        setValue(e.target.value);
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
        onBlur?.();
    }, [onChange, changeOnBlur, resetOnBlur, _value, value, onBlur]);

    useEffect(() => {
        if (value !== _value) {
            setValue(value);
        }
    }, [value]);

    return (
        <input
            className={cn('blur-text-input', className)}
            type={'text'}
            value={_value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={onFocus}
            placeholder={placeholder}
            title={title}
        />
    );
};
