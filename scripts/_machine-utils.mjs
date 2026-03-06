import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function repoPath(...parts) {
  return path.resolve(process.cwd(), ...parts);
}

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

export function readText(relativePath) {
  const abs = repoPath(relativePath);
  if (!existsSync(abs)) {
    throw new Error(`File not found: ${relativePath}`);
  }
  return readFileSync(abs, 'utf8');
}

export function readJson(relativePath) {
  const raw = readText(relativePath);
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${relativePath}: ${error.message}`);
  }
}

export function readStructured(relativePath) {
  const raw = readText(relativePath);
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid machine doc format in ${relativePath}. Use JSON-compatible YAML. ${error.message}`,
    );
  }
}

export async function writeStructured(relativePath, value) {
  const abs = repoPath(relativePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function existsRelative(relativePath) {
  return existsSync(repoPath(relativePath));
}

export async function walkFiles(relativeDir) {
  const root = repoPath(relativeDir);
  const files = [];

  async function visit(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        files.push(toPosixPath(path.relative(process.cwd(), absolute)));
      }
    }
  }

  if (!existsSync(root)) {
    return files;
  }

  await visit(root);
  files.sort();
  return files;
}

export function matchesGlob(filePath, globPattern) {
  if (!globPattern.includes('*')) {
    return filePath === globPattern;
  }
  const escaped = globPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  const re = new RegExp(`^${escaped}$`);
  return re.test(filePath);
}

export async function expandGlob(globPattern) {
  const base = globPattern.split('*')[0].replace(/\/$/, '');
  const walkRoot = base === '' ? '.' : base;
  const files = await walkFiles(walkRoot);
  return files.filter((filePath) => matchesGlob(filePath, globPattern));
}

export async function fileModifiedAt(relativePath) {
  const absolute = repoPath(relativePath);
  const info = await stat(absolute);
  return info.mtime.toISOString();
}

export function collectStringPaths(input, out = new Set()) {
  if (typeof input === 'string') {
    if (/^(docs|schemas|tests|scripts|src|public)\//.test(input)) {
      out.add(input);
    }
    return out;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      collectStringPaths(item, out);
    }
    return out;
  }

  if (input && typeof input === 'object') {
    for (const value of Object.values(input)) {
      collectStringPaths(value, out);
    }
  }

  return out;
}
