import test from 'node:test';
import assert from 'node:assert/strict';
import {LIBRARY_SECTIONS,librarySectionFromUrl,librarySectionUrl} from '../app/lib/library-navigation.ts';
test('each library destination has a real URL that survives reopening and selects a distinct section',()=>{
 const urls=LIBRARY_SECTIONS.map(({id})=>librarySectionUrl('https://site.example/?ref=reading',id));
 assert.equal(new Set(urls).size,3);
 for(let index=0;index<urls.length;index++){assert.equal(librarySectionFromUrl('https://site.example'+urls[index]),LIBRARY_SECTIONS[index].id);assert.match(urls[index],/ref=reading/);}
});
test('old dossier and statistics links open the corresponding destination directly',()=>{
 assert.equal(librarySectionFromUrl('/?view=teoria&percorso=conquiste'),'timeline');
 assert.equal(librarySectionFromUrl('/?view=teoria&percorso=conquiste&indicatore=SP.DYN.LE00.IN#world-history-title'),'dati');
 assert.equal(librarySectionFromUrl('/?view=teoria&percorso=conquiste&storia=diritti-sotto-attacco#dossier-diritti-sotto-attacco'),'timeline');
 assert.equal(librarySectionFromUrl('/?view=teoria&percorso=unknown'),'libri');
});
test('changing a library destination clears parameters owned by the previous destination',()=>{
 const raw='https://site.example/?view=teoria&percorso=conquiste&indicatore=SP.DYN.LE00.IN&storia=cuba&periodo=6h&ref=shared#dossier-cuba';
 const data=librarySectionUrl(raw,'dati');assert.equal(data,'/?view=teoria&percorso=dati&ref=shared');
 assert.equal(librarySectionFromUrl(data),'dati');
 assert.equal(librarySectionFromUrl(librarySectionUrl(data,'timeline')),'timeline');
 assert.equal(librarySectionUrl(data,'libri'),'/?view=teoria&ref=shared');
});
