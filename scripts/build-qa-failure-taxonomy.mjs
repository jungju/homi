import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';

import { existsRelative, readJson, writeStructured } from './_machine-utils.mjs';

const CATEGORY_KEYS = ['logic', 'timing', 'browser', 'infra', 'semantic-ai'];

function classifyMessage(message, source) {
  const text = String(message || '').toLowerCase();
  if (source === 'ai') {
    return 'semantic-ai';
  }
  if (
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('waitfor') ||
    text.includes('tohave') ||
    text.includes('retry')
  ) {
    return 'timing';
  }
  if (
    text.includes('target closed') ||
    text.includes('browser') ||
    text.includes('execution context was destroyed') ||
    text.includes('page crashed')
  ) {
    return 'browser';
  }
  if (
    text.includes('missing') ||
    text.includes('enoent') ||
    text.includes('econnrefused') ||
    text.includes('spawn') ||
    text.includes('install') ||
    text.includes('api key') ||
    text.includes('network')
  ) {
    return 'infra';
  }
  return 'logic';
}

function createBaseCounts() {
  return Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 0]));
}

function recordIssue(issues, counts, issue) {
  issues.push(issue);
  counts[issue.category] += 1;
}

function collectVitestIssues() {
  const issues = [];
  if (!existsRelative('test-results/vitest/results.json')) {
    recordIssue(issues, createBaseCounts(), {
      category: 'infra',
      source: 'vitest',
      title: 'Vitest report missing',
      detail: 'test-results/vitest/results.json',
    });
    return issues;
  }

  const report = readJson('test-results/vitest/results.json');
  const collected = [];
  for (const suite of report.testResults ?? []) {
    for (const assertion of suite.assertionResults ?? []) {
      if (assertion.status === 'passed') {
        continue;
      }
      const message = Array.isArray(assertion.failureMessages) ? assertion.failureMessages.join('\n') : '';
      collected.push({
        category: classifyMessage(message, 'vitest'),
        source: 'vitest',
        title: assertion.fullName ?? assertion.title ?? suite.name,
        detail: message || suite.message || 'vitest failure without message',
      });
    }
  }
  return collected;
}

function walkPlaywrightSuites(suites, out = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      out.push(spec);
    }
    walkPlaywrightSuites(suite.suites ?? [], out);
  }
  return out;
}

function collectPlaywrightIssues() {
  const issues = [];
  if (!existsRelative('playwright-results/report.json')) {
    issues.push({
      category: 'infra',
      source: 'playwright',
      title: 'Playwright report missing',
      detail: 'playwright-results/report.json',
    });
    return issues;
  }

  const report = readJson('playwright-results/report.json');
  for (const error of report.errors ?? []) {
    issues.push({
      category: classifyMessage(error?.message ?? error, 'playwright'),
      source: 'playwright',
      title: 'Playwright global error',
      detail: String(error?.message ?? error),
    });
  }

  const specs = walkPlaywrightSuites(report.suites ?? []);
  for (const spec of specs) {
    for (const test of spec.tests ?? []) {
      const failingResults = (test.results ?? []).filter((result) => result.status !== 'passed');
      for (const result of failingResults) {
        const detail = (result.errors ?? []).map((item) => item.message ?? item.value ?? '').join('\n');
        issues.push({
          category: classifyMessage(detail, 'playwright'),
          source: 'playwright',
          title: spec.title,
          detail: detail || `status=${result.status}`,
        });
      }
    }
  }
  return issues;
}

function collectAiIssues() {
  const issues = [];
  if (!existsRelative('test-results/ai-reviews/summary.json')) {
    issues.push({
      category: 'infra',
      source: 'ai',
      title: 'AI review summary missing',
      detail: 'test-results/ai-reviews/summary.json',
    });
    return issues;
  }

  const summary = readJson('test-results/ai-reviews/summary.json');
  if ((summary.fail ?? 0) === 0 && (summary.warn ?? 0) === 0) {
    return issues;
  }

  const summaryLabel = `pass=${summary.pass ?? 0} warn=${summary.warn ?? 0} fail=${summary.fail ?? 0}`;
  const rawFailures = existsRelative('test-results/ai-reviews/raw-failures.json')
    ? readJson('test-results/ai-reviews/raw-failures.json')
    : [];

  if (Array.isArray(rawFailures) && rawFailures.length > 0) {
    for (const failure of rawFailures) {
      issues.push({
        category: 'semantic-ai',
        source: 'ai',
        title: failure.screenId ?? 'AI review failure',
        detail: failure.summary ?? summaryLabel,
      });
    }
    return issues;
  }

  issues.push({
    category: 'semantic-ai',
    source: 'ai',
    title: 'AI review warnings present',
    detail: summaryLabel,
  });
  return issues;
}

function buildMarkdown(summary) {
  const lines = [
    '# QA Failure Taxonomy',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `- logic: ${summary.counts.logic}`,
    `- timing: ${summary.counts.timing}`,
    `- browser: ${summary.counts.browser}`,
    `- infra: ${summary.counts.infra}`,
    `- semantic-ai: ${summary.counts['semantic-ai']}`,
    '',
  ];

  if (summary.issues.length === 0) {
    lines.push('All tracked layers passed without classified failures.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('## Issues');
  lines.push('');
  for (const issue of summary.issues) {
    lines.push(`- [${issue.category}] ${issue.source}: ${issue.title}`);
    lines.push(`  ${issue.detail}`);
  }
  return `${lines.join('\n')}\n`;
}

async function run() {
  const counts = createBaseCounts();
  const issues = [];

  for (const issue of [
    ...collectVitestIssues(),
    ...collectPlaywrightIssues(),
    ...collectAiIssues(),
  ]) {
    recordIssue(issues, counts, issue);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    counts,
    issues,
    sources: {
      deterministicUnit: 'test-results/vitest/results.json',
      deterministicE2E: 'playwright-results/report.json',
      aiSemantic: 'test-results/ai-reviews/summary.json',
    },
  };

  await mkdir('test-results', { recursive: true });
  await writeStructured('test-results/qa-failure-taxonomy.json', summary);
  await writeFile('test-results/qa-failure-taxonomy.md', buildMarkdown(summary), 'utf8');
  console.log(
    `[build-qa-failure-taxonomy] logic=${counts.logic} timing=${counts.timing} browser=${counts.browser} infra=${counts.infra} semantic-ai=${counts['semantic-ai']}`,
  );
}

run().catch((error) => {
  console.error(`[build-qa-failure-taxonomy] ${error.message}`);
  process.exit(1);
});
