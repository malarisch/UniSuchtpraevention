import fs from 'fs';

let str = "";
export function loadGoldenIDs() {
    const data = fs.readFileSync('test2golden.md', 'utf8');
    const starts = data.split('## [');
    try {
    for (var i in starts) {
        str += " OR id='"+starts[parseInt(i)+1].split(']')[0] + "'";
        console.log(starts[parseInt(i)+1].split(']')[0]);
    }
    } catch (error) {
        console.error("Error processing golden IDs:", error);
    }
    console.log(str);
}

loadGoldenIDs();