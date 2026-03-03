import { parse } from 'acorn';
import * as walk from 'acorn-walk';
import { complexityFromDecisions } from '../complexityCalculator.js';

/**
 * Analyze a JavaScript source string and return an object containing
 * per-function complexity and aggregate complexity for the file.
 */
export function analyzeJavaScript(source, fileName = '') {
    const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
    const functions = [];

    // helper that counts decision points inside a node
    function decisionCounter(node) {
        let count = 0;
        walk.simple(node, {
            IfStatement() { count++; },
            ForStatement() { count++; },
            ForInStatement() { count++; },
            ForOfStatement() { count++; },
            WhileStatement() { count++; },
            DoWhileStatement() { count++; },
            SwitchCase(inner) { if (inner.test) count++; }, // skip default
            ConditionalExpression() { count++; },
            LogicalExpression(inner) {
                if (inner.operator === '||' || inner.operator === '&&') count++; 
            },
            CatchClause() { count++; },
        });
        return count;
    }

    // gather all function-like nodes
    walk.simple(ast, {
        FunctionDeclaration(node) {
            const name = node.id ? node.id.name : '<anonymous>';
            const decisions = decisionCounter(node.body);
            functions.push({ name, complexity: complexityFromDecisions(decisions) });
        },
        FunctionExpression(node) {
            const name = node.id ? node.id.name : '<anonymous>';
            const decisions = decisionCounter(node.body);
            functions.push({ name, complexity: complexityFromDecisions(decisions) });
        },
        ArrowFunctionExpression(node) {
            // arrow functions may have expression bodies
            const name = '<arrow>'; 
            const bodyNode = node.body.type === 'BlockStatement' ? node.body : { body: [node.body] };
            const decisions = decisionCounter(bodyNode);
            functions.push({ name, complexity: complexityFromDecisions(decisions) });
        },
        MethodDefinition(node) {
            const name = node.key.name || '<method>';
            const decisions = decisionCounter(node.value.body);
            functions.push({ name, complexity: complexityFromDecisions(decisions) });
        }
    }, walk.base);

    const aggregate = functions.reduce((sum, fn) => sum + fn.complexity, 0);
    return { file: fileName, functions, aggregate };
}
