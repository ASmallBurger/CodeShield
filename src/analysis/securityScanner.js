// Entry point for security scanning logic. Exposes functions to scan file contents against defined vulnerability rules.

import { VULN_RULES, SEVERITY } from './securityRules.js';

/**
 * Scan a single file's text content synchronously.
 * @param {string} filename
 * @param {string} content
 * @returns {FileScanResult}
 */
export function scanFile(filename, content) {
  const lines = content.split(/\r?\n/);
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fast pre-filter: skip pure comment lines
    if (/^\s*(?:\/\/|#|\/\*|\*)/.test(line)) continue;

    for (const rule of VULN_RULES) {
      if (!rule.regex.test(line)) continue;

      // False-positive suppression via negative patterns
      if (rule.negativePatterns.some((neg) => neg.test(line))) continue;

      findings.push({
        ruleId:      rule.id,
        name:        rule.name,
        severity:    rule.severity,
        owasp:       rule.owasp,
        description: rule.description,
        lineNumber:  i + 1,
        lineContent: line.trim().slice(0, 200),
      });
    }
  }

  // Sort: Critical → High → Medium → Low, then by line number
  findings.sort((a, b) => {
    const w = b.severity.weight - a.severity.weight;
    return w !== 0 ? w : a.lineNumber - b.lineNumber;
  });

  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const f of findings) {
    const key = Object.keys(SEVERITY).find((k) => SEVERITY[k] === f.severity);
    if (key) counts[key]++;
  }

  return { filename, totalFindings: findings.length, counts, findings };
}

/**
 * Scan multiple files — mirrors analyzeFiles() in parserManager.js.
 * @param {Array<{name: string, file: File}>} files  — same shape as parserManager input
 * @returns {Promise<{ results: FileScanResult[], summary: object }>}
 */
export async function scanFiles(files) {
  const results = [];

  for (const f of files) {
    const content = await f.file.text();
    const result = scanFile(f.name, content);
    results.push(result);
  }

  const summary = {
    totalFiles:    results.length,
    totalFindings: results.reduce((s, r) => s + r.totalFindings, 0),
    bySeverity: {
      CRITICAL: results.reduce((s, r) => s + r.counts.CRITICAL, 0),
      HIGH:     results.reduce((s, r) => s + r.counts.HIGH, 0),
      MEDIUM:   results.reduce((s, r) => s + r.counts.MEDIUM, 0),
      LOW:      results.reduce((s, r) => s + r.counts.LOW, 0),
    },
    // Ranked by weighted score — for prioritization dashboard
    moduleRanking: results
      .map((r) => ({
        filename: r.filename,
        score: r.counts.CRITICAL * 4 + r.counts.HIGH * 3 + r.counts.MEDIUM * 2 + r.counts.LOW,
      }))
      .sort((a, b) => b.score - a.score),
  };

  return { results, summary };
}