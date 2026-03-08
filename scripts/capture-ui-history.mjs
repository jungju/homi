import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function readManifestVersion() {
  const manifestPath = path.resolve('docs/machine/manifest.v1.yaml');
  const raw = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  return typeof manifest.version === 'string' && manifest.version.length > 0 ? manifest.version : 'v1';
}

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

function timestampForPath(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

const version = readManifestVersion();
const createdAt = new Date();
const stamp = timestampForPath(createdAt);
const commit = getGitCommit();
const outputDir = path.resolve('artifacts', 'ui-history', version, stamp);
const rootDir = path.resolve('artifacts', 'ui-history', version);
const latestRunPath = path.join(rootDir, 'latest-run.json');

function resolvePlaywrightCliPath() {
  const candidates = [
    path.resolve('node_modules', '@playwright', 'test', 'cli.js'),
    path.resolve('node_modules', 'playwright', 'cli.js'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find a Playwright CLI entrypoint. Checked: ${candidates.join(', ')}`,
  );
}

const playwrightCliPath = resolvePlaywrightCliPath();

mkdirSync(outputDir, { recursive: true });

writeFileSync(
  path.join(outputDir, 'run-request.json'),
  JSON.stringify(
    {
      version,
      createdAt: createdAt.toISOString(),
      commit,
      outputDir,
      command: 'npm run ui:history',
    },
    null,
    2,
  ),
  'utf8',
);

const env = {
  ...process.env,
  HOMI_UI_HISTORY_DIR: outputDir,
  HOMI_UI_HISTORY_VERSION: version,
  HOMI_UI_HISTORY_CREATED_AT: createdAt.toISOString(),
  HOMI_UI_HISTORY_COMMIT: commit,
};

execFileSync(
  process.execPath,
  [playwrightCliPath, 'test', 'tests/e2e/ui-history.spec.ts', '--reporter=line'],
  {
    stdio: 'inherit',
    env,
  },
);

mkdirSync(rootDir, { recursive: true });
writeFileSync(
  latestRunPath,
  JSON.stringify(
    {
      version,
      createdAt: createdAt.toISOString(),
      commit,
      outputDir: path.relative(process.cwd(), outputDir),
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`UI history saved to ${outputDir}`);
