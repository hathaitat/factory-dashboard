const fs = require('fs');
const path = require('path');

const dir = './src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

let changedFiles = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We'll replace <table ...> with <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>\n<table ...>
    // But ONLY if it's not preceded by `<div className="table-responsive-wrapper"` or `overflowX: 'auto'`
    // Actually, it's safer to just look for `<table` and `</table>`
    // Let's use a simpler approach: wrap all tables, and if it causes a double wrap, it's harmless visually. 
    // To avoid double wrapping if we run it twice, we check if `table-responsive-wrapper` is already in the file.

    // Instead of Regex, let's just do a simple string replacement for known table starts if they are not already wrapped.
    // A better way: replace `<table ` with `<div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}><table `
    // and `</table>` with `</table></div>`

    // But what if it's already wrapped? Let's clear out the old wrapper if it matches the EXACT style we know some have:
    content = content.replace(/<div style=\{\{ overflowX: 'auto' \}\}>\s*(<table[^>]*>[\s\S]*?<\/table>)\s*<\/div>/g, '$1');
    content = content.replace(/<div className="table-responsive-wrapper"[^>]*>\s*(<table[^>]*>[\s\S]*?<\/table>)\s*<\/div>/g, '$1');

    // Now re-wrap ALL tables uniformly
    content = content.replace(/(<table[^>]*>[\s\S]*?<\/table>)/g, '<div className="table-responsive-wrapper" style={{ overflowX: \'auto\', WebkitOverflowScrolling: \'touch\' }}>\n$1\n</div>');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        changedFiles++;
        console.log(`Updated tables in: ${file}`);
    }
}

console.log(`Done. Changed ${changedFiles} files.`);
