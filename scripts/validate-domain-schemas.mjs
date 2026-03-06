import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import process from 'node:process';

import { existsRelative, readJson, readStructured } from './_machine-utils.mjs';

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  return ajv;
}

function addSchema(ajv, schemaPath) {
  const schema = readJson(schemaPath);
  const key = schema.$id || schemaPath;
  if (!ajv.getSchema(key)) {
    ajv.addSchema(schema, key);
  }
  return schema;
}

function validateData(ajv, schemaPath, data, label) {
  const schema = readJson(schemaPath);
  const key = schema.$id || schemaPath;
  let validate = ajv.getSchema(key);
  if (!validate) validate = ajv.compile(schema);

  const ok = validate(data);
  if (ok) return;
  const details = (validate.errors ?? [])
    .map((item) => `${item.instancePath || '/'} ${item.message ?? ''}`.trim())
    .join('; ');
  throw new Error(`Validation failed (${label} -> ${schemaPath}): ${details}`);
}

function validateJsonFile(ajv, schemaPath, filePath) {
  const data = readJson(filePath);
  validateData(ajv, schemaPath, data, filePath);
}

async function run() {
  const ajv = buildAjv();

  const domainSchemas = [
    'schemas/domain/homi-bundle.v1.schema.json',
    'schemas/domain/dataset-payload.v1.schema.json',
    'schemas/domain/dataset.v1.schema.json',
    'schemas/domain/store.v1.schema.json',
    'schemas/domain/engines/dictation.item.v1.schema.json',
    'schemas/domain/engines/schedule.item.v1.schema.json',
  ];

  for (const schemaPath of domainSchemas) {
    if (!existsRelative(schemaPath)) {
      throw new Error(`Missing domain schema: ${schemaPath}`);
    }
    addSchema(ajv, schemaPath);
  }

  const fixtureContract = readStructured('docs/machine/fixtures.v1.yaml');
  const fixtures = fixtureContract.fixtures ?? [];

  let validated = 0;
  for (const fixture of fixtures) {
    if (!existsRelative(fixture.path)) {
      throw new Error(`Fixture file missing: ${fixture.path}`);
    }
    if (!existsRelative(fixture.schemaRef)) {
      throw new Error(`Fixture schema missing: ${fixture.schemaRef}`);
    }
    validateJsonFile(ajv, fixture.schemaRef, fixture.path);
    validated += 1;
  }

  validateJsonFile(ajv, 'schemas/domain/homi-bundle.v1.schema.json', 'tests/fixtures/bundle.min.v1.json');
  validateJsonFile(ajv, 'schemas/domain/homi-bundle.v1.schema.json', 'tests/fixtures/bundle.xss.v1.json');
  validateJsonFile(ajv, 'schemas/domain/homi-bundle.v1.schema.json', 'public/samples/homi.sample.homi.json');

  const emptyStore = {
    storeVersion: 1,
    updatedAt: new Date().toISOString(),
    datasetsByEngine: {},
    ui: {},
  };
  validateData(ajv, 'schemas/domain/store.v1.schema.json', emptyStore, 'generated-empty-store');

  console.log(`[validate-domain-schemas] validatedSchemas=${domainSchemas.length} validatedFixtures=${validated}`);
}

run().catch((error) => {
  console.error(`[validate-domain-schemas] ${error.message}`);
  process.exit(1);
});
