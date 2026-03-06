import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import process from 'node:process';

import { existsRelative, expandGlob, readJson, readStructured } from './_machine-utils.mjs';

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  return ajv;
}

function addSchema(ajv, relativePath) {
  const schema = readJson(relativePath);
  const key = schema.$id || relativePath;
  if (!ajv.getSchema(key)) {
    ajv.addSchema(schema, key);
  }
  return schema;
}

function validateOrThrow(ajv, schemaPath, data, label) {
  const schema = readJson(schemaPath);
  const key = schema.$id || schemaPath;
  let validate = ajv.getSchema(key);
  if (!validate) {
    validate = ajv.compile(schema);
  }

  const ok = validate(data);
  if (ok) return;

  const details = (validate.errors ?? [])
    .map((item) => `${item.instancePath || '/'} ${item.message ?? ''}`.trim())
    .join('; ');
  throw new Error(`Schema validation failed (${label} -> ${schemaPath}): ${details}`);
}

function extractRuleIds(productDoc, uiDoc, flowsDoc, aiDoc, testsDoc) {
  const ids = new Set();

  for (const rule of productDoc.rules ?? []) ids.add(rule.id);
  for (const rule of uiDoc.rules ?? []) ids.add(rule.id);

  for (const transition of flowsDoc.transitions ?? []) ids.add(transition.id);
  for (const invariant of flowsDoc.invariants ?? []) ids.add(invariant.id);
  for (const rule of flowsDoc.modeTransitionRules ?? []) ids.add(rule.id);

  ids.add(aiDoc.gatePolicy?.id);
  for (const rule of aiDoc.forbiddenHallucinationRules ?? []) ids.add(rule.id);
  for (const screen of aiDoc.screens ?? []) {
    for (const check of screen.rubricChecks ?? []) ids.add(check.id);
  }

  for (const scenario of testsDoc.scenarios ?? []) ids.add(scenario.id);

  ids.delete(undefined);
  ids.delete(null);
  return ids;
}

