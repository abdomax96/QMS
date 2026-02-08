/**
 * Tare Calculations and AQL Validation Utilities
 * Based on industrial packaging standards (e.g., EU Directive 76/211/EEC)
 */

import { getAQLPlan } from './milStd105';

/**
 * Calculate Tolerable Deficiency (TD) based on nominal quantity (weight)
 * @param standardWeight - Nominal quantity in grams (Qn)
 * @returns Tolerable Deficiency (TD) in grams
 */
export function calculateTD(standardWeight: number): number {
    if (standardWeight <= 0) return 0;

    // Weight ranges and their corresponding TD formulas
    if (standardWeight <= 50) {
        return 0.09 * standardWeight;
    } else if (standardWeight <= 100) {
        return 4.5;
    } else if (standardWeight <= 200) {
        return 0.045 * standardWeight;
    } else if (standardWeight <= 300) {
        return 9;
    } else if (standardWeight <= 500) {
        return 0.03 * standardWeight;
    } else if (standardWeight <= 1000) {
        return 15;
    } else if (standardWeight <= 10000) {
        return 0.015 * standardWeight;
    } else if (standardWeight <= 15000) {
        return 150;
    } else {
        // For weights > 15,000g: 1% rule
        return 0.01 * standardWeight;
    }
}

/**
 * Calculate Tare 1 (warning limit)
 * Formula: Tare1 = Qn - TD
 * @param standardWeight - Nominal quantity in grams (Qn)
 * @returns Tare1 value in grams
 */
export function calculateTare1(standardWeight: number): number {
    const td = calculateTD(standardWeight);
    return standardWeight - td;
}

/**
 * Calculate Tare 2 (critical limit)
 * Formula: Tare2 = Qn - (2 × TD)
 * @param standardWeight - Nominal quantity in grams (Qn)
 * @returns Tare2 value in grams
 */
export function calculateTare2(standardWeight: number): number {
    const td = calculateTD(standardWeight);
    return standardWeight - (2 * td);
}

/**
 * Get AQL acceptance and rejection limits based on AQL level and sample size
 * Uses MIL-STD-105D tables
 * @param aqlLevel - AQL level as string (e.g., "2.5", "4.0", "6.5", etc.)
 * @param sampleSize - Number of samples
 * @returns Object with acceptance and rejection counts
 */
export function getAQLLimits(
    aqlLevel: string,
    sampleSize: number = 20
): { acceptance: number; rejection: number } {
    try {
        const plan = getAQLPlan(sampleSize, aqlLevel);
        return {
            acceptance: plan.acceptance,
            rejection: plan.rejection
        };
    } catch (error) {
        console.error('Error getting AQL plan:', error);
        return { acceptance: 0, rejection: 1 };
    }
}

/**
 * Validate a column of sample weights against Tare1 and Tare2 limits
 * @param weights - Array of sample weights for the column
 * @param tare1 - Tare1 limit (warning)
 * @param tare2 - Tare2 limit (critical)
 * @param aqlLevel - AQL level for validation
 * @returns Validation result with status and reason
 */
export function validateColumn(
    weights: (number | undefined)[],
    tare1: number,
    tare2: number,
    aqlLevel: string
): { status: 'مقبول' | 'مرفوض'; reason: string } {
    // Filter out undefined, null, and non-numeric values
    const validWeights = weights.filter(
        (w) => w !== undefined && w !== null && typeof w === 'number' && !isNaN(w)
    ) as number[];

    // If no valid weights, cannot determine status
    if (validWeights.length === 0) {
        return { status: 'مقبول', reason: 'لا توجد بيانات' };
    }

    // Rule 1: Check for any sample below Tare2 (critical limit)
    // ANY sample below Tare2 = immediate rejection
    const belowTare2 = validWeights.filter((w) => w < tare2);
    if (belowTare2.length > 0) {
        return {
            status: 'مرفوض',
            reason: `رفض فوري: ${belowTare2.length} عينة أقل من Tare 2`,
        };
    }

    // Rule 2: Count defective samples (between Tare2 and Tare1)
    const defectives = validWeights.filter((w) => w >= tare2 && w < tare1);
    const defectiveCount = defectives.length;

    // Get AQL limits using sample size
    const aqlLimits = getAQLLimits(aqlLevel, validWeights.length);

    // Debug logging
    console.log('Validation Debug:', {
        validWeightsCount: validWeights.length,
        defectiveCount,
        aqlLevel,
        aqlLimits,
        tare1,
        tare2,
        validWeights
    });

    // Rule 3: Validate against AQL acceptance/rejection limits
    if (defectiveCount <= aqlLimits.acceptance) {
        return {
            status: 'مقبول',
            reason: defectiveCount === 0
                ? 'جميع العينات ضمن الحدود'
                : `عينات معيبة (${defectiveCount}) ضمن حد القبول (≤${aqlLimits.acceptance})`,
        };
    } else {
        return {
            status: 'مرفوض',
            reason: `عينات معيبة (${defectiveCount}) تجاوزت حد القبول (>${aqlLimits.acceptance})`,
        };
    }
}

