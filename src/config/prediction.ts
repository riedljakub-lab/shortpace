// Race-time prediction settings (Riegel formula: T2 = T1 × (D2 / D1) ^ exponent).
// PLACEHOLDER values. TODO: validate with the running coach.

/** Used for predictions between 5K and the half marathon. */
export const RIEGEL_EXPONENT = 1.06

/**
 * Stricter exponent whenever the marathon is involved: most runners fade more
 * over 42 km than the classic formula assumes. PLACEHOLDER.
 */
export const MARATHON_EXPONENT = 1.15

/** Anything longer than this counts as "marathon territory" for the exponent. */
export const HALF_MARATHON_KM = 21.0975

/**
 * Rough rule of thumb to turn an easy pace into a 5K race pace:
 * 5K race pace ≈ easy pace − this many seconds per km. PLACEHOLDER.
 */
export const EASY_TO_5K_RACE_OFFSET_SEC_PER_KM = 75

/**
 * A goal more than this % faster than the prediction gets the more candid
 * "long-term goal" message instead of "ambitious". PLACEHOLDER.
 */
export const VERY_AMBITIOUS_GAP_PCT = 10
