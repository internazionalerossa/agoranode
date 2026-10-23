import test from 'node:test';
import assert from 'node:assert/strict';
import {feedModeStorageKey,normaliseFeedMode,feedPreferenceStorageKey} from '../app/lib/node-feed-preferences';

test('feed view preference is scoped to the node and rejects invalid modes',()=>{
  assert.equal(feedModeStorageKey('agora'),'agoranode.feed-mode.v1:agora');
  assert.notEqual(feedModeStorageKey('agora'),feedModeStorageKey('polisrossa'));
  assert.notEqual(feedModeStorageKey('agora'),feedPreferenceStorageKey('agora'));
  assert.equal(normaliseFeedMode('favourites'),'favourites');
  for(const value of ['all','invalid',null,{},true])assert.equal(normaliseFeedMode(value),'all');
  assert.throws(()=>feedModeStorageKey('../agora'),/Invalid node identity/);
});
