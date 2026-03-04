import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
})();

const payload = {
  buildTime: new Date().toISOString(),
  commit
};

mkdirSync('public', { recursive: true });
writeFileSync('public/version.json', JSON.stringify(payload, null, 2));
console.log('version.json written', payload);
