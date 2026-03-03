# CodeShield

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Setup and Run
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open the local URL provided in the terminal.

### Features
- Drag‑and‑drop or select source files (.py, .java, .js, .cpp)
- Validates file type, size and readability
- **Cyclomatic complexity analysis per function and per file** (Story 2)

### Running the Tests
Unit tests exercise the complexity calculator across languages.

```bash
npm run test
```

Results should show a handful of passing cases; add more samples to
`tests/complexity.test.js` as needed.

