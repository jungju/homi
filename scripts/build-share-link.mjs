import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const IMPORT_PARAM = 'import';
const DEFAULT_BASE_URL = 'https://example.com/brain';
const WARN_URL_LENGTH = 4000;

function printUsage() {
  console.error('Usage: node scripts/build-share-link.mjs <bundle.json> [--base https://host/brain]');
}

function sanitizeBaseUrl(raw) {
  const parsed = new URL(raw);
  parsed.searchParams.delete(IMPORT_PARAM);
  return parsed;
}

function detectDefaultBaseUrl() {
  const cnamePath = resolve('public/CNAME');
  if (!existsSync(cnamePath)) {
    return DEFAULT_BASE_URL;
  }

  const host = readFileSync(cnamePath, 'utf8').trim().replace(/^https?:\/\//, '');
  if (!host) {
    return DEFAULT_BASE_URL;
  }

  return `https://${host}/brain`;
}

const args = process.argv.slice(2);
const bundlePath = args.find((arg) => !arg.startsWith('--'));
const baseFlagIndex = args.findIndex((arg) => arg === '--base');
const baseUrl =
  baseFlagIndex >= 0 && args[baseFlagIndex + 1] ? args[baseFlagIndex + 1] : detectDefaultBaseUrl();

if (!bundlePath) {
  printUsage();
  process.exit(1);
}

const bundleText = readFileSync(resolve(bundlePath), 'utf8');
const payload = Buffer.from(bundleText, 'utf8').toString('base64url');
const shareUrl = sanitizeBaseUrl(baseUrl);
shareUrl.searchParams.set(IMPORT_PARAM, payload);

console.log(shareUrl.href);

if (shareUrl.href.length > WARN_URL_LENGTH) {
  console.error(
    `Warning: generated URL length is ${shareUrl.href.length}. Large bundles may be difficult to open or share as a QR code.`,
  );
}
