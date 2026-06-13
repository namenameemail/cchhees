/** Stroke width, radius, blur, sizes — not less than 0 */
export const nonNegative = { min: 0 } as const

/** Board dimensions, distances, font size, 1-based coordinates */
export const atLeastOne = { min: 1 } as const

/** Move rule repeat count: 0 = unlimited */
export const moveRuleRepeat = { min: 0 } as const

/** anb pattern offset */
export const anbOffset = { min: 0 } as const
