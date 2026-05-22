import React, {FC, useCallback} from "react";
import {useGameContext} from "../context";
import styles from "../styles.module.css";
import {FigureSigns} from "../constants";

export interface HistoryProps {

}

export const History: FC<HistoryProps> = () => {

    const {undo, redo, stateHistory} = useGameContext();

    const handleUndo = useCallback(() => {
        undo();
    }, [undo]);
    const handleRedo = useCallback(() => {
        redo();
    }, [redo]);

    return (
        <div className={styles.eaten} >
            <button onClick={handleUndo}>undo{stateHistory.before.length ? ` (${stateHistory.before.length})` : ''}</button>
            <button onClick={handleRedo}>redo{stateHistory.after.length ? ` (${stateHistory.after.length})` : ''}</button>
        </div>
    );
};
