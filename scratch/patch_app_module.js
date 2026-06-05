const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/app.module.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF for easier string matching, then write back with original line endings if needed.
const originalLineEndings = content.includes('\r\n') ? '\r\n' : '\n';
const normalizedContent = content.replace(/\r\n/g, '\n');

const target = `    // ── Rate Limiting ──────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL', 900) * 1000,
            limit: config.get<number>('RATE_LIMIT_MAX', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),`;

const replacement = `    // ── Rate Limiting ──────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get('RATE_LIMIT_TTL', 900)) * 1000,
            limit: Number(config.get('RATE_LIMIT_MAX', 100)),
          },
        ],
      }),
      inject: [ConfigService],
    }),`;

if (normalizedContent.includes(target.replace(/\r\n/g, '\n'))) {
  const newNormalized = normalizedContent.replace(target.replace(/\r\n/g, '\n'), replacement.replace(/\r\n/g, '\n'));
  const finalContent = originalLineEndings === '\r\n' ? newNormalized.replace(/\n/g, '\r\n') : newNormalized;
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log('✅ app.module.ts patched successfully!');
} else {
  console.error('❌ Could not find rate limit target block in app.module.ts');
  process.exit(1);
}
