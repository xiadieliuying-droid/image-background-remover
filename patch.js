const fs = require('fs');
let c = fs.readFileSync('wrangler.jsonc', 'utf8');
c = c.replace(/"GOOGLE_CLIENT_ID"\s*:\s*"[^"]*"/, '"GOOGLE_CLIENT_ID": "' + process.env.GOOGLE_CLIENT_ID + '"');
c = c.replace(/"GOOGLE_CLIENT_SECRET"\s*:\s*"[^"]*"/, '"GOOGLE_CLIENT_SECRET": "' + process.env.GOOGLE_CLIENT_SECRET + '"');
fs.writeFileSync('wrangler.jsonc', c);
console.log('Patched wrangler.jsonc with real OAuth secrets');
