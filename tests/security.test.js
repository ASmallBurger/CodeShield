// Unit tests for Story 3: Security Vulnerability Detection.

import { scanFile } from '../src/analysis/securityScanner.js';

// Helper: find first finding matching a rule ID
function findingFor(ruleId, filename, code) {
  const { findings } = scanFile(filename, code);
  return findings.find((f) => f.ruleId === ruleId) || null;
}

// Hardcoded Credentials 

test('HC001 detects hardcoded password', () => {
  const code = `const password = "SuperSecret123";`;
  const f = findingFor('HC001', 'auth.js', code);
  expect(f).not.toBeNull();
  expect(f.lineNumber).toBe(1);
  expect(f.severity.label).toBe('Critical');
});

test('HC001 does not flag env-var password (FP check)', () => {
  const code = `const password = process.env.PASSWORD;`;
  const f = findingFor('HC001', 'auth.js', code);
  expect(f).toBeNull();
});

test('HC002 detects hardcoded API key', () => {
  const code = `const api_key = "sk-abc123def456ghi789";`;
  const f = findingFor('HC002', 'config.js', code);
  expect(f).not.toBeNull();
  expect(f.lineNumber).toBe(1);
});

// Weak Cryptography 

test('WC001 detects MD5 usage in Python', () => {
  const code = `h = hashlib.md5(data).hexdigest()`;
  const f = findingFor('WC001', 'utils.py', code);
  expect(f).not.toBeNull();
  expect(f.owasp).toContain('A02');
});

test('WC002 detects SHA1 in Java MessageDigest', () => {
  const code = `MessageDigest.getInstance("SHA-1")`;
  const f = findingFor('WC002', 'Hash.java', code);
  expect(f).not.toBeNull();
});

test('WC003 detects DES cipher usage', () => {
  const code = `Cipher.getInstance("DES/CBC/PKCS5Padding")`;
  const f = findingFor('WC003', 'Cipher.java', code);
  expect(f).not.toBeNull();
});

// SQL Injection

test('SI002 detects Python f-string SQL in execute()', () => {
  const code = `cur.execute(f"SELECT * FROM users WHERE name = '{user_input}'")`;
  const f = findingFor('SI002', 'db.py', code);
  expect(f).not.toBeNull();
  expect(f.severity.label).toBe('Critical');
});

test('SI002 does not flag parameterized execute() (FP check)', () => {
  const code = `cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))`;
  const f = findingFor('SI002', 'db.py', code);
  expect(f).toBeNull();
});

// Unsafe Execution 

test('UE001 detects eval() usage', () => {
  const code = `const result = eval(userInput);`;
  const f = findingFor('UE001', 'app.js', code);
  expect(f).not.toBeNull();
  expect(f.lineNumber).toBe(1);
});

test('UE003 detects unsafe pickle.loads', () => {
  const code = `data = pickle.loads(open("f.pkl","rb").read())`;
  const f = findingFor('UE003', 'loader.py', code);
  expect(f).not.toBeNull();
});

test('UE003 does not flag yaml.safe_load (FP check)', () => {
  const code = `config = yaml.safe_load(stream)`;
  const f = findingFor('UE003', 'config.py', code);
  expect(f).toBeNull();
});

// Insecure Configuration 

test('IC001 detects debug=True in Python', () => {
  const code = `app.run(debug=True, host="0.0.0.0")`;
  const f = findingFor('IC001', 'app.py', code);
  expect(f).not.toBeNull();
  expect(f.severity.label).toBe('Medium');
});

test('IC003 detects CORS wildcard', () => {
  const code = `res.setHeader("Access-Control-Allow-Origin", "*")`;
  const f = findingFor('IC003', 'server.js', code);
  expect(f).not.toBeNull();
});

// Line number accuracy

test('Reports correct line number for finding on line 3', () => {
  const code = `const x = 1;\nconst y = 2;\nconst api_key = "realkey12345678";`;
  const f = findingFor('HC002', 'keys.js', code);
  expect(f).not.toBeNull();
  expect(f.lineNumber).toBe(3);
});

// Severity categorization

test('Findings are sorted Critical first', () => {
  const code = `
const password = "abc123secret";
debug = true;
eval(userInput);
  `.trim();
  const { findings } = scanFile('mixed.js', code);
  expect(findings[0].severity.weight).toBeGreaterThanOrEqual(findings[findings.length - 1].severity.weight);
});

// Per-file counts

test('counts per severity are accurate', () => {
  const code = `
const password = "hardcoded";
const api_key = "sk-abc123def456ghi789";
eval(input);
debug = true;
  `.trim();
  const { counts } = scanFile('multi.js', code);
  expect(counts.CRITICAL).toBeGreaterThanOrEqual(2);
  expect(counts.MEDIUM).toBeGreaterThanOrEqual(1);
});

// Performance requirement (< 2s)

test('Scans 10000-line file in under 2 seconds', () => {
  const line = `const x = require('something'); // safe line\n`;
  const bigFile = line.repeat(10_000);
  const start = performance.now();
  scanFile('large.js', bigFile);
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(2000);
});
