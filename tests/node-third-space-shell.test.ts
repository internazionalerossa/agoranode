import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import PublicSpaceHome from '../app/components/PublicSpaceHome';
import {NODE_PRIMARY_TABS} from '../app/lib/node-primary-navigation';

test('the third thematic node has PolisRossa-primary-navigation links without PolisRossa identity',()=>{
 const html=renderToStaticMarkup(createElement(PublicSpaceHome,{spaceId:'astronomia'}));
 assert.match(html,/href="\/n\/astronomia"/);
 assert.match(html,/href="\/n\/astronomia\?view=biblioteca"/);
 assert.match(html,/href="\/n\/astronomia\?view=partecipa"/);
 assert.match(html,/La rassegna/);
 assert.match(html,/Biblioteca/);
 assert.match(html,/Agorà/);
 assert.doesNotMatch(html,/href="\/polisrossa"/);
 assert.deepEqual(NODE_PRIMARY_TABS.map(x=>x.label),['La rassegna','Biblioteca','Agorà']);
});
