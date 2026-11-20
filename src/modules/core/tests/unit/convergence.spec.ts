import { orgConfigSeed, standardErrorConvergence } from "../../../../common/utils/convergence";

describe("standardErrorConvergence", () => {
    const criteria = { minSamples: 10, maxSamples: 1000, relativeError: 0.01, absoluteError: 0 };
    it("requires the minimum sample count", () => {
        expect(standardErrorConvergence(5, 100, 0, criteria).converged).toBe(false);
    });
    it("converges when the standard error is within the relative tolerance", () => {
        // s / sqrt(n) = 10 / sqrt(100) = 1 <= 0.01 * 100
        expect(standardErrorConvergence(100, 100, 10, criteria).converged).toBe(true);
        expect(standardErrorConvergence(99, 100, 10, criteria).converged).toBe(false);
    });
    it("uses the absolute floor for means near zero and caps the sample count", () => {
        expect(standardErrorConvergence(50, 0, 1, criteria).converged).toBe(false);
        expect(standardErrorConvergence(50, 0, 1, { ...criteria, absoluteError: 0.2 }).converged).toBe(true);
        const capped = standardErrorConvergence(1000, 0, 1, criteria);
        expect(capped.converged && capped.capped).toBe(true);
    });
    it("derives distinct, deterministic org config seeds", () => {
        expect(orgConfigSeed(5, 1)).toBe(orgConfigSeed(5, 1));
        expect(orgConfigSeed(5, 1)).not.toBe(orgConfigSeed(5, 2));
        expect(orgConfigSeed(5, 1)).not.toBe(orgConfigSeed(6, 1));
    });
});
