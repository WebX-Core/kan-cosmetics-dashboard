import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/shared/api/api.ts');
const source = fs.readFileSync(file, 'utf8');

const hasShouldSkipImport = /shouldSkipRecaptcha/.test(source);
const hasSkipGuard = /shouldSkipRecaptcha\(config\.method,\s*requestPath\)/.test(source);
const hasHeader = /x-recaptcha-token/.test(source);

const failures = [];
if (!hasShouldSkipImport) failures.push('Missing shouldSkipRecaptcha import usage');
if (!hasSkipGuard) failures.push('Missing skip guard in request interceptor');
if (!hasHeader) failures.push('Missing x-recaptcha-token header injection');

const report = [
  '# Recaptcha Policy Audit',
  '',
  `- has skip import: ${hasShouldSkipImport}`,
  `- has skip guard: ${hasSkipGuard}`,
  `- has header injection: ${hasHeader}`,
  '',
  '## Failures',
  ...(failures.length ? failures.map((f) => `- ${f}`) : ['- none']),
  '',
];

const outPath = path.join(process.cwd(), 'RECAPTCHA_POLICY_AUDIT.md');
fs.writeFileSync(outPath, report.join('\n'));

console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
console.log(`failures=${failures.length}`);

if (failures.length > 0) process.exit(1);
