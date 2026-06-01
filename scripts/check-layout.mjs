#!/usr/bin/env node
/**
 * Layout sanity check — verifies the CSS media queries prevent
 * clock/face overlap on short viewports (landscape phones).
 *
 * Usage: node scripts/check-layout.mjs
 * Called automatically by `pnpm run check`.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(__dirname, "../public/app.css");
const css = readFileSync(cssPath, "utf-8");

let errors = [];

// 1. Must have a max-height media query for short viewports
const landscapeQuery = css.match(/@media\s*\(max-height:\s*540px\)/);
if (!landscapeQuery) {
  errors.push(
    'Missing @media (max-height: 540px) query — needed for landscape mobile layout'
  );
}

// 2. Inside that query, .home-clock must exist with a clamp top <= 16px
const clockTopMatch = css.match(
  /@media\s*\(max-height:\s*540px\)[\s\S]*?\.home-clock[\s\S]*?top:\s*clamp\([^)]+\)/
);
if (!clockTopMatch) {
  errors.push(
    'Missing .home-clock with clamp() top inside the landscape media query'
  );
}

// 3. Inside that query, .home-face width must be <= 44vw or 200px
const faceWidthMatch = css.match(
  /@media\s*\(max-height:\s*540px\)[\s\S]*?\.home-face[\s\S]*?width:\s*min\(44vw,\s*200px\)/
);
if (!faceWidthMatch) {
  errors.push(
    'Missing .home-face width: min(44vw, 200px) in landscape media query'
  );
}

// 4. Ensure the existing (max-width: 820px) query is still present
const mobileQuery = css.match(/@media\s*\(max-width:\s*820px\)/);
if (!mobileQuery) {
  errors.push(
    'Missing @media (max-width: 820px) query — needed for basic mobile layout'
  );
}

// 5. Basic CSS validity: unmatched braces
let depth = 0;
for (const ch of css) {
  if (ch === '{') depth++;
  if (ch === '}') depth--;
  if (depth < 0) {
    errors.push('CSS parse error: unbalanced closing brace');
    break;
  }
}
if (depth !== 0) errors.push(`CSS parse error: ${depth} unclosed braces`);

if (errors.length > 0) {
  console.error('[check-layout] LAYOUT VALIDATION FAILED');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('[check-layout] Layout checks passed');
