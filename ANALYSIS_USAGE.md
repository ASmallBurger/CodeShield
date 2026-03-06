## how to use (ill switch to ui usage in the future instead of just cli)

```bash
# single file
npm run analyze src/main.js

# multiple files
npm run analyze src/main.js src/utils.js

# directory (recursive)
npm run analyze src/
```

## Direct Node Command

```bash
node scripts/analyze.js <file-or-directory> [file2] [...]
```

## Programmatic Usage

```javascript
import { analyzeFromPaths, analyzeFromDirectory } from './src/analysis/fileAnalyzer.js';

// analyse files
const results = await analyzeFromPaths(['src/main.js', 'src/utils.js']);

// analyse directory
const dirResults = await analyzeFromDirectory('src/');

// results structure
results.forEach(r => {
  console.log(r.file, r.aggregate);  // filename, total complexity
  r.functions.forEach(f => console.log(f.name, f.complexity));
});
```

## the process vvvvvvvv

- reads files from disk (Node.js `fs`)
- converts to file-like objects
- passes to existing `parserManager.analyzeFiles()`
- displays formatted results with risk levels

**existing parsers havent been touched**