async function run() {
  const ajv = buildAjv();

  const manifestSchema = addSchema(ajv, 'schemas/machine/manifest.v1.schema.json');
  void manifestSchema;

  const manifest = readStructured('docs/machine/manifest.v1.yaml');
  validateOrThrow(ajv, 'schemas/machine/manifest.v1.schema.json', manifest, 'manifest');

  const machineSchemas = manifest.schemaRegistry?.machine ?? [];
  for (const schemaPath of machineSchemas) {
    if (!existsRelative(schemaPath)) {
      throw new Error(`Missing machine schema: ${schemaPath}`);
    }
    addSchema(ajv, schemaPath);
  }

  const requiredAuthoritativeDocs = new Set([
    'docs/machine/manifest.v1.yaml',
    'docs/machine/truth-order.v1.yaml',
    'docs/machine/read-sets.v1.yaml',
    'docs/machine/change-policy.v1.yaml',
    'docs/machine/product.v1.yaml',
    'docs/machine/ui.v1.yaml',
    'docs/machine/flows.v1.yaml',
    'docs/machine/tests.v1.yaml',
    'docs/machine/fixtures.v1.yaml',
    'docs/machine/ai-review.v1.yaml',
    'docs/machine/work-items.v1.yaml',
  ]);

  const artifacts = manifest.artifactRegistry ?? [];
  const authoritativePaths = new Set(
    artifacts.filter((item) => item.authoritative === true).map((item) => item.path),
  );

  for (const path of requiredAuthoritativeDocs) {
    if (!authoritativePaths.has(path)) {
      throw new Error(`Manifest missing authoritative artifact: ${path}`);
    }
  }

  const generatedAuthoritative = artifacts.filter(
    (item) => item.generated === true && item.authoritative === true,
  );
  if (generatedAuthoritative.length > 0) {
    throw new Error(
      `Generated artifacts cannot be authoritative: ${generatedAuthoritative
        .map((item) => item.path)
        .join(', ')}`,
    );
  }

  for (const artifact of artifacts) {
    if (!existsRelative(artifact.path)) {
      throw new Error(`Artifact file not found: ${artifact.path}`);
    }
    const doc = readStructured(artifact.path);
    validateOrThrow(ajv, artifact.schemaRef, doc, artifact.path);
  }

  const truthOrder = readStructured(manifest.truthOrderPath);
  if (truthOrder.orderedSources?.[0]?.path !== 'docs/machine/manifest.v1.yaml') {
    throw new Error('truth-order first rank must be docs/machine/manifest.v1.yaml');
  }

  const generatedExclusions = truthOrder.generatedExclusionRules
    .flatMap((item) => item.paths)
    .filter(Boolean);
  for (const generatedPath of ['docs/machine/coverage.v1.yaml', 'docs/machine/dependency-graph.v1.yaml']) {
    if (!generatedExclusions.includes(generatedPath)) {
      throw new Error(`truth-order generated exclusion missing: ${generatedPath}`);
    }
  }

  const product = readStructured('docs/machine/product.v1.yaml');
  const ui = readStructured('docs/machine/ui.v1.yaml');
  const flows = readStructured('docs/machine/flows.v1.yaml');
  const tests = readStructured('docs/machine/tests.v1.yaml');
  const aiReview = readStructured('docs/machine/ai-review.v1.yaml');
  const fixtures = readStructured('docs/machine/fixtures.v1.yaml');
  const readSets = readStructured('docs/machine/read-sets.v1.yaml');

  const knownIds = extractRuleIds(product, ui, flows, aiReview, tests);

  const missingRefs = [];

  for (const transition of flows.transitions ?? []) {
    for (const ref of transition.contractRefs ?? []) {
      if (!knownIds.has(ref)) {
        missingRefs.push(`flows.transitions ${transition.id} -> ${ref}`);
      }
    }
  }

  for (const invariant of flows.invariants ?? []) {
    for (const ref of invariant.contractRefs ?? []) {
      if (!knownIds.has(ref)) {
        missingRefs.push(`flows.invariants ${invariant.id} -> ${ref}`);
      }
    }
  }

  for (const scenario of tests.scenarios ?? []) {
    for (const ref of scenario.contractRefs ?? []) {
      if (!knownIds.has(ref)) {
        missingRefs.push(`tests.scenarios ${scenario.id} -> ${ref}`);
      }
    }
  }

  for (const screen of aiReview.screens ?? []) {
    for (const ref of screen.contractRefs ?? []) {
      if (!knownIds.has(ref)) {
        missingRefs.push(`ai.screens ${screen.id} -> ${ref}`);
      }
    }
    for (const check of screen.rubricChecks ?? []) {
      for (const ref of check.contractRefs ?? []) {
        if (!knownIds.has(ref)) {
          missingRefs.push(`ai.rubricChecks ${check.id} -> ${ref}`);
        }
      }
    }
  }

  for (const fixture of fixtures.fixtures ?? []) {
    for (const testId of fixture.usedByTests ?? []) {
      if (!knownIds.has(testId)) {
        missingRefs.push(`fixtures ${fixture.id} usedByTests -> ${testId}`);
      }
    }
  }

  if (missingRefs.length > 0) {
    throw new Error(`Dangling contractRefs:\n- ${missingRefs.join('\n- ')}`);
  }

  for (const taskSet of readSets.taskSets ?? []) {
    const forbidden = new Set(taskSet.forbiddenAsAuthority ?? []);
    if (!forbidden.has('docs/legacy/*')) {
      throw new Error(`read-sets taskType=${taskSet.taskType} must forbid docs/legacy/* as authority`);
    }
  }

  const legacyAuthorityRefs = [];
  const searchTargets = [
    'docs/machine/product.v1.yaml',
    'docs/machine/ui.v1.yaml',
    'docs/machine/flows.v1.yaml',
    'docs/machine/tests.v1.yaml',
    'docs/machine/fixtures.v1.yaml',
    'docs/machine/ai-review.v1.yaml',
    'docs/machine/work-items.v1.yaml',
  ];

  for (const filePath of searchTargets) {
    const doc = readStructured(filePath);
    const strings = new Set();
    for (const value of JSON.stringify(doc).match(/docs\/legacy\/[A-Za-z0-9._/-]+/g) ?? []) {
      strings.add(value);
    }
    if (strings.size > 0) {
      legacyAuthorityRefs.push(`${filePath}: ${[...strings].join(', ')}`);
    }
  }

  if (legacyAuthorityRefs.length > 0) {
    throw new Error(`Machine docs must not depend on legacy docs:\n- ${legacyAuthorityRefs.join('\n- ')}`);
  }

  const allMachineDocs = await expandGlob('docs/machine/*.yaml');
  console.log(`[validate-machine-docs] validated docs=${allMachineDocs.length} schemas=${machineSchemas.length}`);
}

run().catch((error) => {
  console.error(`[validate-machine-docs] ${error.message}`);
  process.exit(1);
});
