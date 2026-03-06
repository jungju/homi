import process from 'node:process';

import { existsRelative, readStructured } from './_machine-utils.mjs';

const STATUS_ORDER = {
  in_progress: 0,
  blocked: 1,
  todo: 2,
  done: 3,
};

function pickNextItem(items) {
  return [...items]
    .filter((item) => item.status !== 'done')
    .sort((a, b) => {
      const rankA = STATUS_ORDER[a.status] ?? 99;
      const rankB = STATUS_ORDER[b.status] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return a.id.localeCompare(b.id);
    })[0];
}

function loadCoverageHint() {
  if (!existsRelative('docs/machine/coverage.v1.yaml')) {
    return null;
  }
  try {
    const coverage = readStructured('docs/machine/coverage.v1.yaml');
    return coverage.summary ?? null;
  } catch {
    return null;
  }
}

async function run() {
  const workItemsDoc = readStructured('docs/machine/work-items.v1.yaml');
  const items = workItemsDoc.workItems ?? [];

  const next = pickNextItem(items);
  const coverageHint = loadCoverageHint();

  const payload = {
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    remaining: items.filter((item) => item.status !== 'done').length,
    nextItem: next
      ? {
          id: next.id,
          status: next.status,
          description: next.description,
          requiredTests: next.requiredTests,
        }
      : null,
    coverageHint,
  };

  console.log(JSON.stringify(payload, null, 2));
}

run().catch((error) => {
  console.error(`[next-step] ${error.message}`);
  process.exit(1);
});
