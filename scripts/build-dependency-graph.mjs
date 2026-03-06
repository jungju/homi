import process from 'node:process';

import {
  collectStringPaths,
  existsRelative,
  expandGlob,
  matchesGlob,
  readStructured,
  writeStructured,
} from './_machine-utils.mjs';

function addNode(nodeMap, id, path, kind, authoritative, generated) {
  if (!nodeMap.has(path)) {
    nodeMap.set(path, {
      id,
      path,
      kind,
      authoritative,
      generated,
    });
  }
}

function addEdge(edgeMap, from, to, reason) {
  const key = `${from} -> ${to} :: ${reason}`;
  if (!edgeMap.has(key)) {
    edgeMap.set(key, { from, to, reason });
  }
}

async function run() {
  const manifestPath = 'docs/machine/manifest.v1.yaml';
  const manifest = readStructured(manifestPath);

  const nodeMap = new Map();
  const edgeMap = new Map();

  for (const artifact of manifest.artifactRegistry ?? []) {
    addNode(
      nodeMap,
      artifact.id,
      artifact.path,
      artifact.kind,
      artifact.authoritative,
      artifact.generated,
    );
  }

  for (const schemaPath of manifest.schemaRegistry?.machine ?? []) {
    addNode(nodeMap, `schema.machine.${schemaPath}`, schemaPath, 'schema_machine', true, false);
  }
  for (const schemaPath of manifest.schemaRegistry?.domain ?? []) {
    addNode(nodeMap, `schema.domain.${schemaPath}`, schemaPath, 'schema_domain', true, false);
  }
  for (const schemaPath of manifest.schemaRegistry?.integration ?? []) {
    addNode(nodeMap, `schema.integration.${schemaPath}`, schemaPath, 'schema_integration', true, false);
  }

  addEdge(edgeMap, manifestPath, manifest.truthOrderPath, 'truth_order_path');

  for (const artifact of manifest.artifactRegistry ?? []) {
    addEdge(edgeMap, manifestPath, artifact.path, 'artifact_registry');
    addEdge(edgeMap, artifact.path, artifact.schemaRef, 'schema_ref');
  }

  for (const schemaPath of manifest.schemaRegistry?.machine ?? []) {
    addEdge(edgeMap, manifestPath, schemaPath, 'machine_schema_registry');
  }
  for (const schemaPath of manifest.schemaRegistry?.domain ?? []) {
    addEdge(edgeMap, manifestPath, schemaPath, 'domain_schema_registry');
  }
  for (const schemaPath of manifest.schemaRegistry?.integration ?? []) {
    addEdge(edgeMap, manifestPath, schemaPath, 'integration_schema_registry');
  }

  const nodePaths = [...nodeMap.keys()];

  for (const node of nodeMap.values()) {
    if (!existsRelative(node.path)) {
      continue;
    }

    if (!node.path.endsWith('.yaml') && !node.path.endsWith('.json')) {
      continue;
    }

    let doc;
    try {
      doc = readStructured(node.path);
    } catch {
      continue;
    }

    const refs = [...collectStringPaths(doc)];
    for (const ref of refs) {
      if (ref === node.path) continue;

      if (ref.includes('*')) {
        const expanded = await expandGlob(ref);
        if (expanded.length === 0) {
          addEdge(edgeMap, node.path, ref, 'path_glob');
          continue;
        }
        for (const resolved of expanded) {
          addNode(nodeMap, `resolved.${resolved}`, resolved, 'resolved_path', false, false);
          addEdge(edgeMap, node.path, resolved, 'path_glob_resolved');
        }
        continue;
      }

      const known = nodePaths.includes(ref);
      if (known || existsRelative(ref)) {
        addNode(nodeMap, `resolved.${ref}`, ref, 'resolved_path', false, false);
        addEdge(edgeMap, node.path, ref, 'path_ref');
      }
    }
  }

  const output = {
    id: 'homi.machine.dependency-graph.v1',
    version: 'v1',
    documentType: 'dependency-graph',
    schemaRef: 'schemas/machine/dependency-graph.v1.schema.json',
    authoritative: false,
    generated: true,
    generatedAt: new Date().toISOString(),
    generatedFrom: {
      manifest: manifestPath,
    },
    nodes: [...nodeMap.values()].sort((a, b) => a.path.localeCompare(b.path)),
    edges: [...edgeMap.values()].sort((a, b) => {
      const left = `${a.from}|${a.to}|${a.reason}`;
      const right = `${b.from}|${b.to}|${b.reason}`;
      return left.localeCompare(right);
    }),
  };

  await writeStructured('docs/machine/dependency-graph.v1.yaml', output);
  console.log(`[build-dependency-graph] nodes=${output.nodes.length} edges=${output.edges.length}`);
}

run().catch((error) => {
  console.error(`[build-dependency-graph] ${error.message}`);
  process.exit(1);
});
