import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const APPS_DIR = join(ROOT, "apps");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function isMutatingRoute(content) {
  return /(export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\s*\()/m.test(content);
}

function hasCsrfGuard(content) {
  return content.includes("ensureCsrf(");
}

function isCsrfExempt(content) {
  return content.includes("SECURITY_CSRF_EXEMPT");
}

const files = walk(APPS_DIR).filter(
  (f) => f.endsWith("route.ts") && f.includes(`${join("src", "app", "api")}`)
);

const violations = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (!isMutatingRoute(content)) continue;
  if (isCsrfExempt(content)) continue;
  if (!hasCsrfGuard(content)) {
    violations.push(file.startsWith(`${ROOT}\\`) ? file.slice(ROOT.length + 1) : file);
  }
}

if (violations.length > 0) {
  console.error("Security check failed: mutating API routes without ensureCsrf()");
  for (const v of violations) {
    console.error(` - ${v}`);
  }
  process.exit(1);
}

console.log("Security check passed: all mutating API routes include ensureCsrf().");
