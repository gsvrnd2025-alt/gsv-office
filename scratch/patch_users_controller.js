const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/modules/users/users.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

const originalLineEndings = content.includes('\r\n') ? '\r\n' : '\n';
let normalized = content.replace(/\r\n/g, '\n');

// 1. Add SkipThrottle import
const importTarget = "import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/create-user.dto';";
const importReplacement = `${importTarget}\nimport { SkipThrottle } from '@nestjs/throttler';`;

// 2. Add @SkipThrottle() to getDirectory route
const routeTarget = `  @Get('directory')
  @ApiOperation({ summary: 'Get all active users for peer directory (no admin permission needed)' })`;

const routeReplacement = `  @Get('directory')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get all active users for peer directory (no admin permission needed)' })`;

if (normalized.includes(importTarget) && normalized.includes(routeTarget)) {
  normalized = normalized.replace(importTarget, importReplacement);
  normalized = normalized.replace(routeTarget, routeReplacement);
  
  const finalContent = originalLineEndings === '\r\n' ? normalized.replace(/\n/g, '\r\n') : normalized;
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log('✅ users.controller.ts patched successfully!');
} else {
  console.error('❌ Could not find search targets in users.controller.ts');
  process.exit(1);
}
