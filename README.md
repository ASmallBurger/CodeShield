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
- **File Upload**: Drag‑and‑drop or select source files (.py, .java, .js, .cpp). Validates file type, size, and readability.
- **Cyclomatic Complexity Analysis**: Calculates decision points per function and aggregates complexity per file.
- **Vulnerability Scanning**: Uses language-specific pattern matching to identify potential security issues (e.g., hardcoded secrets, dangerous functions).
- **Technical Debt Index (TDI) Calculation**: 
  - Computes a comprehensive TDI score based on complexity and vulnerability density.
  - Formula: `TDI = (Normalized Complexity Score * 0.5) + (Vulnerabilities per 1,000 LOC * 0.5)`
- **Report Generation**: 
  - Generates an actionable, easy-to-read report ranking modules from highest to lowest TDI.
  - Highlights high-risk modules with visual risk badges (Low, Medium, High, Critical).
  - Provides a detailed breakdown of per-function complexity and a list of detected vulnerabilities.
- **Configurable Thresholds**: 
  - Adjustable thresholds for TDI (default: 50), Function Complexity (default: 10), and Vulnerability Density (default: 20).
  - Settings are accessible via the UI and persist across sessions using local storage.

### Running the Tests
Unit tests exercise the complexity calculator across languages.

```bash
npm run test
```

Results should show a handful of passing cases; add more samples to
`tests/complexity.test.js` as needed.

