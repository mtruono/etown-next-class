import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";

const projectRoot = process.cwd();
const failures = [];
const textExtensions = new Set([
  "",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".webmanifest",
  ".yml",
  ".yaml",
]);

function gitFiles(args) {
  try {
    const output = execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
    });
    return output.split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

function filesRecursively(directory) {
  if (!existsSync(directory)) return [];
  const results = [];
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    const relativePath = relative(projectRoot, path);
    if (
      relativePath
        .split(sep)
        .some((segment) =>
          [
            ".git",
            "node_modules",
            "private",
            "playwright-report",
            "test-results",
          ].includes(segment),
        )
    ) {
      continue;
    }
    if (statSync(path).isDirectory()) results.push(...filesRecursively(path));
    else results.push(relativePath);
  }
  return results;
}

const tracked = gitFiles(["ls-files", "-z"]);
const publicWorkingFiles = gitFiles([
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
]);

for (const file of tracked) {
  if (file === "private" || file.startsWith("private/")) {
    failures.push(`Tracked private path: ${file}`);
  }
  if (/\.ics$/iu.test(file)) failures.push(`Tracked calendar: ${file}`);
  if (/\.(?:setup|setup-url)\.txt$/iu.test(file))
    failures.push(`Tracked setup output: ${file}`);
  if (/\.private\.json$/iu.test(file))
    failures.push(`Tracked private JSON: ${file}`);
  if (/(^|\/)\.env(?:\..+)?$/u.test(file) && !file.endsWith(".env.example")) {
    failures.push(`Tracked environment file: ${file}`);
  }
}

const requiredIgnoredPaths = [
  "private/schedule.seed.json",
  "private/generated/student-setup.txt",
  "private/generated/student-setup-url.txt",
  "private/generated/student-classes.ics",
  "private/generated/schedule-audit.json",
  "private/generated/route-verification.html",
  "private/privacy-denylist.txt",
];
for (const path of requiredIgnoredPaths) {
  try {
    execFileSync("git", ["check-ignore", "--quiet", path], {
      cwd: projectRoot,
    });
  } catch {
    failures.push(`Required private path is not ignored: ${path}`);
  }
}

const distFiles = filesRecursively(resolve(projectRoot, "dist"));
for (const file of distFiles) {
  if (file.endsWith(".map"))
    failures.push(`Production source map found: ${file}`);
}
const scanFiles = [...new Set([...publicWorkingFiles, ...distFiles])].filter(
  (file) =>
    textExtensions.has(extname(file).toLowerCase()) &&
    existsSync(resolve(projectRoot, file)),
);

for (const file of scanFiles) {
  const content = readFileSync(resolve(projectRoot, file), "utf8");
  if (/ETOWN1\.[A-Za-z0-9_-]{64,}\.[0-9a-f]{16}/u.test(content)) {
    failures.push(`Setup-code value embedded in ${file}`);
  }
  if (file.startsWith("dist/")) {
    if (/#setup=ETOWN1\.[A-Za-z0-9_-]{32,}/u.test(content)) {
      failures.push(`Setup-fragment value embedded in ${file}`);
    }
    if (
      /student-(?:setup|classes)|schedule-audit|route-verification\.html/iu.test(
        content,
      )
    ) {
      failures.push(`Private generated filename found in ${file}`);
    }
    if (
      /google-analytics\.com|googletagmanager\.com|sentry\.io|api\.mixpanel\.com/iu.test(
        content,
      )
    ) {
      failures.push(`Analytics or error-reporting endpoint found in ${file}`);
    }
    if (
      /console\.(?:log|debug|info)\([^)]*(?:latitude|longitude|coords)/iu.test(
        content,
      )
    ) {
      failures.push(`Possible captured-location logging found in ${file}`);
    }
  }
}

if (failures.length) {
  process.stderr.write(
    `Privacy check failed:\n${[...new Set(failures)].map((failure) => `- ${failure}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Privacy check passed (${tracked.length} tracked and ${scanFiles.length} public/build files). The timetable is intentionally public; private generated artifacts and live GPS data remain excluded.\n`,
  );
}
