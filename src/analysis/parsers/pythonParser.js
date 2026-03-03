import { complexityFromDecisions } from '../complexityCalculator.js';

/**
 * Rough Python parser using indentation and simple keyword matching.
 * This is not a full AST; it's enough for cyclomatic complexity counting
 * for the purposes of Story 2.
 */
export function analyzePython(source, fileName = '') {
    const lines = source.split(/\r?\n/);
    const functions = [];
    let current = null;
    let baseIndent = 0;

    const decisionRegexp = /\b(if|for|while|elif|except|case|and|or|assert|with)\b|\?\:|&&|\|\|/g;

    for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        const defMatch = line.match(/^(\s*)def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (defMatch) {
            // finish previous function (if any)
            if (current) {
                functions.push(current);
            }
            baseIndent = defMatch[1].length;
            current = { name: defMatch[2], complexity: 1, start: idx + 1 };
            continue;
        }

        if (current) {
            const indent = (line.match(/^(\s*)/)[1] || '').length;
            if (indent <= baseIndent && line.trim() !== '') {
                // we've left the function block
                functions.push(current);
                current = null;
                continue;
            }
            // count decisions in this line
            let m;
            while ((m = decisionRegexp.exec(line)) !== null) {
                current.complexity++;
            }
        }
    }
    if (current) {
        functions.push(current);
    }
    const aggregate = functions.reduce((sum, fn) => sum + fn.complexity, 0);
    return { file: fileName, functions, aggregate };
}
