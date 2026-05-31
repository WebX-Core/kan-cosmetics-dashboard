import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const walk = (dir, matcher) => {
  const out = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      if (entry.isFile() && matcher(full)) out.push(full);
    }
  }
  return out;
};

const normalizePath = (value) => {
  if (!value.startsWith('/')) return value;
  return value
    .replace(/\$\{[^}]+\}/g, ':id')
    .replace(/\/:[A-Za-z_][A-Za-z0-9_]*/g, '/:id');
};

const apiDoc = fs.readFileSync(path.join(repoRoot, 'api.md'), 'utf8');
const docModules = [...apiDoc.matchAll(/### Module: `\/(.*?)`/g)].map((m) => m[1]);
const docEndpoints = [];
let activeModule = null;
for (const line of apiDoc.split('\n')) {
  const moduleMatch = line.match(/^### Module: `\/(.*?)`/);
  if (moduleMatch) {
    activeModule = moduleMatch[1];
    continue;
  }
  if (!activeModule) continue;
  const endpointMatch = line.match(/\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`([^`]+)`\s*\|/);
  if (!endpointMatch) continue;
  docEndpoints.push({
    method: endpointMatch[1],
    path: `/${activeModule}${endpointMatch[2]}`,
  });
}

const featureFiles = walk(path.join(repoRoot, 'src/features'), (f) => f.endsWith('.api.ts'));
let featureSource = '';
for (const file of featureFiles) {
  featureSource += `\n${fs.readFileSync(file, 'utf8')}`;
}

const frontendModules = new Set();
for (const m of featureSource.matchAll(/basePath:\s*["'`](\/[^"'`]+)["'`]/g)) frontendModules.add(m[1].slice(1));
for (const m of featureSource.matchAll(/api\.(?:get|post|put|patch|delete)\(\s*["'`](\/[^"'`]+)["'`]/g)) frontendModules.add(m[1].split('/')[1]);
for (const m of featureSource.matchAll(/api\.(get|post|put|patch|delete)\(\s*`(\/[^`]+)`/g)) {
  frontendModules.add(m[2].split('/')[1]);
}

const frontendEndpoints = [];
for (const m of featureSource.matchAll(/api\.(get|post|put|patch|delete)\(\s*["'`](\/[^"'`]+)["'`]/g)) {
  frontendEndpoints.push({ method: m[1].toUpperCase(), path: normalizePath(m[2]) });
}
for (const m of featureSource.matchAll(/api\.(get|post|put|patch|delete)\(\s*`(\/[^`]+)`/g)) {
  frontendEndpoints.push({ method: m[1].toUpperCase(), path: normalizePath(m[2]) });
}

for (const m of featureSource.matchAll(/makeStandardCrud(?:<[\s\S]*?>)?\(\{([\s\S]*?)\}\)/g)) {
  const args = m[1];
  const basePathMatch = args.match(/basePath:\s*["'`](\/[^"'`]+)["'`]/);
  if (!basePathMatch) continue;
  const basePath = basePathMatch[1];

  const hasUpdate = !/update:\s*false/.test(args);
  const hasGetOne = !/getOne:\s*false/.test(args);
  const hasDeleted = !/deleted:\s*false/.test(args);
  const hasRecover = !/recover:\s*false/.test(args);
  const hasDestroy = !/destroy:\s*false/.test(args);

  frontendEndpoints.push({ method: 'GET', path: normalizePath(`${basePath}/get-all`) });
  if (hasGetOne) frontendEndpoints.push({ method: 'GET', path: normalizePath(`${basePath}/get/:id`) });
  frontendEndpoints.push({ method: 'POST', path: normalizePath(`${basePath}/create`) });
  frontendEndpoints.push({ method: 'DELETE', path: normalizePath(`${basePath}/delete/:id`) });
  if (hasUpdate) frontendEndpoints.push({ method: 'PUT', path: normalizePath(`${basePath}/update/:id`) });
  if (hasDeleted) frontendEndpoints.push({ method: 'GET', path: normalizePath(`${basePath}/deleted`) });
  if (hasRecover) frontendEndpoints.push({ method: 'PUT', path: normalizePath(`${basePath}/recover`) });
  if (hasDestroy) frontendEndpoints.push({ method: 'DELETE', path: normalizePath(`${basePath}/destroy/:id`) });
}

const docEndpointSet = new Set(docEndpoints.map((e) => `${e.method} ${normalizePath(e.path)}`));
const frontendEndpointSet = new Set(frontendEndpoints.map((e) => `${e.method} ${e.path}`));

const missingModules = [...new Set(docModules)].filter((mod) => !frontendModules.has(mod)).sort();
const extraModules = [...frontendModules].filter((mod) => !docModules.includes(mod)).sort();
const missingEndpoints = [...docEndpointSet].filter((e) => !frontendEndpointSet.has(e)).sort();
const extraEndpoints = [...frontendEndpointSet].filter((e) => !docEndpointSet.has(e)).sort();

const report = [
  '# API Parity Audit',
  '',
  `- doc modules: ${[...new Set(docModules)].length}`,
  `- frontend feature modules: ${frontendModules.size}`,
  `- missing modules: ${missingModules.length}`,
  `- extra modules: ${extraModules.length}`,
  `- missing endpoints: ${missingEndpoints.length}`,
  `- extra endpoints: ${extraEndpoints.length}`,
  '',
  '## Missing Modules',
  ...(missingModules.length ? missingModules.map((m) => `- ${m}`) : ['- none']),
  '',
  '## Extra Modules',
  ...(extraModules.length ? extraModules.map((m) => `- ${m}`) : ['- none']),
  '',
  '## Missing Endpoints',
  ...(missingEndpoints.length ? missingEndpoints.map((e) => `- ${e}`) : ['- none']),
  '',
  '## Extra Endpoints',
  ...(extraEndpoints.length ? extraEndpoints.map((e) => `- ${e}`) : ['- none']),
  '',
];

const outPath = path.join(repoRoot, 'API_PARITY_AUDIT.md');
fs.writeFileSync(outPath, report.join('\n'));

console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
console.log(`missingModules=${missingModules.length} extraModules=${extraModules.length} missingEndpoints=${missingEndpoints.length} extraEndpoints=${extraEndpoints.length}`);

if (missingModules.length > 0 || extraModules.length > 0) process.exit(1);
