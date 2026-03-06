// Defining all vulnerability detection rules and severity metadata.

export const SEVERITY = {
  CRITICAL: { label: 'Critical', weight: 4, color: '#ef4444' },
  HIGH:     { label: 'High',     weight: 3, color: '#f97316' },
  MEDIUM:   { label: 'Medium',   weight: 2, color: '#f59e0b' },
  LOW:      { label: 'Low',      weight: 1, color: '#94a3b8' },
};

export const VULN_RULES = [
{
    id: 'HC001',
    name: 'Hardcoded Password',
    severity: SEVERITY.CRITICAL,
    owasp: 'A07:2021 – Identification and Authentication Failures',
    description: 'Hardcoded password detected. Use environment variables or a secrets manager.',
    regex: /(?:^|[\s,({])password\s*[=:]\s*["'`][^"'`]{1,}/i,
    negativePatterns: [
      /password\s*[=:]\s*["'`](?:your[_-]?password|changeme|<.*?>|\*+|xxx+|none|null|empty|placeholder)/i,
      /(?:process\.env|os\.environ|getenv|config\.|settings\.)/i,
    ],
  },
  {
    id: 'HC002',
    name: 'Hardcoded API Key / Token',
    severity: SEVERITY.CRITICAL,
    owasp: 'A07:2021 – Identification and Authentication Failures',
    description: 'Hardcoded API key or token. Rotate immediately and move to secrets management.',
    regex: /(?:api[_-]?key|api[_-]?token|auth[_-]?token|access[_-]?token|secret[_-]?key)\s*[=:]\s*["'`][A-Za-z0-9\-_]{8,}/i,
    negativePatterns: [
      /(?:process\.env|os\.environ|getenv|config\.|settings\.)/i,
      /(?:your[_-]?api[_-]?key|changeme|<.*?>|\*+|xxx+|placeholder)/i,
    ],
  },
  {
    id: 'HC003',
    name: 'Hardcoded Connection String',
    severity: SEVERITY.CRITICAL,
    owasp: 'A07:2021 – Identification and Authentication Failures',
    description: 'Hardcoded DB/service connection string with embedded credentials.',
    regex: /(?:mongodb|mysql|postgres|postgresql|mssql|redis|amqp):\/\/[^"'`\s]{4,}/i,
    negativePatterns: [
      /(?:localhost|127\.0\.0\.1).*(?:test|dev|example)/i,
    ],
  },

  // ── WEAK CRYPTOGRAPHY (OWASP A02) ─────────────────────────────────────────
  {
    id: 'WC001',
    name: 'Use of MD5',
    severity: SEVERITY.HIGH,
    owasp: 'A02:2021 – Cryptographic Failures',
    description: 'MD5 is cryptographically broken. Use SHA-256 or stronger.',
    regex: /\b(?:md5|MD5)\s*\(|hashlib\.md5|MessageDigest\.getInstance\s*\(\s*["']MD5["']\)|CryptoJS\.MD5/,
    negativePatterns: [
      /\/\/.*md5|#.*md5/i,
    ],
  },
  {
    id: 'WC002',
    name: 'Use of SHA-1',
    severity: SEVERITY.HIGH,
    owasp: 'A02:2021 – Cryptographic Failures',
    description: 'SHA-1 is deprecated for security use. Migrate to SHA-256 or SHA-3.',
    regex: /\b(?:sha1|SHA1|SHA-1)\s*\(|hashlib\.sha1|MessageDigest\.getInstance\s*\(\s*["']SHA-?1["']\)|CryptoJS\.SHA1/,
    negativePatterns: [
      /\/\/.*sha1|#.*sha1/i,
    ],
  },
  {
    id: 'WC003',
    name: 'Use of DES / 3DES',
    severity: SEVERITY.HIGH,
    owasp: 'A02:2021 – Cryptographic Failures',
    description: 'DES/3DES is insecure. Use AES-256-GCM.',
    regex: /\b(?:DES|3DES|TripleDES|DESede)\b|Cipher\.getInstance\s*\(\s*["']DES/,
    negativePatterns: [],
  },
  {
    id: 'WC004',
    name: 'Weak SSL/TLS Version',
    severity: SEVERITY.HIGH,
    owasp: 'A02:2021 – Cryptographic Failures',
    description: 'Deprecated SSL/TLS version. Enforce TLS 1.2+ (preferably 1.3).',
    regex: /(?:SSLv2|SSLv3|TLSv1(?:\.0|\.1)?)[^.2-9]|PROTOCOL_SSLv[23]|PROTOCOL_TLSv1(?!\.[23])/,
    negativePatterns: [],
  },
  {
    id: 'WC005',
    name: 'SSL Certificate Verification Disabled',
    severity: SEVERITY.HIGH,
    owasp: 'A02:2021 – Cryptographic Failures',
    description: 'SSL certificate verification disabled — enables MITM attacks.',
    regex: /verify\s*=\s*False|rejectUnauthorized\s*:\s*false|ssl_verify\s*=\s*false/i,
    negativePatterns: [
      /\/\/.*verify|#.*verify/i,
    ],
  },

  // ── SQL INJECTION (OWASP A03) ──────────────────────────────────────────────
  {
    id: 'SI001',
    name: 'SQL Injection – String Concatenation',
    severity: SEVERITY.CRITICAL,
    owasp: 'A03:2021 – Injection',
    description: 'Unparameterized SQL query built with user input. Use prepared statements.',
    regex: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\s+.{0,60}(?:\+\s*(?:req\.|request\.|params\.|query\.|body\.|user|input|data)|`[^`]*\$\{|f["'][^"']*\{)/i,
    negativePatterns: [
      /prepare|parameteriz|placeholder|\?\s*,|\$\d/i,
    ],
  },
  {
    id: 'SI002',
    name: 'SQL Injection – execute() with format string',
    severity: SEVERITY.CRITICAL,
    owasp: 'A03:2021 – Injection',
    description: 'String-formatted SQL in execute(). Use parameterized execute("...", (val,)).',
    regex: /\.execute\s*\(\s*(?:f["']|["'][^"']*%\s*(?:\(|\w))/,
    negativePatterns: [
      /\.execute\s*\(\s*["'][^"']*["']\s*,\s*[[(]/,
    ],
  },

  // ── UNSAFE EXECUTION (OWASP A03) ──────────────────────────────────────────
  {
    id: 'UE001',
    name: 'Use of eval()',
    severity: SEVERITY.CRITICAL,
    owasp: 'A03:2021 – Injection',
    description: 'eval() executes arbitrary code. Replace with JSON.parse() or a safe parser.',
    regex: /(?:^|[^.\w])eval\s*\(/,
    negativePatterns: [
      /\/\/.*eval|#.*eval/i,
    ],
  },
  {
    id: 'UE002',
    name: 'Unsafe Shell Execution',
    severity: SEVERITY.CRITICAL,
    owasp: 'A03:2021 – Injection',
    description: 'Shell execution with unsanitized input enables command injection.',
    regex: /\bexec(?:Sync|File)?\s*\(|subprocess\.(?:call|run|Popen)\s*\(.*shell\s*=\s*True/,
    negativePatterns: [
      /\/\/.*exec|#.*exec/i,
    ],
  },
  {
    id: 'UE003',
    name: 'Unsafe Deserialization',
    severity: SEVERITY.HIGH,
    owasp: 'A08:2021 – Software and Data Integrity Failures',
    description: 'Unsafe deserialization can lead to RCE. Use yaml.safe_load, JSON, or signed tokens.',
    regex: /pickle\.loads?\s*\(|yaml\.load\s*\([^,)]*\)|ObjectInputStream|unserialize\s*\(/,
    negativePatterns: [
      /yaml\.safe_load/,
    ],
  },

  // ── INSECURE CONFIGURATION (OWASP A05) ────────────────────────────────────
  {
    id: 'IC001',
    name: 'Debug Mode Enabled',
    severity: SEVERITY.MEDIUM,
    owasp: 'A05:2021 – Security Misconfiguration',
    description: 'Debug mode enabled. Disable before production deployment.',
    regex: /\bdebug\s*[=:]\s*(?:true|True|1|on)\b/i,
    negativePatterns: [
      /\/\/.*debug|#.*debug/i,
      /(?:is[_-]?debug|debug[_-]?mode|debug[_-]?flag)\s*=/i,
    ],
  },
  {
    id: 'IC002',
    name: 'Service Bound to All Interfaces',
    severity: SEVERITY.LOW,
    owasp: 'A05:2021 – Security Misconfiguration',
    description: 'Binding to 0.0.0.0 exposes the service on all network interfaces.',
    regex: /['"` ]0\.0\.0\.0['"` ]/,
    negativePatterns: [
      /\/\/.*0\.0\.0\.0|#.*0\.0\.0\.0/,
    ],
  },
  {
    id: 'IC003',
    name: 'CORS Wildcard (*)',
    severity: SEVERITY.MEDIUM,
    owasp: 'A05:2021 – Security Misconfiguration',
    description: 'Wildcard CORS policy allows any origin. Restrict to trusted domains.',
    regex: /Access-Control-Allow-Origin\s*:\s*['"*]\*['"]?|cors\s*\(\s*\{[^}]*origin\s*:\s*['"]\*['"]/i,
    negativePatterns: [],
  },
];