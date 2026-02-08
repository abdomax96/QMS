/**
 * MIL-STD-105D AQL Tables - Based on Official Standard
 * Only uses Sample Size + AQL Level to determine Ac/Re
 */

export interface AQLPlan {
    sampleSize: number;
    acceptance: number;  // Ac
    rejection: number;   // Re
    aqlLevel: string;
}

/**
 * Standard AQL levels
 */
export const AQL_LEVELS = [
    '0.010', '0.015', '0.025', '0.040', '0.065',
    '0.10', '0.15', '0.25', '0.40', '0.65',
    '1.0', '1.5', '2.5', '4.0', '6.5',
    '10', '15', '25'
];

/**
 * Standard sample sizes from MIL-STD-105D
 */
const STANDARD_SAMPLE_SIZES = [2, 3, 5, 8, 13, 20, 32, 50, 80, 125, 200, 315, 500, 800, 1250, 2000];

/**
 * Find the nearest standard sample size
 */
function getNearestStandardSize(sampleSize: number): number {
    if (sampleSize <= STANDARD_SAMPLE_SIZES[0]) return STANDARD_SAMPLE_SIZES[0];
    if (sampleSize >= STANDARD_SAMPLE_SIZES[STANDARD_SAMPLE_SIZES.length - 1]) {
        return STANDARD_SAMPLE_SIZES[STANDARD_SAMPLE_SIZES.length - 1];
    }

    let closest = STANDARD_SAMPLE_SIZES[0];
    let minDiff = Math.abs(sampleSize - closest);

    for (const standardSize of STANDARD_SAMPLE_SIZES) {
        const diff = Math.abs(sampleSize - standardSize);
        if (diff < minDiff) {
            minDiff = diff;
            closest = standardSize;
        }
    }

    return closest;
}

/**
 * MIL-STD-105D Table II-A: Normal Inspection
 * Based on official table from user's image
 * Format: sampleSize -> aqlLevel -> { ac, re }
 */
