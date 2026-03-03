// src/analysis/parsers/pythonParser.js
// Lightweight Python parser using regex to identify functions and count complexity.
// This is a simplified approach that counts complexity metrics without a full AST.

export function parsePython(code /* string */) {
  const results = [];
  const lines = code.split(/\r?\n/);
  const funDefRegex = /^\s*(?:async\s+)?def\s+(\w+)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(funDefRegex);
    if (match) {
      const name = match[1];
      let complexity = 1;

      // collect function body lines. Python is indentation-based so we look
      // for the indentation level of the def and count until we hit another
      // def or unindented line
      if (match) {
        const defIndent = line.match(/^\s*/)[0].length;
        for (let j = i + 1; j < lines.length; j++) {
          const bodyLine = lines[j];
          if (bodyLine.trim() === '') continue;  // skip empty lines

          const bodyIndent = bodyLine.match(/^\s*/)[0].length;
          // switch back to def level or less indentation = end of function
          if (bodyIndent <= defIndent && bodyLine.trim().length > 0) {
            break;
          }

          // count decision points
          const decisions = bodyLine.match(/\b(if|for|while|except|elif|else|with)\b/g) || [];
          const logical = bodyLine.match(/\band\s+|\bor\s+/g) || [];
          complexity += decisions.length + logical.length;
        }
      }

      results.push({ name, complexity: Math.max(1, complexity) });
    }
  }

  return results;
}
