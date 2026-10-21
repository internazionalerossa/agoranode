import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bookReaderPositionFits,
  bookReaderPositionFromUrl,
  bookReaderSelectionFromUrl,
  bookReaderUrl,
  copyBookReaderUrl,
  publicBookReaderFallback,
  shareBookReaderUrl,
} from '../app/lib/book-reader-navigation.ts';

const position={bookId:'manifesto',edition:'it',chapter:2,page:7};

test('book reader positions round-trip through one-based public coordinates',()=>{
 const url=bookReaderUrl(position);
 assert.equal(url,'/read?book=manifesto&edition=it&chapter=3&page=8');
 assert.deepEqual(bookReaderPositionFromUrl(url),position);
 assert.deepEqual(bookReaderSelectionFromUrl(url,'fr'),{bookId:'manifesto',edition:'it'});
 assert.deepEqual(bookReaderSelectionFromUrl('/read','it'),{bookId:'manifesto',edition:'it'});
});

test('invalid or partial reader parameters never become a shared position',()=>{
 for(const url of [
  '/read?book=missing&edition=it&chapter=1&page=1',
  '/read?book=manifesto&edition=missing&chapter=1&page=1',
  '/read?book=manifesto&edition=it&chapter=0&page=1',
  '/read?book=manifesto&edition=it&chapter=1&page=-1',
  '/read?book=manifesto&edition=it&chapter=1.5&page=2',
  '/read?book=manifesto&edition=it&chapter=1',
  '/read?book=manifesto&edition=it&chapter=1&page=1&page=2',
  '/read?book=manifesto&book=manifesto&edition=it&chapter=1&page=1',
  '/read?book=manifesto&edition=it&chapter=257&page=1',
  '/read?book=manifesto&edition=it&chapter=1&page=100002',
 ])assert.equal(bookReaderPositionFromUrl(url),null,url);
 assert.equal(bookReaderSelectionFromUrl('/read?book=manifesto&edition=missing','it'),null);
 assert.equal(bookReaderSelectionFromUrl('/read?book=manifesto&book=manifesto&edition=it','it'),null);
 assert.throws(()=>bookReaderUrl({...position,page:-1}),RangeError);
});

test('a shared position must fit the chapter response before it overrides a bookmark',()=>{
 const document={language:'it',chapter:2,chapters:[0,1,2,3],pages:[0,1,2,3,4,5,6,7]};
 assert.equal(bookReaderPositionFits(position,document),true);
 assert.equal(bookReaderPositionFits({...position,page:8},document),false);
 assert.equal(bookReaderPositionFits({...position,chapter:3},document),false);
 assert.equal(bookReaderPositionFits({...position,edition:'en'},document),false);
});

test('an invalid public permalink falls back to the first chapter and page',()=>{
 assert.deepEqual(publicBookReaderFallback('invalid'),{chapter:0,page:0});
 for(const result of ['loaded','failed','cancelled'])assert.equal(publicBookReaderFallback(result),null);
});

test('reader sharing uses Web Share, clipboard fallback and a manual-link result',async()=>{
 const payload={title:'Manifesto · PolisRossa',text:'Capitolo 3 · pagina 8',url:'https://example.test'+bookReaderUrl(position)};
 let shared=null,copied='';
 assert.equal(await shareBookReaderUrl({share:async value=>{shared=value;}},payload),'shared');
 assert.deepEqual(shared,payload);
 assert.equal(await shareBookReaderUrl({share:async()=>{throw new Error('unsupported');},clipboard:{writeText:async value=>{copied=value;}}},payload),'copied');
 assert.equal(copied,payload.url);
 assert.equal(await copyBookReaderUrl({clipboard:{writeText:async value=>{copied=value;}}},payload.url),'copied');
 assert.equal(await copyBookReaderUrl({},payload.url),'unavailable');
 assert.equal(await shareBookReaderUrl({},payload),'unavailable');
 const cancelled=new Error('cancelled');cancelled.name='AbortError';
 assert.equal(await shareBookReaderUrl({share:async()=>{throw cancelled;},clipboard:{writeText:async()=>assert.fail('cancel must not copy')}},payload),'cancelled');
});
