import { analyzeJavaScript } from './parsers/jsParser.js';
import { analyzePython } from './parsers/pythonParser.js';
// future imports for Java/CPP would go here

/**
 * Accepts an array of validated file results (objects with .file, .language, etc.)
 * and returns a promise that resolves to an array of analysis reports.
 * Each report has the shape {
 *    file: string,
 *    functions: [{name, complexity, ...}],
 *    aggregate: number
 * }
 */
export async function analyzeFiles(fileResults) {
    const reports = [];
    for (const fileObj of fileResults) {
        const text = await fileObj.file.text();
        let report = { file: fileObj.name, functions: [], aggregate: 0 };
        if (!fileObj.language) {
            reports.push(report);
            continue;
        }
        switch (fileObj.language.name) {
            case 'JavaScript':
                report = analyzeJavaScript(text, fileObj.name);
                break;
            case 'Python':
                report = analyzePython(text, fileObj.name);
                break;
            case 'Java':
            case 'C++':
                // TODO: implement parsers for Java and C++
                break;
            default:
                break;
        }
        reports.push(report);
    }
    return reports;
}
