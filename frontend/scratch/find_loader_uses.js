const fs = require('fs');
const path = require('path');

function searchDir(dir, patterns, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'build' || file === 'dist') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, patterns, results);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const p of patterns) {
        if (content.includes(p)) {
          results.push({ file: fullPath.replace(__dirname, ''), pattern: p });
          break;
        }
      }
    }
  }
  return results;
}

const matches = searchDir('src', ['FlightLoadingScreen', 'FlightSearchLoader', 'FlightRadar']);
console.log(JSON.stringify(matches, null, 2));
