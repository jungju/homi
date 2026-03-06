import { readFileSync } from 'node:fs';
import process from 'node:process';

import { existsRelative, readJson, readStructured, writeStructured } from './_machine-utils.mjs';

function readText(relativePath) {
  return readFileSync(relativePath, 'utf8');
}

function getScenarioCoverage(scenario) {
  if (scenario.type === 'manual') {
    return {
      coverageStatus: 'partial',
      evidence: ['manual scenario registered in tests.v1.yaml'],
    };
  }

  if (scenario.type === 'ai') {
    if (existsRelative('test-results/ai-reviews/summary.json')) {
      return {
        coverageStatus: 'partial',
        evidence: ['ai review summary exists'],
      };
    }
    return {
      coverageStatus: 'gap',
      evidence: ['ai review summary missing'],
    };
  }

  const implementation = scenario.implementation;
  if (!implementation) {
    return {
      coverageStatus: 'gap',
      evidence: ['implementation mapping missing'],
    };
  }

  if (!existsRelative(implementation.file)) {
    return {
      coverageStatus: 'gap',
      evidence: [`implementation file missing: ${implementation.file}`],
    };
  }

  const source = readText(implementation.file);
  if (source.includes(implementation.scenarioTag)) {
    return {
      coverageStatus: 'covered',
      evidence: [`scenarioTag found in ${implementation.file}`],
    };
  }

  if (source.includes(scenario.title)) {
    return {
      coverageStatus: 'partial',
      evidence: [`scenario title found in ${implementation.file}`],
    };
  }

  return {
    coverageStatus: 'gap',
    evidence: [`scenarioTag missing in ${implementation.file}`],
  };
}

function loadLastRunStatus() {
  if (!existsRelative('test-results/.last-run.json')) {
    return 'missing';
  }
  try {
    const data = readJson('test-results/.last-run.json');
    return typeof data.status === 'string' ? data.status : 'unknown';
  } catch {
    return 'invalid';
  }
}

async function run() {
  const testsContract = readStructured('docs/machine/tests.v1.yaml');
  const scenarios = testsContract.scenarios ?? [];

  const rows = scenarios.map((scenario) => {
    const result = getScenarioCoverage(scenario);
    return {
      scenarioId: scenario.id,
      priority: scenario.priority,
      type: scenario.type,
      coverageStatus: result.coverageStatus,
      evidence: result.evidence,
    };
  });

  const summary = {
    totalScenarios: rows.length,
    coveredScenarios: rows.filter((row) => row.coverageStatus === 'covered').length,
    partialScenarios: rows.filter((row) => row.coverageStatus === 'partial').length,
    gapScenarios: rows.filter((row) => row.coverageStatus === 'gap').length,
  };

  const output = {
    id: 'homi.machine.coverage.v1',
    version: 'v1',
    documentType: 'coverage',
    schemaRef: 'schemas/machine/coverage.v1.schema.json',
    authoritative: false,
    generated: true,
    generatedAt: new Date().toISOString(),
    generatedFrom: {
      testsContract: 'docs/machine/tests.v1.yaml',
      testCode: ['tests/e2e/qa-homi.spec.ts'],
      testResults: `test-results/.last-run.json#status=${loadLastRunStatus()}`,
    },
    summary,
    rows,
  };

  await writeStructured('docs/machine/coverage.v1.yaml', output);
  console.log(
    `[build-coverage-matrix] total=${summary.totalScenarios} covered=${summary.coveredScenarios} partial=${summary.partialScenarios} gap=${summary.gapScenarios}`,
  );
}

run().catch((error) => {
  console.error(`[build-coverage-matrix] ${error.message}`);
  process.exit(1);
});
