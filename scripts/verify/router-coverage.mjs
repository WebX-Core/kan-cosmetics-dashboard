import fs from 'node:fs';
import path from 'node:path';

const routerPath = path.join(process.cwd(), 'src/app/router/AppRouter.tsx');
const content = fs.readFileSync(routerPath, 'utf8');

const routePaths = [...content.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
const required = [
  '/dashboard/users',
  '/dashboard/products',
  '/dashboard/orders',
  '/dashboard/categories',
  '/dashboard/inventory',
  '/dashboard/support/contacts',
  '/dashboard/support/product-inquiries',
  '/dashboard/support/site-inquiries',
  '/dashboard/coupons',
  '/dashboard/payments',
  '/dashboard/delivery/shipments',
  '/dashboard/system/api-ops',
];

const missingRoutes = required.filter((p) => !routePaths.includes(p));

const report = [
  '# Router Coverage Audit',
  '',
  `- total routes: ${routePaths.length}`,
  `- required routes checked: ${required.length}`,
  `- missing required routes: ${missingRoutes.length}`,
  '',
  '## Missing Required Routes',
  ...(missingRoutes.length ? missingRoutes.map((r) => `- ${r}`) : ['- none']),
  '',
];

const outPath = path.join(process.cwd(), 'ROUTER_COVERAGE_AUDIT.md');
fs.writeFileSync(outPath, report.join('\n'));

console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
console.log(`missingRequiredRoutes=${missingRoutes.length}`);

if (missingRoutes.length > 0) process.exit(1);
