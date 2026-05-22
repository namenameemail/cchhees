import React, {FC, useCallback} from "react";
import {FigureSigns} from "../constants";
import {useGameContext} from "../context";
import { FigureTypes } from '../types/figures'

export interface FigureButtonProps {
    type: FigureTypes
    onClick: (type: FigureTypes) => void
    isActive?: boolean
}


export const FigureButton: FC<FigureButtonProps> = (props) => {

    const {type, onClick, isActive} = props

    const handleClick = useCallback(() => {
        onClick(type)
    }, [onClick, type]);

    return (
        <button onClick={handleClick}>{FigureSigns[type]}{isActive ? ' < ' : ''}</button>
    );
};
