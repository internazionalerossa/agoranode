import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SharedSpaceModules from '../app/components/SharedSpaceModules';
import AgoraNodeHome from '../app/components/AgoraNodeHome';
import {AGORA_MANIFEST} from '../app/instances/agora';
import {POLISROSSA_MANIFEST} from '../app/instances/polisrossa';
import {AGORA_NODE_CAPABILITIES} from '../app/platform/agora-node-manifest';

test('the same typed module UI renders every capability for both autonomous thematic nodes', () => {
  const agora=renderToStaticMarkup(createElement(SharedSpaceModules,{manifest:AGORA_MANIFEST}));
  const polis=renderToStaticMarkup(createElement(SharedSpaceModules,{manifest:POLISROSSA_MANIFEST}));
  for(const [id,html] of [['agora',agora],['polisrossa',polis]] as const) {
    assert.match(html,new RegExp('space-modules-'+id));
    for(const capability of AGORA_NODE_CAPABILITIES) assert.match(html,new RegExp('data-space-module="'+capability+'"'));
  }
  assert.match(agora,/In costruzione/);
  assert.doesNotMatch(agora,/<a href="\/agora">Apri sezione/);
  assert.match(polis,/href="\/polisrossa/);
  assert.doesNotMatch(agora,/Storia, attualità, cultura e dati delle sinistre/);
  assert.notEqual(agora,polis);
  const home=renderToStaticMarkup(createElement(AgoraNodeHome));
  assert.match(home,/data-space-module="news"/);
  assert.match(home,/data-space-module="community"/);
});
