import test from 'node:test';
import assert from 'node:assert/strict';
import {filterArticles} from '../app/lib/reading.ts';
import {SOURCE_CATALOG} from '../app/data/catalog.ts';
import {isNewsArticle} from '../app/lib/news-eligibility.ts';
import {validateVideos} from '../app/lib/videos.ts';
const source=SOURCE_CATALOG.find(item=>item.id==='humanite');
const now=Date.parse('2026-10-20T12:00:00Z');
const article={id:'radar-result',sourceId:'radar:discovered',feedSourceId:'radar-it-core',sourceName:'L’Humanité',sourceHomepage:source.homepage,region:'Italia',country:'Italia',language:'it',kind:'radar',ideologies:[],title:'Une grève pour les salaires',link:'https://news.google.com/rss/articles/example',publishedAt:'2026-10-20T11:00:00Z',author:null,excerpt:'Les travailleurs se mobilisent',categories:[],topics:['lavoro'],image:null,score:1};
const filters={query:'',region:'all',country:'all',language:'all',kind:'all',ideology:'all',topic:'all',source:'all',days:1,sort:'fresh'};
test('combined geography, language and source filters use the publisher rather than the search edition',()=>{
 assert.equal(filterArticles([article],{...filters,region:'Europa',country:'Francia',language:'fr',source:source.id},now).length,1);
 for(const change of [{region:'Italia'},{country:'Italia'},{language:'it'},{source:'morning-star'}])assert.equal(filterArticles([article],{...filters,...change},now).length,0);
});
test('a stale item cannot inherit a topic merely from its publisher or stored topic tags',()=>{
 const unrelated={...article,title:'Les résultats du championnat',excerpt:'Le classement des équipes',categories:[],topics:['lavoro','teoria']};
 assert.equal(filterArticles([unrelated],{...filters,topic:'lavoro'},now).length,0);
 assert.equal(filterArticles([article],{...filters,topic:'lavoro'},now).length,1);
});
test('Fatto politics is scoped to the verified section feed and cannot admit the entire domain through radar',()=>{
 const home='https://www.ilfattoquotidiano.it/';
 assert.equal(isNewsArticle({...article,sourceHomepage:home}),false);
 assert.equal(isNewsArticle({...article,sourceId:'ilfatto-politica',feedSourceId:'ilfatto-politica',kind:'giornale',sourceHomepage:home}),true);
});
test('the official Fatto video channel admits political titles and rejects entertainment, including stale cached entries',()=>{
 const item={id:'abcdefghijk',channel:'ilfatto-politica',title:'Sciopero e salari: il confronto con il governo',url:'https://www.youtube.com/watch?v=abcdefghijk',image:null,publishedAt:null};
 assert.equal(validateVideos([item]).length,1);
 for(const title of ['Sanremo, le reazioni di Meloni','Gossip e dichiarazioni sul governo','La finale del campionato'])assert.equal(validateVideos([{...item,title}]).length,0,title);
});

test('incidental letter sequences in technology words are not labour or war topics',()=>{
 const unrelated={...article,title:'Software per una rete network',excerpt:'Nuova versione del programma',categories:[],topics:['lavoro','imperialismo']};
 for(const topic of ['lavoro','imperialismo'])assert.equal(filterArticles([unrelated],{...filters,topic},now).length,0);
});
