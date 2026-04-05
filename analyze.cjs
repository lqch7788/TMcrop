const fs = require('fs');
const content = fs.readFileSync('src/pages/ParkArchive.tsx', 'utf-8');

// Find return statement
const returnMatch = content.match(/return\s*\(\s*<div/);
if (!returnMatch) {
  console.log('No JSX found');
  process.exit(1);
}

const jsxStart = returnMatch.index + returnMatch[0].length;
const jsxContent = content.substring(jsxStart);

let inString = false;
let stringChar = '';
let braceDepth = 0;
let issues = [];

for (let i = 0; i < jsxContent.length; i++) {
  const char = jsxContent[i];
  const next = jsxContent[i+1];

  if (!inString) {
    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '{') {
      braceDepth++;
    }
    if (char === '}') {
      braceDepth--;
      if (braceDepth < 0) {
        issues.push({ pos: i, type: 'extra_close_brace', line: jsxContent.substring(0, i).split('\n').length });
      }
    }
  } else {
    // In string
    if (char === '\\' && next === stringChar) {
      i++; // skip escaped
    } else if (char === stringChar) {
      inString = false;
    }
  }
}

console.log('Brace depth at end:', braceDepth);
console.log('Issues found:', issues.length);
issues.slice(0, 10).forEach(issue => {
  console.log('  Issue:', issue.type, 'at line', issue.line);
});