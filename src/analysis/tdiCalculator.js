// src/analysis/tdiCalculator.js
// Technical Debt Index calculator.
// TDI = ComplexityScore * 0.5 + VulnerabilityDensity * 0.5
// Results ranked by TDI descending, flagged when TDI > threshold.

const DEFAULT_THRESHOLD = 50;

/**
 * Calculate Lines of Code for a source string.
 * Counts non-empty, non-comment lines.
 * @param {string} code
 * @returns {number}
 */
export function calculateLOC(code) {
    if (!code) return 0;
    const lines = code.split(/\r?\n/);
    let loc = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
            loc++;
        }
    }
    return loc;
}

/**
 * Calculate Vulnerability Density (vulnerabilities per 1,000 LOC).
 * @param {number} vulnCount
 * @param {number} loc
 * @returns {number}
 */
export function calculateVulnerabilityDensity(vulnCount, loc) {
    if (loc === 0) return 0;
    return (vulnCount / loc) * 1000;
}

/**
 * Normalize a complexity score to a 0-100 scale.
 * Uses a logarithmic scale: complexity of 1 = 0, complexity >= 100 = 100.
 * @param {number} aggregateComplexity
 * @param {number} functionCount
 * @returns {number}
 */
export function normalizeComplexity(aggregateComplexity, functionCount) {
    if (functionCount === 0) return 0;
    const avgComplexity = aggregateComplexity / functionCount;
    // Scale: avg complexity of 1 => 0, avg of 20+ => 100
    const normalized = Math.min(100, ((avgComplexity - 1) / 19) * 100);
    return Math.max(0, normalized);
}

/**
 * Calculate TDI for a single module.
 * TDI = ComplexityScore * 0.5 + VulnerabilityDensity * 0.5
 * @param {number} normalizedComplexity - 0 to 100
 * @param {number} vulnerabilityDensity - vulns per 1000 LOC
 * @returns {number}
 */
export function calculateTDI(normalizedComplexity, vulnerabilityDensity) {
    return normalizedComplexity * 0.5 + vulnerabilityDensity * 0.5;
}

/**
 * Process analysis results and vulnerability data into ranked TDI results.
 * @param {Array<{file:string, functions:Array, aggregate:number, code:string, vulnCount:number}>} modules
 * @param {number} threshold - TDI threshold for flagging (default 50)
 * @returns {Array<{file:string, loc:number, complexityScore:number, vulnCount:number, vulnDensity:number, tdi:number, flagged:boolean, riskLevel:string, functions:Array}>}
 */
export function computeTDIReport(modules, thresholdOrSettings = DEFAULT_THRESHOLD) {
    // Backward-compatible: accept either a number (TDI threshold only) or a settings object.
    const settings = typeof thresholdOrSettings === 'number'
        ? { tdiThreshold: thresholdOrSettings, vulnDensityThreshold: Infinity }
        : {
            tdiThreshold: thresholdOrSettings.tdiThreshold ?? DEFAULT_THRESHOLD,
            vulnDensityThreshold: thresholdOrSettings.vulnDensityThreshold ?? Infinity,
        };

    const report = modules.map((mod) => {
        const loc = calculateLOC(mod.code);
        const functionCount = mod.functions.length;
        const complexityScore = normalizeComplexity(mod.aggregate, functionCount);
        const vulnDensity = calculateVulnerabilityDensity(mod.vulnCount, loc);
        const tdi = calculateTDI(complexityScore, vulnDensity);

        const flagged = tdi > settings.tdiThreshold || vulnDensity > settings.vulnDensityThreshold;

        return {
            file: mod.file,
            loc,
            functionCount,
            aggregateComplexity: mod.aggregate,
            complexityScore: parseFloat(complexityScore.toFixed(2)),
            vulnCount: mod.vulnCount,
            vulnDensity: parseFloat(vulnDensity.toFixed(2)),
            tdi: parseFloat(tdi.toFixed(2)),
            flagged,
            riskLevel: getTDIRiskLevel(tdi),
            functions: mod.functions,
        };
    });

    // Rank by TDI descending
    report.sort((a, b) => b.tdi - a.tdi);
    return report;
}

/**
 * Get risk level string from TDI score.
 * @param {number} tdi
 * @returns {string}
 */
export function getTDIRiskLevel(tdi) {
    if (tdi <= 25) return 'Low';
    if (tdi <= 50) return 'Medium';
    if (tdi <= 75) return 'High';
    return 'Critical';
}
