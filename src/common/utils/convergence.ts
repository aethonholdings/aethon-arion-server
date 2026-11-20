import { mixSeed } from "aethon-arion-pipeline";

export type ConvergenceCriteria = {
    minSamples: number; // never converged below this sample count
    maxSamples: number; // always stop at this sample count (bounds the cost when the mean is near 0)
    relativeError: number; // target standard error of the mean, as a fraction of |mean|
    absoluteError: number; // target standard error of the mean, absolute (floor for means near 0)
};

export type ConvergenceDecision = { converged: boolean; capped: boolean; standardError: number | null };

/**
 * Standard-error stopping rule for a Monte Carlo mean: stop once
 *   n >= minSamples and s / sqrt(n) <= max(relativeError * |mean|, absoluteError),
 * or once n >= maxSamples (capped). `sd` is the sample standard deviation (n - 1 denominator).
 *
 * Replaces the earlier rule "stop when the standard deviation changes by less than a margin between successive
 * samples", which fires on sampling noise after a few dozen samples whatever the remaining uncertainty.
 */
export function standardErrorConvergence(
    n: number,
    mean: number | null,
    sd: number | null,
    criteria: ConvergenceCriteria
): ConvergenceDecision {
    if (n >= criteria.maxSamples) {
        return { converged: true, capped: true, standardError: sd === null || n < 2 ? null : sd / Math.sqrt(n) };
    }
    if (n < Math.max(2, criteria.minSamples) || mean === null || sd === null || !Number.isFinite(sd)) {
        return { converged: false, capped: false, standardError: null };
    }
    const standardError = sd / Math.sqrt(n);
    const tolerance = Math.max(criteria.relativeError * Math.abs(mean), criteria.absoluteError);
    return { converged: standardError <= tolerance, capped: false, standardError };
}

/** Seed of the random draws of org config replicate k under simulation parameters with the given base seed. */
export function orgConfigSeed(baseSeed: number | null | undefined, replicate: number): number {
    return mixSeed(mixSeed(baseSeed ?? 0) ^ mixSeed(0x6f726763 ^ replicate));
}

/** A fresh base seed for "random" simulation parameters; 0 for "static". */
export function newBaseSeed(randomStreamType: string): number {
    return randomStreamType === "static" ? 0 : Math.floor(Math.random() * 2147483647);
}
