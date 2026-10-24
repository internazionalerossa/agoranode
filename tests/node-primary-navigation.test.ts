import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import NodeStudio from '../app/components/NodeStudio';
import {NODE_PRIMARY_TABS,thematicNodeTabHref} from '../app/lib/node-primary-navigation';

test('the navigation blueprint retains PolisRossa module ordering with node-specific URLs',()=>{
 assert.deepEqual(NODE_PRIMARY_TABS.map(x=>x.label),['La rassegna','Biblioteca','Agorà']);
 assert.deepEqual(NODE_PRIMARY_TABS.map(x=>thematicNodeTabHref('polisrossa',x.id)),
  ['/polisrossa','/polisrossa?view=teoria','/polisrossa?view=partecipa']);
 assert.deepEqual(NODE_PRIMARY_TABS.map(x=>thematicNodeTabHref('agora',x.id)),
  ['/agora','/agora?view=biblioteca','/agora?view=partecipa']);
});
test('Node Studio clearly offers the PolisRossa blueprint without copying political content',()=>{
 const html=renderToStaticMarkup(createElement(NodeStudio,{spaceId:'agora'}));
 assert.match(html,/Nuovo nodo · blueprint PolisRossa/);
 assert.match(html,/Nuovo nodo · pagina vuota/);
 assert.match(html,/polisrossa\.tail37128d\.ts\.net/);
 assert.doesNotMatch(html,/Importa i contenuti di PolisRossa/);
});
