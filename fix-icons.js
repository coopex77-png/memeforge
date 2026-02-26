const { readFileSync, writeFileSync } = require('fs');
const file = 'src/components/LandingPage.tsx';
let content = readFileSync(file, 'utf8');
content = content.replace(/<SiSolana style=\{\{ width: '2rem', height: '2rem', color: '#14F195', marginLeft: '0.75rem' \}\} \/>/g, '<span style={{ width: "2rem", height: "2rem", color: "#14F195", marginLeft: "0.75rem", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><SiSolana size={32} /></span>');
writeFileSync(file, content);
