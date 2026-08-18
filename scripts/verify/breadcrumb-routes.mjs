import fs from "node:fs";
import path from "node:path";

const routerPath = path.join(process.cwd(), "src/app/router/AppRouter.tsx");
const breadcrumbPath = path.join(process.cwd(), "src/shared/components/dashboard/BreadCrumbs.tsx");
const router = fs.readFileSync(routerPath, "utf8");
const breadcrumbs = fs.readFileSync(breadcrumbPath, "utf8");
const routePaths = [...router.matchAll(/path="([^"]+)"/g)].map((match) => match[1]);
const routeSet = new Set(routePaths);
const missing = new Set();

for (const route of routePaths.filter((value) => value.startsWith("/dashboard/"))) {
  const segments = route.split("/").filter(Boolean);

  for (let length = 1; length < segments.length; length += 1) {
    const prefixSegments = segments.slice(0, length);
    const nextSegment = segments[length];
    const finalPrefixSegment = prefixSegments.at(-1);

    // Record identifiers immediately before edit are deliberately rendered as
    // plain breadcrumb text because many resources do not have a detail route.
    if (nextSegment === "edit" && finalPrefixSegment?.startsWith(":")) continue;

    const prefix = `/${prefixSegments.join("/")}`;
    if (!routeSet.has(prefix)) missing.add(prefix);
  }
}

if (!breadcrumbs.includes('to="/dashboard"')) {
  missing.add("breadcrumb home -> /dashboard");
}

if (missing.size > 0) {
  console.error("Breadcrumb targets without routes:");
  for (const target of [...missing].sort()) console.error(`- ${target}`);
  process.exit(1);
}

console.log(`Verified breadcrumb parents for ${routePaths.length} routes.`);
