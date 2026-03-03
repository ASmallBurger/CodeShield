// tests/complexity.test.js
// Basic unit tests covering cyclomatic complexity calculation for several
// languages and edge cases.

import { calculateComplexity } from '../src/analysis/complexityCalculator.js';
import { parseJavaScript } from '../src/analysis/parsers/jsParser.js';
import { parsePython } from '../src/analysis/parsers/pythonParser.js';
import { parseJava } from '../src/analysis/parsers/javaParser.js';
import { parseCpp } from '../src/analysis/parsers/cppParser.js';

// Utility to run parser and return first function complexity
function complexityOf(code, parser) {
  const list = parser(code);
  return list.length > 0 ? list[0].complexity : calculateComplexity({});
}

test('JS simple if adds one', () => {
  const code = 'function a(){ if(x){}}';
  const fns = parseJavaScript(code);
  expect(fns[0].complexity).toBe(2);
});

test('JS nested loops increase complexity', () => {
  const code = 'function b(){ for(;;){ while(1){} } }';
  const fns = parseJavaScript(code);
  expect(fns[0].complexity).toBe(3);
});

test('Python if and and/or counting', () => {
  const code = `def foo():\n    if x and y or z:\n        pass`;
  const fns = parsePython(code);
  expect(fns[0].complexity).toBe(3); // 1 entry + if + logical op
});

test('Java method complexity', () => {
  const code = `public class A {\n  void m(){ if(a){} else if(b){} }\n}`;
  const fns = parseJava(code);
  expect(fns[0].complexity).toBe(3);
});

test('C++ function with ternary and case', () => {
  const code = `int f(){ switch(x){ case 1: break; } return y?1:0; }`;
  const fns = parseCpp(code);
  expect(fns[0].complexity).toBe(4); // entry + case + ternary + switch? (switch not counted separately)
});

test('Empty JS function should be complexity 1', () => {
  const code = 'function empty(){}';
  const fns = parseJavaScript(code);
  expect(fns[0].complexity).toBe(1);
});

test('calculateComplexity handles raw AST node', () => {
  const fake = { type: 'IfStatement', body: {} };
  expect(calculateComplexity(fake)).toBe(2);
});
