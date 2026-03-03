import { describe, it, expect } from 'vitest';
import { analyzeJavaScript } from '../src/analysis/parsers/jsParser.js';
import { analyzePython } from '../src/analysis/parsers/pythonParser.js';

describe('cyclomatic complexity analyzer', () => {
    it('handles an empty file', () => {
        const js = '';
        const report = analyzeJavaScript(js, 'empty.js');
        expect(report.functions.length).toBe(0);
        expect(report.aggregate).toBe(0);
    });

    it('counts a simple function with one if', () => {
        const js = `function foo(a) { if (a) { return 1; } }`;
        const report = analyzeJavaScript(js, 'foo.js');
        expect(report.functions[0].complexity).toBe(2); // 1 + one decision
    });

    it('counts logical operators inside a function', () => {
        const js = `const x = (a && b) || c; function bar() { return x ? 1 : 2; }`;
        const report = analyzeJavaScript(js, 'ops.js');
        // the ternary and two logical ops are counted when they occur within the function body
        expect(report.functions[0].complexity).toBe(2); // only the ternary inside bar
    });

    it('finds multiple functions and sums aggregate', () => {
        const js = `function a() { if(1){} } function b() { for(let i=0;i<1;i++){} }`;
        const report = analyzeJavaScript(js, 'multi.js');
        expect(report.functions.length).toBe(2);
        expect(report.aggregate).toBe(2 + 2); // each has complexity 2
    });

    it('parses a simple Python def with if/for', () => {
        const py = `def f(x):\n    if x:\n        return 1\n    for i in range(3):\n        pass\n`;
        const report = analyzePython(py, 'f.py');
        expect(report.functions.length).toBe(1);
        expect(report.functions[0].complexity).toBe(3); // 1 + if + for
    });

    it('treats nested blocks correctly in Python', () => {
        const py = `def g():\n    if True:\n        if False:\n            pass\n`;
        const report = analyzePython(py, 'g.py');
        expect(report.functions[0].complexity).toBe(3);
    });
});
