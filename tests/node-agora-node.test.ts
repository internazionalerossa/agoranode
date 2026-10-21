import test from 'node:test';
import assert from 'node:assert/strict';
import {AGORA_NODE_CAPABILITIES, AGORA_NODE_SCHEMA_ID, isAgoraNodeManifest} from '../app/platform/agora-node-manifest';
import {POLISROSSA_COMPATIBILITY, POLISROSSA_MANIFEST} from '../app/instances/polisrossa';
import {INSTANCE_MANIFEST, INSTANCE_NAME, instanceUserAgent} from '../app/lib/instance';
import {brandName} from '../app/lib/brand';
import {instanceInfoResponse} from '../app/lib/instance-info';
import {api} from '../server/api';
import type {PostgresDatabase} from '../server/database';

test('the typed PolisRossa manifest satisfies the complete AgoràNode v1 boundary', () => {
  assert.equal(isAgoraNodeManifest(POLISROSSA_MANIFEST), true);
  assert.equal(POLISROSSA_MANIFEST.schema, AGORA_NODE_SCHEMA_ID);
  assert.equal(POLISROSSA_MANIFEST.platform.namespace, 'agoranode');
  assert.deepEqual(Object.keys(POLISROSSA_MANIFEST.capabilities), [...AGORA_NODE_CAPABILITIES]);
  for (const capability of Object.values(POLISROSSA_MANIFEST.capabilities)) {
    assert.ok(['implemented', 'planned'].includes(capability.status));
    assert.match(capability.route, /^\/(?!\/)/);
  }
  assert.deepEqual(POLISROSSA_MANIFEST.runtime.supportedInstanceIds, ['polisrossa']);
  assert.equal(POLISROSSA_MANIFEST.runtime.databaseIsolation, 'one-database-per-instance');
});

test('manifest validation rejects incomplete capabilities, external routes and an unsupported instance', () => {
  const missing = structuredClone(POLISROSSA_MANIFEST) as Record<string, any>;
  delete missing.capabilities.wiki;
  assert.equal(isAgoraNodeManifest(missing), false);
  const external = structuredClone(POLISROSSA_MANIFEST) as Record<string, any>;
  external.capabilities.news.route = 'https://example.test/';
  assert.equal(isAgoraNodeManifest(external), false);
  const unsupported = structuredClone(POLISROSSA_MANIFEST) as Record<string, any>;
  unsupported.runtime.supportedInstanceIds = ['another-node'];
  assert.equal(isAgoraNodeManifest(unsupported), false);
});

test('the instance facade retains PolisRossa brand and compatibility identities', () => {
  assert.equal(INSTANCE_MANIFEST, POLISROSSA_MANIFEST);
  assert.equal(INSTANCE_NAME, 'PolisRossa');
  assert.equal(brandName('it'), 'PolisRossa');
  assert.equal(brandName('en'), 'PolisRed');
  assert.equal(instanceUserAgent(), 'PolisRossa/1.0');
  assert.equal(instanceUserAgent('public video channels'), 'PolisRossa/1.0 (public video channels)');
  assert.deepEqual(POLISROSSA_COMPATIBILITY, {
    browserStoragePrefix: 'rassegna-rossa.',
    languagePreferencesKey: 'internazionalerossa.language-preferences',
    serviceWorkerCachePrefix: 'polisrossa-public-',
    personalDataFormat: 'polisrossa-personal-data-v1',
    publicSnapshotNetwork: 'polisrossa-public',
  });
});

test('the public instance endpoint is explicit, static and excludes compatibility namespaces', async () => {
  const request = new Request('https://example.test/api/instance');
  const direct = instanceInfoResponse(request);
  assert.equal(direct.status, 200);
  assert.equal(direct.headers.get('cache-control'), 'public, max-age=3600');
  const body = await direct.json();
  assert.equal(body.schema, 'org.agoranode.instance.v1');
  assert.deepEqual(body.runtime, {boundaryVersion: 1, supportedInstanceIds: ['polisrossa'], databaseIsolation: 'one-database-per-instance'});
  assert.equal(body.network.automaticReplication, false);
  assert.equal(body.network.automaticFailover, false);
  assert.equal(body.network.endToEndEncryption, false);
  assert.match(body.network.notice, /non sono attivati né collaudati/i);
  assert.equal(body.preservation.publicKnowledge, 'append-only-revisions');
  assert.equal(body.preservation.portableExport, true);
  assert.equal(body.preservation.personalData, 'erasable-by-data-subject');
  assert.match(body.preservation.notice, /nessun singolo host/i);
  assert.deepEqual(body.capabilities.map((entry: {id: string}) => entry.id), [...AGORA_NODE_CAPABILITIES]);
  const serialized = JSON.stringify(body);
  for (const privateValue of Object.values(POLISROSSA_COMPATIBILITY)) assert.doesNotMatch(serialized, new RegExp(privateValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const routed = await api(request, {} as PostgresDatabase, null, undefined, () => {});
  assert.equal(routed.status, 200);
  assert.equal((await routed.json()).instance.id, 'polisrossa');
  assert.equal(instanceInfoResponse(new Request('https://example.test/api/instance?unexpected=1')).status, 400);
  assert.equal(instanceInfoResponse(new Request('https://example.test/api/instance', {method: 'POST'})).status, 405);
});
