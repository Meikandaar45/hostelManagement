const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/meira/Downloads/PRO/SE/V1/hostel-management/client/src/pages';

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;
    for (const [regex, replacement] of replacements) {
        if (regex.test(content)) {
            content = content.replace(regex, replacement);
            changed = true;
        }
    }
    if (changed) fs.writeFileSync(filepath, content);
}

const replacements = [
    [/type:\s*'danger'/g, "type: 'error'"],
    [/variant='danger'/g, "variant='error'"],
    [/<ConfirmDialog([^>]*)description=/g, "<ConfirmDialog$1message="]
];

function traverse(d) {
    for (const f of fs.readdirSync(d)) {
        const fullPath = path.join(d, f);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (f.endsWith('.tsx')) {
            replaceInFile(fullPath, replacements);
        }
    }
}
traverse(dir);
console.log('Done');
