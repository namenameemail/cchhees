import React, {FC, useCallback} from "react";
import {useGameContext} from "../context";
import styles from "../styles.module.css";
import {FigureSigns} from "../constants";

export interface TrayProps {

}

export const Tray: FC<TrayProps> = () => {

    const {state, activeCell, setActiveCell, toTray} = useGameContext();

    const handleTrayClick = useCallback(() => {
        if (activeCell !== undefined) {
            toTray(activeCell);
            setActiveCell(undefined);
        }
    }, [activeCell, state, toTray]);

    return (
        <div className={styles.eaten} onClick={handleTrayClick}>
            {state.tray.map(item => FigureSigns[item])}
        </div>
    );
};
