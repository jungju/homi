import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API_VERSION = '2022-11-28';
const RELEASE_UI_START = '<!-- homi-release-ui:start -->';
const RELEASE_UI_END = '<!-- homi-release-ui:end -->';

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readManifestVersion() {
  const manifestPath = path.resolve('docs', 'machine', 'manifest.v1.yaml');
  const manifest = readJson(manifestPath);
  return typeof manifest.version === 'string' && manifest.version.length > 0 ? manifest.version : 'v1';
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.json') return 'application/json';
  return 'application/octet-stream';
}

function ensureReleaseEvent(event) {
  if (!event.release || typeof event.release !== 'object') {
    throw new Error('This script requires a GitHub release event payload.');
  }

  return event.release;
}

function replaceReleaseUiSection(body, section) {
  if (!body || body.trim().length === 0) {
    return section;
  }

  const blockPattern = new RegExp(
    `${RELEASE_UI_START}[\\s\\S]*?${RELEASE_UI_END}`,
    'm',
  );

  if (blockPattern.test(body)) {
    return body.replace(blockPattern, section);
  }

  return `${body.trim()}\n\n${section}`;
}

function getLatestRun() {
  const version = readManifestVersion();
  const latestRunPath = path.resolve('artifacts', 'ui-history', version, 'latest-run.json');
  const latestRun = readJson(latestRunPath);
  const sessionPath = path.resolve(latestRun.outputDir, 'session.json');
  const session = readJson(sessionPath);

  return {
    latestRunPath,
    latestRun,
    sessionPath,
    session,
  };
}

function buildUploadList(sessionPath, session) {
  const uploads = [
    {
      filePath: sessionPath,
      assetName: 'ui-history-session.json',
      screenId: null,
      state: 'session',
    },
  ];

  for (const screen of session.screens ?? []) {
    const screenshotPath = screen?.artifacts?.screenshot;
    if (!screenshotPath) {
      continue;
    }

    uploads.push({
      filePath: screenshotPath,
      assetName: path.basename(screenshotPath),
      screenId: screen.screenId,
      state: screen.state,
    });
  }

  return uploads;
}

function buildReleaseUiSection({ release, latestRun, session, uploadedAssets }) {
  const sessionAsset = uploadedAssets.find((asset) => asset.assetName === 'ui-history-session.json');
  const imageAssets = uploadedAssets.filter((asset) => asset.screenId);

  const lines = [
    RELEASE_UI_START,
    '## UI Capture',
    '',
    `- Release: \`${release.tag_name}\``,
    `- Captured At: \`${session.createdAt ?? latestRun.createdAt}\``,
    `- Commit: \`${session.commit ?? latestRun.commit}\``,
    `- Screen Count: \`${session.screenCount ?? imageAssets.length}\``,
  ];

  if (sessionAsset) {
    lines.push(`- Session JSON: [${sessionAsset.assetName}](${sessionAsset.downloadUrl})`);
  }

  lines.push('', '### Captured Screens', '');

  for (const asset of imageAssets) {
    lines.push(`<details>`);
    lines.push(`<summary><strong>${asset.state}</strong> (<code>${asset.screenId}</code>)</summary>`);
    lines.push('');
    lines.push(`![${asset.screenId}](${asset.downloadUrl})`);
    lines.push('');
    lines.push(`</details>`);
    lines.push('');
  }

  lines.push(RELEASE_UI_END);
  return lines.join('\n');
}

async function githubRequest(url, init = {}) {
  const token = requiredEnv('GITHUB_TOKEN');
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'homi-release-ui-notes',
      'X-GitHub-Api-Version': API_VERSION,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API request failed (${response.status} ${response.statusText}): ${errorBody}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function listReleaseAssets(owner, repo, releaseId) {
  return githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?per_page=100`,
  );
}

async function deleteReleaseAsset(owner, repo, assetId) {
  return githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetId}`,
    { method: 'DELETE' },
  );
}

async function uploadReleaseAsset(release, filePath, assetName) {
  const token = requiredEnv('GITHUB_TOKEN');
  const uploadUrlBase = String(release.upload_url).split('{')[0];
  const buffer = readFileSync(filePath);
  const response = await fetch(
    `${uploadUrlBase}?name=${encodeURIComponent(assetName)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Length': String(buffer.length),
        'Content-Type': getContentType(filePath),
        'User-Agent': 'homi-release-ui-notes',
      },
      body: buffer,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Release asset upload failed (${response.status} ${response.statusText}): ${errorBody}`);
  }

  return response.json();
}

async function updateReleaseBody(owner, repo, releaseId, nextBody) {
  return githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/releases/${releaseId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: nextBody,
      }),
    },
  );
}

async function main() {
  const eventPath = requiredEnv('GITHUB_EVENT_PATH');
  const repository = requiredEnv('GITHUB_REPOSITORY');
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`);
  }

  const event = readJson(eventPath);
  const release = ensureReleaseEvent(event);
  const { latestRun, latestRunPath, sessionPath, session } = getLatestRun();
  const uploads = buildUploadList(sessionPath, session);

  const dryRun = process.env.DRY_RUN === '1';
  const uploadedAssets = [];

  if (dryRun) {
    for (const upload of uploads) {
      uploadedAssets.push({
        assetName: upload.assetName,
        screenId: upload.screenId,
        state: upload.state,
        downloadUrl: `https://example.invalid/${upload.assetName}`,
      });
    }
  } else {
    const existingAssets = await listReleaseAssets(owner, repo, release.id);
    const existingByName = new Map(existingAssets.map((asset) => [asset.name, asset]));

    for (const upload of uploads) {
      const existingAsset = existingByName.get(upload.assetName);
      if (existingAsset) {
        await deleteReleaseAsset(owner, repo, existingAsset.id);
      }

      const uploaded = await uploadReleaseAsset(release, upload.filePath, upload.assetName);
      uploadedAssets.push({
        assetName: upload.assetName,
        screenId: upload.screenId,
        state: upload.state,
        downloadUrl: uploaded.browser_download_url,
      });
    }
  }

  const uiSection = buildReleaseUiSection({
    release,
    latestRun,
    session,
    uploadedAssets,
  });

  const nextBody = replaceReleaseUiSection(release.body ?? '', uiSection);

  if (dryRun) {
    const previewPath = path.resolve(path.dirname(latestRunPath), 'release-ui-preview.md');
    writeFileSync(previewPath, nextBody, 'utf8');
    console.log(`Dry run release notes preview written to ${previewPath}`);
    return;
  }

  await updateReleaseBody(owner, repo, release.id, nextBody);
  console.log(`Release ${release.tag_name} updated with ${uploadedAssets.length - 1} UI screenshots.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
