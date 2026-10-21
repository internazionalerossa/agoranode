import test from 'node:test';
import assert from 'node:assert/strict';
import {THEORY_LIBRARY} from '../app/data/library.ts';
import {libraryReadingDestination} from '../app/lib/library-reading.ts';

test('only the exact rights-approved edition enters the internal reader',()=>{
 const commons=THEORY_LIBRARY.find(book=>book.id==='commons-viventi');
 assert.ok(commons);
 const english=libraryReadingDestination(commons,'en');
 assert.equal(english.internal,true);
 assert.equal(english.href,'/polisrossa/read?book=commons-viventi&edition=en');

 const spanish=libraryReadingDestination(commons,'es');
 assert.equal(spanish.internal,false);
 assert.equal(spanish.href,'https://freefairandalive.org/es/leelo/');
});

test('catalogued editions without a registered redistribution right stay on their original archive',()=>{
 const bread=THEORY_LIBRARY.find(book=>book.id==='conquista-pane');
 assert.ok(bread);
 const italian=libraryReadingDestination(bread,'it');
 assert.equal(italian.internal,false);
 assert.equal(italian.href,'https://www.edizionianarchismo.net/library/petr-kropotkin-la-conquista-del-pane');
});
