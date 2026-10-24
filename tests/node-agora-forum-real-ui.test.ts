import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import AgoraForum from '../app/components/AgoraForum';

test('Agorà never renders fake PR3 role selectors or sample discussion previews',()=>{
 const html=renderToStaticMarkup(createElement(AgoraForum));
 assert.match(html,/Forum del nodo Agorà/);
 assert.doesNotMatch(html,/Anteprima per livello di partecipazione/);
 assert.doesNotMatch(html,/Esplora le funzioni per ruolo/);
 assert.doesNotMatch(html,/Esempio dimostrativo/);
 assert.doesNotMatch(html,/scegli PR3|Mostra come PR3/);
});
