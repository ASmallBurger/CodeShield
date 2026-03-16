// src/analysis/remediationAdvisor.js
// maps cyclomatic complexity scores to risk levels and actionable remediation hints

const THRESHOLDS = [
  {
    max: 5,
    risk: 'Low',
    label: 'low',
    suggestion: 'No action needed — complexity is within acceptable range.',
  },
  {
    max: 10,
    risk: 'Medium',
    label: 'medium',
    suggestion: 'Consider extracting helper functions to reduce branching.',
  },
  {
    max: 20,
    risk: 'High',
    label: 'high',
    suggestion: 'Refactor into smaller units — high branching increases bug risk and reduces testability.',
  },
  {
    max: Infinity,
    risk: 'Critical',
    label: 'critical',
    suggestion: 'Immediate refactor required — this function is extremely difficult to test and maintain.',
  },
];

/**
 * @param {number} complexity
 * @returns {{ risk: string, label: string, suggestion: string }}
 */
export function getRiskInfo(complexity) {
  return THRESHOLDS.find((t) => complexity <= t.max);
}