const AQL_TABLE: Record<number, Record<string, { ac: number; re: number }>> = {
    2: {
        '0.65': { ac: 0, re: 1 },
        '15': { ac: 0, re: 1 },
        '25': { ac: 1, re: 2 },
    },
    3: {
        '1.5': { ac: 0, re: 1 },
        '4.0': { ac: 0, re: 1 },
        '10': { ac: 1, re: 2 },
        '15': { ac: 2, re: 3 },
    },
    5: {
        '1.0': { ac: 0, re: 1 },
        '2.5': { ac: 0, re: 1 },
        '6.5': { ac: 1, re: 2 },
        '10': { ac: 2, re: 3 },
        '15': { ac: 3, re: 4 },
    },
    8: {
        '0.65': { ac: 0, re: 1 },
        '1.5': { ac: 0, re: 1 },
        '4.0': { ac: 1, re: 2 },
        '6.5': { ac: 2, re: 3 },
        '10': { ac: 3, re: 4 },
        '15': { ac: 5, re: 6 },
    },
    13: {
        '0.40': { ac: 0, re: 1 },
        '1.0': { ac: 0, re: 1 },
        '2.5': { ac: 1, re: 2 },
        '4.0': { ac: 2, re: 3 },
        '6.5': { ac: 3, re: 4 },
        '10': { ac: 5, re: 6 },
        '15': { ac: 7, re: 8 },
    },
    20: {
        '0.25': { ac: 0, re: 1 },
        '0.65': { ac: 0, re: 1 },
        '1.0': { ac: 0, re: 1 },
        '1.5': { ac: 0, re: 1 },
        '2.5': { ac: 1, re: 2 },
        '4.0': { ac: 2, re: 3 },
        '6.5': { ac: 3, re: 4 },
        '10': { ac: 5, re: 6 },
        '15': { ac: 10, re: 11 },
    },
    32: {
        '0.15': { ac: 0, re: 1 },
        '0.40': { ac: 0, re: 1 },
        '1.0': { ac: 1, re: 2 },
        '1.5': { ac: 2, re: 3 },
        '2.5': { ac: 3, re: 4 },
        '4.0': { ac: 5, re: 6 },
        '6.5': { ac: 7, re: 8 },
        '10': { ac: 10, re: 11 },
        '15': { ac: 14, re: 15 },
    },
    50: {
        '0.10': { ac: 0, re: 1 },
        '0.25': { ac: 0, re: 1 },
        '0.65': { ac: 1, re: 2 },
        '1.0': { ac: 2, re: 3 },
        '1.5': { ac: 2, re: 3 },
        '2.5': { ac: 3, re: 4 },
        '4.0': { ac: 5, re: 6 },
        '6.5': { ac: 7, re: 8 },
        '10': { ac: 10, re: 11 },
        '15': { ac: 14, re: 15 },
        '25': { ac: 21, re: 22 },
    },
    80: {
        '0.065': { ac: 0, re: 1 },
        '0.15': { ac: 0, re: 1 },
        '0.40': { ac: 1, re: 2 },
        '0.65': { ac: 1, re: 2 },
        '1.0': { ac: 2, re: 3 },
        '1.5': { ac: 3, re: 4 },
        '2.5': { ac: 5, re: 6 },
        '4.0': { ac: 7, re: 8 },
        '6.5': { ac: 10, re: 11 },
        '10': { ac: 14, re: 15 },
        '15': { ac: 21, re: 22 },
    },
    125: {
        '0.040': { ac: 0, re: 1 },
        '0.10': { ac: 0, re: 1 },
        '0.25': { ac: 1, re: 2 },
        '0.40': { ac: 1, re: 2 },
        '0.65': { ac: 2, re: 3 },
        '1.0': { ac: 3, re: 4 },
        '1.5': { ac: 5, re: 6 },
        '2.5': { ac: 7, re: 8 },
        '4.0': { ac: 10, re: 11 },
        '6.5': { ac: 14, re: 15 },
        '10': { ac: 21, re: 22 },
    },
    200: {
        '0.025': { ac: 0, re: 1 },
        '0.065': { ac: 0, re: 1 },
        '0.15': { ac: 1, re: 2 },
        '0.25': { ac: 1, re: 2 },
        '0.40': { ac: 2, re: 3 },
        '0.65': { ac: 3, re: 4 },
        '1.0': { ac: 5, re: 6 },
        '1.5': { ac: 7, re: 8 },
        '2.5': { ac: 10, re: 11 },
        '4.0': { ac: 14, re: 15 },
        '6.5': { ac: 21, re: 22 },
    },
    315: {
        '0.015': { ac: 0, re: 1 },
        '0.040': { ac: 0, re: 1 },
        '0.10': { ac: 1, re: 2 },
        '0.15': { ac: 1, re: 2 },
        '0.25': { ac: 2, re: 3 },
        '0.40': { ac: 3, re: 4 },
        '0.65': { ac: 5, re: 6 },
        '1.0': { ac: 7, re: 8 },
        '1.5': { ac: 10, re: 11 },
        '2.5': { ac: 14, re: 15 },
        '4.0': { ac: 21, re: 22 },
    },
    500: {
        '0.010': { ac: 0, re: 1 },
        '0.025': { ac: 0, re: 1 },
        '0.065': { ac: 1, re: 2 },
        '0.10': { ac: 1, re: 2 },
        '0.15': { ac: 2, re: 3 },
        '0.25': { ac: 3, re: 4 },
        '0.40': { ac: 5, re: 6 },
        '0.65': { ac: 7, re: 8 },
        '1.0': { ac: 10, re: 11 },
        '1.5': { ac: 14, re: 15 },
        '2.5': { ac: 21, re: 22 },
    },
    800: {
        '0.010': { ac: 0, re: 1 },
        '0.015': { ac: 0, re: 1 },
        '0.040': { ac: 1, re: 2 },
        '0.065': { ac: 1, re: 2 },
        '0.10': { ac: 2, re: 3 },
        '0.15': { ac: 3, re: 4 },
        '0.25': { ac: 5, re: 6 },
        '0.40': { ac: 7, re: 8 },
        '0.65': { ac: 10, re: 11 },
        '1.0': { ac: 14, re: 15 },
        '1.5': { ac: 21, re: 22 },
    },
    1250: {
        '0.010': { ac: 0, re: 1 },
        '0.015': { ac: 1, re: 2 },
        '0.025': { ac: 1, re: 2 },
        '0.040': { ac: 2, re: 3 },
        '0.065': { ac: 3, re: 4 },
        '0.10': { ac: 5, re: 6 },
        '0.15': { ac: 7, re: 8 },
        '0.25': { ac: 10, re: 11 },
        '0.40': { ac: 14, re: 15 },
        '0.65': { ac: 21, re: 22 },
    },
    2000: {
        '0.010': { ac: 1, re: 2 },
        '0.015': { ac: 1, re: 2 },
        '0.025': { ac: 2, re: 3 },
        '0.040': { ac: 3, re: 4 },
        '0.065': { ac: 5, re: 6 },
        '0.10': { ac: 7, re: 8 },
        '0.15': { ac: 10, re: 11 },
        '0.25': { ac: 14, re: 15 },
        '0.40': { ac: 21, re: 22 },
    },
};

/**
 * Get AQL plan based on sample size and AQL level only
 */
export function getAQLPlan(sampleSize: number, aqlLevel: string): AQLPlan {
    // Find nearest standard sample size
    const standardSize = getNearestStandardSize(sampleSize);

    // Log if using different size
    if (standardSize !== sampleSize) {
        console.info(`Sample size ${sampleSize} mapped to nearest standard size ${standardSize}`);
    }

    const sizeTable = AQL_TABLE[standardSize];
    if (!sizeTable) {
        console.warn(`No table for standard size ${standardSize}, using fallback`);
        return { sampleSize, acceptance: 0, rejection: 1, aqlLevel };
    }

    const plan = sizeTable[aqlLevel];
    if (!plan) {
        console.warn(`No plan for AQL ${aqlLevel} at size ${standardSize}, using fallback`);
        return { sampleSize, acceptance: 0, rejection: 1, aqlLevel };
    }

    return {
        sampleSize,  // Return original size
        acceptance: plan.ac,
        rejection: plan.re,
        aqlLevel
    };
}

/**
 * Get AQL limits - simple version
 */
export function getAQLLimits(
    aqlLevel: string,
    sampleSize: number
): { acceptance: number; rejection: number } {
    const plan = getAQLPlan(sampleSize, aqlLevel);
    return {
        acceptance: plan.acceptance,
        rejection: plan.rejection
    };
}
