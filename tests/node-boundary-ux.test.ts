import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import NodeStudio from '../app/components/NodeStudio';
import AgoraNodeHome from '../app/components/AgoraNodeHome';
import {AggregatorApp} from '../app/components/AggregatorApp';

test('new-node creation only appears inside Agora',()=>{
 const thematic=renderToStaticMarkup(createElement(NodeStudio,{spaceId:'astronomia'}));
 assert.doesNotMatch(thematic,/Crea nuovo nodo · formato comune|Nuovo nodo · pagina vuota/);
 assert.match(thematic,/creazione di altri nodi è riservata ad Agorà/);
 const agora=renderToStaticMarkup(createElement(NodeStudio,{spaceId:'agora'}));
 assert.match(agora,/Crea nuovo nodo · formato comune/);
});
test('Agora has a neutral node-directory link instead of a featured PolisRossa link',()=>{
 const html=renderToStaticMarkup(createElement(AgoraNodeHome));
 assert.match(html,/Elenco dei nodi/);
 assert.doesNotMatch(html,/class="agoranode-instance-link" href="\/polisrossa"/);
});
