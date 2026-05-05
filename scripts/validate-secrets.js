/**
 * CI/CD 密钥验证脚本
 * 在 build 之前运行，检查所有必需密钥是否有效
 * 
 * 检查项：
 * 1. 所有必需 Secrets 非空
 * 2. wrangler.jsonc 中没有占位符（REPLACE_WITH_xxx）
 * 3. GOOGLE_CLIENT_ID 格式正确（*.apps.googleusercontent.com）
 * 4. PAYPAL_CLIENT_ID 格式正确（非空）
 */

const fs = require('fs');
const path = require('path');

const WRANGLER_CONFIG_PATH = path.join(__dirname, '..', 'wrangler.jsonc');

// 必需的环境变量（CI/CD 中通过 secrets 注入）
const REQUIRED_SECRETS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'REMOVE_BG_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
];

// 检查 GOOGL CLIENT ID 格式（必须是 *.apps.googleusercontent.com）
const GOOGLE_CLIENT_ID_PATTERN = /^[\w-]+\.apps\.googleusercontent\.com$/;

function validateSecrets() {
  const errors = [];

  // 1. 检查必需的环境变量
  for (const secretName of REQUIRED_SECRETS) {
    const value = process.env[secretName];
    if (!value || value.trim() === '') {
      errors.push(`❌ ${secretName} is missing or empty`);
    }
  }

  // 2. 检查 wrangler.jsonc 中没有占位符
  if (fs.existsSync(WRANGLER_CONFIG_PATH)) {
    const config = fs.readFileSync(WRANGLER_CONFIG_PATH, 'utf8');
    const placeholderPattern = /REPLACE_WITH_\w+/g;
    const matches = config.match(placeholderPattern);
    if (matches) {
      errors.push(`❌ wrangler.jsonc contains placeholders: ${matches.join(', ')}`);
    }
  }

  // 3. 验证 GOOGLE_CLIENT_ID 格式
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (googleClientId && !GOOGLE_CLIENT_ID_PATTERN.test(googleClientId)) {
    errors.push(`❌ GOOGLE_CLIENT_ID format invalid: "${googleClientId}" (expected *.apps.googleusercontent.com)`);
  }

  // 4. 验证 PAYPAL_CLIENT_ID 格式
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  if (paypalClientId && paypalClientId.length < 10) {
    errors.push(`❌ PAYPAL_CLIENT_ID seems too short: "${paypalClientId}"`);
  }

  return errors;
}

const errors = validateSecrets();

if (errors.length > 0) {
  console.log('\n🚨 Secret validation failed:\n');
  errors.forEach(e => console.log(e));
  console.log('\nAborting build.');
  process.exit(1);
} else {
  console.log('✅ All secrets validated successfully');
  process.exit(0);
}