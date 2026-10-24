import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ORIGINAL_POLISROSSA_URL,originalPolisRossaHref} from '../app/lib/polisrossa-original';
import PolisRossaOriginalLink from '../app/components/PolisRossaOriginalLink';

test('the static preview tells users the full PolisRossa news runtime is separate',()=>{
 const html=renderToStaticMarkup(createElement(PolisRossaOriginalLink));
 assert.match(html,/anteprima statica/);
 assert.match(html,/Rassegna stampa/);
 assert.ok(html.includes(ORIGINAL_POLISROSSA_URL));
 assert.doesNotMatch(html,/api\/articles/);
});
test('original PolisRossa links preserve historic query and distinct reader/account routes',()=>{
 assert.equal(originalPolisRossaHref('/polisrossa','?view=teoria'),ORIGINAL_POLISROSSA_URL+'?view=teoria');
 assert.equal(originalPolisRossaHref('/polisrossa/read','?book=abc'),ORIGINAL_POLISROSSA_URL+'read?book=abc');
 assert.equal(originalPolisRossaHref('/polisrossa/account'),ORIGINAL_POLISROSSA_URL+'account');
});
