import test from 'node:test';
import assert from 'node:assert/strict';
import {AGORA_MANIFEST} from '../app/instances/agora';
import {POLISROSSA_MANIFEST} from '../app/instances/polisrossa';
import {LOCAL_SPACES, localSpaceManifest, publicLocalSpaces, validateLocalSpaces} from '../app/instances/registry';
import {isAgoraNodeManifest} from '../app/platform/agora-node-manifest';
import {DATA_CLASSES, DATA_PLACEMENT, isPublicPeerReplicable} from '../app/platform/data-placement';
import {instanceInfoResponse} from '../app/lib/instance-info';
import {api} from '../server/api';
import type {PostgresDatabase} from '../server/database';

test('Agorà is a separate, not-yet-operational thematic space', () => {
  assert.equal(isAgoraNodeManifest(AGORA_MANIFEST), true);
  assert.equal(AGORA_MANIFEST.instance.id, 'agora');
  assert.equal(AGORA_MANIFEST.governance.scope, 'instance');
  assert.equal(AGORA_MANIFEST.capabilities.news.status, 'implemented');
  assert.equal(AGORA_MANIFEST.capabilities.video.status, 'implemented');
  assert.equal(AGORA_MANIFEST.capabilities.wiki.status, 'planned');
  assert.equal(AGORA_MANIFEST.capabilities.community.status, 'planned');
  assert.equal(localSpaceManifest('agora'), AGORA_MANIFEST);
  assert.equal(localSpaceManifest('polisrossa'), POLISROSSA_MANIFEST);
  assert.equal(localSpaceManifest('__proto__'), null);
  assert.equal(validateLocalSpaces(), true);
  assert.deepEqual(LOCAL_SPACES.map(s => s.manifest.instance.id), ['agora', 'polisrossa']);
});

test('local directory publishes only allowlisted spaces and honest preview status', async () => {
  const spaces = publicLocalSpaces();
  assert.deepEqual(spaces.map(s => s.id), ['agora', 'polisrossa']);
  assert.equal(spaces[0].availability, 'preview');
  assert.equal(spaces[1].availability, 'local-runtime');
  const response = await api(new Request('https://example.test/api/nodes'), {} as PostgresDatabase, null, undefined, () => {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.nodes, spaces);
  assert.equal(body.federatedDiscovery, false);
});

test('manifest selection is explicit and does not change legacy PolisRossa response', async () => {
  const oldResponse = await instanceInfoResponse(new Request('https://example.test/api/instance')).json();
  assert.equal(oldResponse.instance.id, 'polisrossa');
  const response = instanceInfoResponse(new Request('https://example.test/api/instance?id=agora'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.instance.id, 'agora');
  assert.equal(body.capabilities.find((c: {id: string}) => c.id === 'news').status, 'implemented');
  assert.equal(body.capabilities.find((c: {id: string}) => c.id === 'wiki').status, 'planned');
  assert.equal(instanceInfoResponse(new Request('https://example.test/api/instance?id=nonexistent')).status, 404);
  assert.equal(instanceInfoResponse(new Request('https://example.test/api/instance?id=agora&id=polisrossa')).status, 400);
  assert.equal(instanceInfoResponse(new Request('https://example.test/api/instance?foo=1')).status, 400);
  assert.equal(instanceInfoResponse(new Request('https://example.test/api/instance?id=__proto__')).status, 404);
});

test('future replication policy is deny-by-default for all private and ephemeral classes', () => {
  assert.deepEqual(DATA_CLASSES, Object.keys(DATA_PLACEMENT));
  for (const dataClass of DATA_CLASSES) {
    assert.equal(DATA_PLACEMENT[dataClass].dataClass, dataClass);
    assert.equal(DATA_PLACEMENT[dataClass].publicPeerReplication, dataClass === 'public-verified');
    assert.equal(isPublicPeerReplicable(dataClass), dataClass === 'public-verified');
  }
  assert.equal(isPublicPeerReplicable('public-personal-data'), false);
  assert.equal(isPublicPeerReplicable(null), false);
});
