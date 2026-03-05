const fs = require('fs');
const path = require('path');

const dir = './src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

let changedFiles = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    const regex = /<div\s+style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:/g;

    content = content.replace(regex, '<div className="grid-mobile-stack" style={{ display: \'grid\', gridTemplateColumns:');

    // Some tags might already have a className. 
    // This script assumes simple tags for now.

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        changedFiles++;
        console.log(`Updated: ${file}`);
    }
}

console.log(`Done. Changed ${changedFiles} files.`);
