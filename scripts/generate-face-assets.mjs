import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, 'internal', 'server', 'static', 'assets', 'homi-face');
const apiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const jobs = [
  {
    file: 'face-base.png',
    prompt: [
      'Create a square app asset for a friendly home companion robot face plate.',
      'The image should be a warm rounded ceramic-plastic face surface with soft amber highlights.',
      'No eyes, no mouth, no antenna, no body, no text, no logo, no watermark.',
      'The whole image can be cropped inside a circular or rounded-square mask in CSS.',
      'Keep the surface clean and centered with subtle depth and gentle shading.',
    ].join(' '),
  },
  {
    file: 'eye.png',
    prompt: [
      'Create one square app asset for a single friendly robot eye lens.',
      'The eye is glossy dark navy and blue with a bright white highlight and soft inner depth.',
      'No eyelids, no face, no text, no logo, no watermark.',
      'Center the eye lens and make it work when clipped to a circle in CSS.',
    ].join(' '),
  },
  {
    file: 'mouth.png',
    prompt: [
      'Create one square app asset for a friendly robot mouth texture.',
      'The mouth is a warm coral-orange rounded horizontal smile bar with soft highlight and depth.',
      'No face, no teeth, no tongue, no text, no logo, no watermark.',
      'Center the shape so it works when clipped to a rounded pill in CSS.',
    ].join(' '),
  },
];

async function loadEnvFile(fileName) {
  const envPath = path.join(repoRoot, fileName);
  if (!existsSync(envPath)) {
    return;
  }

  const text = await readFile(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key]) {
      continue;
    }

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function imageRequest(prompt) {
  return {
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
    prompt,
    n: 1,
    size: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
    quality: process.env.OPENAI_IMAGE_QUALITY || 'low',
    output_format: 'png',
  };
}

async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function generateAsset(apiKey, job) {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(imageRequest(job.prompt)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI image generation failed for ${job.file}: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const image = payload?.data?.[0];
  if (typeof image?.b64_json === 'string') {
    return Buffer.from(image.b64_json, 'base64');
  }
  if (typeof image?.url === 'string') {
    return downloadImage(image.url);
  }
  throw new Error(`OpenAI response did not include image data for ${job.file}`);
}

await loadEnvFile('.env');
await loadEnvFile('.env.local');

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is required. Add it to .env or export it before running this script.');
}

await mkdir(outputDir, { recursive: true });

for (const job of jobs) {
  console.log(`Generating ${job.file} with ${process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'}...`);
  const bytes = await generateAsset(apiKey, job);
  const outPath = path.join(outputDir, job.file);
  await writeFile(outPath, bytes);
  console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
}
