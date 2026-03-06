import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const DEFAULTS = {
  artifacts: 'test-results/ai-artifacts',
  config: 'docs/machine/ai-review.v1.yaml',
  schema: 'schemas/ai-ui-review-result.schema.json',
  out: 'test-results/ai-reviews',
  strict: false,
};

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    const [rawKey, inlineValue] = arg.replace(/^--/, '').split('=');
    const next = inlineValue ?? argv[i + 1];
    if (!next || next.startsWith('--')) continue;
    options[rawKey] = next;
    if (inlineValue === undefined) i += 1;
  }
  return options;
}

function readStructured(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON-compatible YAML in ${filePath}: ${error.message}`);
  }
}

function parseJsonOrNull(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function listMetaFiles(artifactDir) {
  const entries = await readdir(artifactDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.meta.json'))
    .sort();
}

async function readMetaRecords(artifactDir) {
  const files = await listMetaFiles(artifactDir);
  const items = [];

  for (const name of files) {
    const filePath = path.join(artifactDir, name);
    const raw = await readFile(filePath, 'utf8');
    const meta = parseJsonOrNull(raw);
    if (!meta || typeof meta !== 'object') {
      continue;
    }

    const stem = name.replace(/\.meta\.json$/, '');
    const screenId = typeof meta.screenId === 'string' ? meta.screenId : stem;
    const capturedAt = typeof meta.capturedAt === 'string' ? meta.capturedAt : '1970-01-01T00:00:00.000Z';

    items.push({
      screenId,
      capturedAt,
      stem,
      meta,
      files: {
        screenshot: path.join(artifactDir, `${stem}.png`),
        testIds: path.join(artifactDir, `${stem}.dom-testids.json`),
        visibleText: path.join(artifactDir, `${stem}.visible-text.txt`),
        ariaSnapshot: path.join(artifactDir, `${stem}.aria-snapshot.json`),
        meta: filePath,
      },
    });
  }

  return items;
}

function selectLatestByScreen(metaRecords, screenId) {
  return metaRecords
    .filter((record) => record.screenId === screenId)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
}

function buildPrompt(config, screenConfig, context) {
  const checks = (screenConfig.rubricChecks ?? [])
    .map((check) => `- [${check.level}/${check.severity}] ${check.id}: ${check.statement}`)
    .join('\n');

  return [
    '# Homi AI Review Contract Context',
    `gatePolicy: deterministicFirstGate=${config.gatePolicy.deterministicFirstGate}, aiCanOverrideDeterministic=${config.gatePolicy.aiCanOverrideDeterministic}`,
    `screenId: ${screenConfig.id}`,
    `route: ${screenConfig.route}`,
    `state: ${screenConfig.state}`,
    '',
    '## Rubric Checks',
    checks,
    '',
    '## Hard Fail Conditions',
    (screenConfig.hardFailConditions ?? []).map((code) => `- ${code}`).join('\n') || '- none',
    '',
    '## Soft Fail Conditions',
    (screenConfig.softFailConditions ?? []).map((code) => `- ${code}`).join('\n') || '- none',
    '',
    '## Deterministic Assertions (from captured meta)',
    (context.deterministicAssertions ?? []).map((item) => `- ${item}`).join('\n') || '- none',
    '',
    '## Visible Text',
    (context.visibleText || '').slice(0, 5000),
    '',
    '## DOM TestIds',
    context.testIds.join(', '),
    '',
    'Return JSON with keys: screenId, route, state, verdict, confidence, issues, summary.',
    'issues[] keys: code, severity, message, evidence, location, suggestedFix.',
    'verdict enum: pass|warn|fail; severity enum: low|medium|high.',
  ].join('\n');
}

async function callVision(apiKey, prompt, imagePath) {
  const imageData = await readFile(imagePath, 'base64');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a strict UI contract reviewer. Respond only with valid JSON. Do not invent data not present in artifacts.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageData}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${text}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const parsed = parseJsonOrNull(content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response is not JSON');
  }

  parsed.model = model;
  return parsed;
}

function normalizeIssues(rawIssues) {
  if (!Array.isArray(rawIssues)) return [];
  return rawIssues.map((issue) => ({
    code: typeof issue.code === 'string' ? issue.code : 'UNKNOWN',
    severity: ['low', 'medium', 'high'].includes(issue.severity) ? issue.severity : 'low',
    message: typeof issue.message === 'string' ? issue.message : 'message missing',
    evidence: typeof issue.evidence === 'string' ? issue.evidence : '',
    location: typeof issue.location === 'string' ? issue.location : '',
    suggestedFix: typeof issue.suggestedFix === 'string' ? issue.suggestedFix : '',
  }));
}

function fallbackResult(screen, artifacts, reasonCode, reasonMessage) {
  return {
    screenId: screen.id,
    route: screen.route,
    state: screen.state,
    verdict: 'warn',
    confidence: 0,
    issues: [
      {
        code: reasonCode,
        severity: 'low',
        message: reasonMessage,
        evidence: '',
        location: '',
        suggestedFix: '',
      },
    ],
    summary: reasonMessage,
    artifacts,
    createdAt: new Date().toISOString(),
    model: 'fallback',
  };
}

function applyDeterministicGuard(result, meta) {
  const deterministicFailures = Array.isArray(meta?.deterministicFailures)
    ? meta.deterministicFailures
    : [];

  if (deterministicFailures.length === 0) {
    return result;
  }

  const guarded = { ...result };
  guarded.verdict = 'fail';
  guarded.issues = [
    ...normalizeIssues(guarded.issues),
    {
      code: 'DETERMINISTIC_FAIL',
      severity: 'high',
      message: 'deterministic first gate failed; AI cannot override',
      evidence: deterministicFailures.join(' | '),
      location: '',
      suggestedFix: 'fix deterministic gate first',
    },
  ];
  guarded.summary = `Deterministic failures present (${deterministicFailures.length})`;
  return guarded;
}

function validateResultSchema(validator, result) {
  const ok = validator(result);
  if (ok) return true;
  const message = (validator.errors ?? [])
    .map((item) => `${item.instancePath || '/'} ${item.message ?? ''}`.trim())
    .join('; ');
  throw new Error(`Result schema validation failed: ${message}`);
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  if (!existsSync(options.artifacts)) {
    throw new Error(`Artifacts directory not found: ${options.artifacts}`);
  }
  if (!existsSync(options.config)) {
    throw new Error(`AI review config not found: ${options.config}`);
  }
  if (!existsSync(options.schema)) {
    throw new Error(`Result schema not found: ${options.schema}`);
  }

  const aiConfig = readStructured(options.config);
  const resultSchema = readStructured(options.schema);

  const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  const validateResult = ajv.compile(resultSchema);

  const apiKey = process.env.OPENAI_API_KEY || '';
  const metaRecords = await readMetaRecords(options.artifacts);

  await mkdir(options.out, { recursive: true });

  const results = [];

  for (const screen of aiConfig.screens ?? []) {
    const selected = selectLatestByScreen(metaRecords, screen.id);

    if (!selected) {
      const missingArtifacts = {
        artifactDir: options.artifacts,
        screenshot: '',
        testIds: '',
        visibleText: '',
        ariaSnapshot: '',
        meta: '',
      };
      const missing = fallbackResult(
        screen,
        missingArtifacts,
        'ARTIFACT_SET_MISSING',
        `No artifact set found for screenId=${screen.id}`,
      );
      validateResultSchema(validateResult, missing);
      results.push(missing);
      await writeFile(
        path.join(options.out, `${screen.id}.ai-review.json`),
        `${JSON.stringify(missing, null, 2)}\n`,
        'utf8',
      );
      continue;
    }

    const artifacts = {
      artifactDir: options.artifacts,
      screenshot: selected.files.screenshot,
      testIds: selected.files.testIds,
      visibleText: selected.files.visibleText,
      ariaSnapshot: selected.files.ariaSnapshot,
      meta: selected.files.meta,
    };

    const visibleText = existsSync(selected.files.visibleText)
      ? await readFile(selected.files.visibleText, 'utf8')
      : '';

    const testIdPayload = existsSync(selected.files.testIds)
      ? parseJsonOrNull(await readFile(selected.files.testIds, 'utf8'))
      : { items: [] };

    const testIds = Array.isArray(testIdPayload?.items)
      ? testIdPayload.items.map((item) => item.id).filter(Boolean)
      : [];

    const prompt = buildPrompt(aiConfig, screen, {
      deterministicAssertions: selected.meta?.deterministicAssertions ?? [],
      visibleText,
      testIds,
    });

    let review;
    if (!existsSync(selected.files.screenshot)) {
      review = fallbackResult(
        screen,
        artifacts,
        'SCREENSHOT_MISSING',
        `screenshot not found: ${selected.files.screenshot}`,
      );
    } else if (!apiKey) {
      review = fallbackResult(
        screen,
        artifacts,
        'AI_REVIEW_SKIPPED',
        'OPENAI_API_KEY is not set; AI review skipped.',
      );
    } else {
      try {
        const aiRaw = await callVision(apiKey, prompt, selected.files.screenshot);
        review = {
          screenId: screen.id,
          route: screen.route,
          state: screen.state,
          verdict: ['pass', 'warn', 'fail'].includes(aiRaw.verdict) ? aiRaw.verdict : 'warn',
          confidence: typeof aiRaw.confidence === 'number' ? Math.max(0, Math.min(1, aiRaw.confidence)) : 0,
          issues: normalizeIssues(aiRaw.issues),
          summary: typeof aiRaw.summary === 'string' ? aiRaw.summary : '',
          artifacts,
          createdAt: new Date().toISOString(),
          model: aiRaw.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        };
      } catch (error) {
        review = fallbackResult(
          screen,
          artifacts,
          'AI_REVIEW_ERROR',
          `AI request failed: ${error.message}`,
        );
      }
    }

    review = applyDeterministicGuard(review, selected.meta);

    try {
      validateResultSchema(validateResult, review);
    } catch (schemaError) {
      review = fallbackResult(screen, artifacts, 'AI_REVIEW_SCHEMA_INVALID', schemaError.message);
      validateResultSchema(validateResult, review);
    }

    results.push(review);
    await writeFile(
      path.join(options.out, `${screen.id}.ai-review.json`),
      `${JSON.stringify(review, null, 2)}\n`,
      'utf8',
    );

    const highCount = review.issues.filter((issue) => issue.severity === 'high').length;
    console.log(
      `[ai-ui-review] ${screen.id} verdict=${review.verdict} issues=${review.issues.length} high=${highCount}`,
    );
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    pass: results.filter((item) => item.verdict === 'pass').length,
    warn: results.filter((item) => item.verdict === 'warn').length,
    fail: results.filter((item) => item.verdict === 'fail').length,
    strictMode: !!options.strict,
    config: options.config,
    artifactsDir: options.artifacts,
  };

  await writeFile(path.join(options.out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(
    path.join(options.out, 'raw-failures.json'),
    `${JSON.stringify(results.filter((item) => item.verdict === 'fail'), null, 2)}\n`,
    'utf8',
  );

  console.log(
    `[ai-ui-review] summary total=${summary.total} pass=${summary.pass} warn=${summary.warn} fail=${summary.fail}`,
  );

  if (options.strict) {
    const hasHardFailure = results.some(
      (result) => result.verdict === 'fail' || result.issues.some((issue) => issue.severity === 'high'),
    );
    if (hasHardFailure) {
      process.exit(1);
    }
  }
}

run().catch((error) => {
  console.error(`[ai-ui-review] ${error.message}`);
  process.exit(1);
});
