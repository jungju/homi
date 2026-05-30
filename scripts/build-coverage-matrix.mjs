import { readFileSync } from 'node:fs';
import process from 'node:process';

import { existsRelative, expandGlob, readJson, readStructured, writeStructured } from './_machine-utils.mjs';

function readText(relativePath) {
  return readFileSync(relativePath, 'utf8');
}

function findAiScreenId(aiReviewDoc, scenarioId) {
  for (const screen of aiReviewDoc.screens ?? []) {
    if ((screen.contractRefs ?? []).includes(scenarioId)) {
      return screen.id;
    }
  }
  return null;
}

async function hasArtifactCoverageEvidence(aiReviewDoc, screenId) {
  const screen = (aiReviewDoc.screens ?? []).find((item) => item.id === screenId);
  if (!screen) {
    return false;
  }

  const artifactDir = aiReviewDoc.artifactContract?.artifactDir ?? 'test-results/ai-artifacts';
  for (const pattern of screen.requiredArtifacts ?? []) {
    const matches = await expandGlob(`${artifactDir}/${pattern}`);
    if (matches.length === 0) {
      return false;
    }
  }
  return true;
}

async function getAiScenarioCoverage(scenario, aiReviewDoc) {
  const screenId = findAiScreenId(aiReviewDoc, scenario.id);
  if (!screenId) {
    return {
      coverageStatus: 'gap',
      evidence: [`ai-review screen mapping missing for ${scenario.id}`],
    };
  }

  const reviewPath = `test-results/ai-reviews/${screenId}.ai-review.json`;
  const artifactCoverageAllowed = aiReviewDoc.gatePolicy?.artifactEvidenceCountsAsPartialCoverage === true;
  const hasArtifactEvidence = artifactCoverageAllowed
    ? await hasArtifactCoverageEvidence(aiReviewDoc, screenId)
    : false;

  if (!existsRelative(reviewPath)) {
    if (hasArtifactEvidence) {
      return {
        coverageStatus: 'partial',
        evidence: [`artifact evidence found for ${screenId}`, `ai review result missing: ${reviewPath}`],
      };
    }
    return {
      coverageStatus: 'gap',
      evidence: [`ai review result missing: ${reviewPath}`],
    };
  }

  const review = readJson(reviewPath);
  const blockingCodes = new Set([
    'AI_REVIEW_SKIPPED',
    'ARTIFACT_SET_MISSING',
    'SCREENSHOT_MISSING',
    'AI_REVIEW_ERROR',
    'AI_REVIEW_SCHEMA_INVALID',
  ]);
  const issueCodes = Array.isArray(review?.issues)
    ? review.issues
        .map((issue) => issue?.code)
        .filter((value) => typeof value === 'string')
    : [];

  if (issueCodes.some((code) => blockingCodes.has(code))) {
    if (hasArtifactEvidence) {
      return {
        coverageStatus: 'partial',
        evidence: [
          `artifact evidence found for ${screenId}`,
          `ai review fallback/issues=${issueCodes.join(',') || 'none'}`,
        ],
      };
    }
    return {
      coverageStatus: 'gap',
      evidence: [
        `ai review could not execute for ${screenId}`,
        `issues=${issueCodes.join(',') || 'none'}`,
      ],
    };
  }

  return {
    coverageStatus: 'partial',
    evidence: [
      `ai review result found: ${reviewPath}`,
      `verdict=${typeof review?.verdict === 'string' ? review.verdict : 'unknown'}`,
    ],
  };
}

async function getScenarioCoverage(scenario, aiReviewDoc) {
  if (scenario.type === 'manual') {
    return {
      coverageStatus: 'partial',
      evidence: ['manual scenario registered in tests.v1.yaml'],
    };
  }

  if (scenario.type === 'ai') {
    return getAiScenarioCoverage(scenario, aiReviewDoc);
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

function loadGoTestStatus() {
  return 'run go test ./... separately';
}

function loadAiSummaryStatus() {
  const reportPath = 'test-results/ai-reviews/summary.json';
  if (!existsRelative(reportPath)) {
    return 'missing';
  }
  try {
    const data = readJson(reportPath);
    if (typeof data.fail === 'number' && typeof data.total === 'number') {
      return data.fail > 0 ? `warn_or_fail(total=${data.total},fail=${data.fail})` : `pass(total=${data.total})`;
    }
    return 'unknown';
  } catch {
    return 'invalid';
  }
}

async function run() {
  const testsContract = readStructured('docs/machine/tests.v1.yaml');
  const aiReviewDoc = readStructured('docs/machine/ai-review.v1.yaml');
  const scenarios = testsContract.scenarios ?? [];

  const rows = [];
  for (const scenario of scenarios) {
    const result = await getScenarioCoverage(scenario, aiReviewDoc);
    const implementationFramework = scenario.type === 'ai'
      ? 'ai_review'
      : scenario.type === 'manual'
        ? 'manual'
        : scenario.implementation?.framework ?? 'manual';
    rows.push({
      scenarioId: scenario.id,
      priority: scenario.priority,
      type: scenario.type,
      implementationFramework,
      gateLayer: scenario.gate?.layer ?? (scenario.type === 'ai' ? 'ai_semantic' : 'deterministic_e2e'),
      coverageStatus: result.coverageStatus,
      evidence: result.evidence,
    });
  }

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
      testCode: [
        ...new Set(
          scenarios
            .map((scenario) => scenario.implementation?.file)
            .filter((value) => typeof value === 'string'),
        ),
      ],
      testResults: {
        deterministicE2E: 'not_applicable_for_go_server',
        deterministicUnit: `go test ./...#status=${loadGoTestStatus()}`,
        aiSemantic: `test-results/ai-reviews/summary.json#status=${loadAiSummaryStatus()}`,
      },
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
