export {}

// import React, {FC, useCallback, useMemo} from "react";
// import styles from "../styles.css";
// import cn from "classnames";
// import {FigureSigns} from "../constants";
// import {useGameContext} from "../context";
// import { Figure } from '../types/figures'
// import { Cell } from '../types/cells'
//
// export interface CellHTMLProps {
//     cell: Cell
//     index: number
// }
//
//
// export const BoardCellHTML: FC<CellHTMLProps> = (props) => {
//
//     const {mode, state, activeCell, activeFigure, setActiveCell, moveActiveCellFigureTo, setCellFigure, setCellParameters} = useGameContext();
//
//     const {
//         cellHeight,
//         cellWidth
//     } = state;
//
//     const {
//         cell,
//         index,
//     } = props;
//
//     const {
//         parameters: {
//             colour
//         }
//     } = cell;
//
//     const cellStyle = useMemo(() => ({
//         width: +cellWidth,
//         height: +cellHeight,
//         backgroundColor: colour,
//     }), [cellHeight, cellWidth, colour]);
//
//
//     const handleCellClick = useCallback(() => {
//         console.log(mode);
//         if (mode === Mode.FiguresArrange) {
//
//             activeFigure && setCellFigure(index, activeFigure)
//
//         } else if (mode === Mode.Game) {
//             if (activeCell === undefined) {
//                 setActiveCell(index);
//             } else {
//                 moveActiveCellFigureTo(index);
//             }
//         } else if (mode === Mode.PaintTheBoard) {
//             console.log('ok')
//             setCellParameters(index);
//         }
//     }, [mode, index, activeFigure, activeCell, setActiveCell, moveActiveCellFigureTo, setCellParameters]);
//     return (
//         <div
//             style={cellStyle}
//             className={cn(styles.cell, {
//                 [styles.fromCell]: index === activeCell
//             })}
//             onClick={handleCellClick}
//         >
//             {cell.figure ? FigureSigns[cell.figure] : undefined}
//         </div>
//     );
// };
