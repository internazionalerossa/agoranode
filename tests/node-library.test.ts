import test from 'node:test';
import assert from 'node:assert/strict';
import {THEORY_LIBRARY,bookEdition} from '../app/data/library';
test('the visible bibliography excludes legacy aliases while old reading links remain valid',()=>{
 const visible=THEORY_LIBRARY.filter(b=>b.editions?.length&&!b.aliasOf);
 const editions=visible.flatMap(b=>b.editions??[]);
 assert.equal(visible.length,176);assert.equal(editions.length,724);
 assert.equal(new Set(editions.map(e=>e.url)).size,editions.length);
 for(const book of THEORY_LIBRARY.filter(b=>b.aliasOf)){
  assert.ok(THEORY_LIBRARY.some(c=>c.id===book.aliasOf&&!c.aliasOf));
  for(const edition of book.editions??[])assert.equal(bookEdition(book.id,edition.language)?.url,bookEdition(book.aliasOf!,edition.language)?.url);
 }
 for(const edition of editions)assert.equal(edition.title.includes('\ufffd'),false);
});
