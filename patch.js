const fs = require('fs');
let c = fs.readFileSync('wrangler.jsonc', 'utf8');
c = c.replace(/"GOOGLE_CLIENT_ID"\s*:\s*"[^"]*"/, '"GOOGLE_CLIENT_ID": "' + process.env.GOOGLE_CLIENT_ID + '"');
c = c.replace(/"GOOGLE_CLIENT_SECRET"\s*:\s*"[^"]*"/, '"GOOGLE_CLIENT_SECRET": "' + process.env.GOOGLE_CLIENT_SECRET + '"');
c = c.replace(/"PAYPAL_CLIENT_ID"\s*:\s*"[^"]*"/, '"PAYPAL_CLIENT_ID": "' + process.env.PAYPAL_CLIENT_ID + '"');
c = c.replace(/"PAYPAL_CLIENT_SECRET"\s*:\s*"[^"]*"/, '"PAYPAL_CLIENT_SECRET": "' + process.env.PAYPAL_CLIENT_SECRET + '"');
fs.writeFileSync('wrangler.jsonc', c);
console.log('Patched wrangler.jsonc with secrets');
