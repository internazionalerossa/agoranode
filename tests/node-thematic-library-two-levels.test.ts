import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {
 THEMATIC_LIBRARY_DESTINATIONS,
 thematicLibraryHref,
 thematicLibraryLocationFromUrl,
} from '../app/lib/thematic-library-navigation';
import {
 librarySectionUrl,librarySectionFromUrl,libraryTimelineModeFromUrl,libraryTimelineUrl,
} from '../app/lib/library-navigation';
import {LibraryPrimaryTabs,LibraryTimelineTabs} from '../app/components/LibraryNavigationTabs';
import AgoraLibraryView from '../app/components/AgoraLibraryView';
import PolisrossaAtlasIndex from '../app/components/PolisrossaAtlasIndex';
import PublicSpaceLibrary from '../app/components/PublicSpaceLibrary';
import {newNodeDraft} from '../app/lib/node-studio-model';
import {createPublicSpaceSeed} from '../app/platform/public-space-seed';
import {AGORA_ATLANTE} from '../app/instances/agora-atlante';
import {atlasArticleUrl,atlasSearch,atlasTimeline,validateAtlas} from '../app/lib/thematic-atlas';

test('the first Biblioteca view contains exactly three primary choices',()=>{
 assert.deepEqual(THEMATIC_LIBRARY_DESTINATIONS.map(item=>item.label),[
  'Libri e percorsi','Timeline e Atlante','Dati e grafici',
 ]);
 const html=renderToStaticMarkup(createElement(LibraryPrimaryTabs,{
  destination:'libri',
  href:(section)=>thematicLibraryHref('agora',section),
 }));
 for(const label of ['Libri e percorsi','Timeline e Atlante','Dati e grafici'])assert.match(html,new RegExp(label));
 assert.match(html,/aria-current="page"/);
 assert.doesNotMatch(html,/Indice e ricerca/);
 const library=renderToStaticMarkup(createElement(AgoraLibraryView));
 assert.match(library,/La biblioteca/);
 assert.match(library,/Libri e percorsi/);
 assert.match(library,/Timeline e Atlante/);
 assert.match(library,/Dati e grafici/);
 assert.doesNotMatch(library,/Scegli come esplorare Timeline e Atlante/);
});

test('only after choosing Timeline e Atlante can visitors switch Timeline and Atlante index',()=>{
 const tabs=renderToStaticMarkup(createElement(LibraryTimelineTabs,{
  mode:'racconto',href:(mode)=>thematicLibraryHref('agora','timeline',mode),
 }));
 assert.match(tabs,/Timeline/);
 assert.match(tabs,/Atlante · Indice e ricerca/);
 assert.match(tabs,/view=biblioteca/);
 assert.match(tabs,/modalita=indice/);
 assert.equal(thematicLibraryLocationFromUrl('/agora?view=biblioteca','agora').destination,'libri');
 assert.deepEqual(thematicLibraryLocationFromUrl(
  '/agora?view=biblioteca&sezione=timeline','agora'),
  {destination:'timeline',display:'racconto',articleId:null});
 assert.deepEqual(thematicLibraryLocationFromUrl(
  '/agora?view=biblioteca&sezione=timeline&modalita=indice','agora'),
  {destination:'timeline',display:'indice',articleId:null});
 assert.deepEqual(thematicLibraryLocationFromUrl(
  '/agora?view=biblioteca&sezione=timeline&modalita=indice&voce=il-nodo-origine','agora'),
  {destination:'timeline',display:'indice',articleId:'il-nodo-origine'});
});

test('PolisRossa keeps its three primary sections, with the same secondary selection',()=>{
 const urls=['libri','timeline','dati'] as const;
 assert.equal(new Set(urls.map(id=>librarySectionUrl('/polisrossa?view=teoria',id))).size,3);
 assert.equal(librarySectionFromUrl('/polisrossa?view=teoria&percorso=timeline'),'timeline');
 const atlasUrl=libraryTimelineUrl('/polisrossa?view=teoria&percorso=timeline','indice');
 assert.match(atlasUrl,/percorso=timeline/);
 assert.match(atlasUrl,/modalita=indice/);
 assert.equal(libraryTimelineModeFromUrl(atlasUrl),'indice');
 assert.equal(libraryTimelineModeFromUrl('/polisrossa?view=teoria&percorso=timeline&evento=haymarket-1886'),'racconto');
 assert.equal(libraryTimelineModeFromUrl(libraryTimelineUrl(atlasUrl,'racconto')),'racconto');
 assert.equal(librarySectionUrl(atlasUrl,'libri'),'/polisrossa?view=teoria');
 const html=renderToStaticMarkup(createElement(PolisrossaAtlasIndex));
 assert.match(html,/INDICE E RICERCA/i);
 assert.match(html,/Cerca un tema/);
 assert.doesNotMatch(html,/Non ancora attivo/);
});

test('Agorà Atlante is independent from the timeline and all narrative entries remain linked',()=>{
 validateAtlas(AGORA_ATLANTE);
 const timeline=atlasTimeline(AGORA_ATLANTE);
 assert.ok(timeline.length>2);
 assert.ok(AGORA_ATLANTE.length>timeline.length);
 assert.ok(AGORA_ATLANTE.some(entry=>entry.timeline===null));
 assert.ok(timeline.every(entry=>(entry.timeline?.introduction.length??0)>=120));
 const url=atlasArticleUrl('agora','il-nodo-origine');
 assert.match(url,/view=biblioteca/);
 assert.match(url,/modalita=indice/);
 assert.match(url,/voce=il-nodo-origine/);
 assert.ok(atlasSearch(AGORA_ATLANTE,'privacy').some(entry=>entry.id==='custodia-e-privacy'));
 assert.throws(()=>atlasArticleUrl('agora','../invalid'));
 assert.throws(()=>thematicLibraryHref('agora','libri','indice','il-nodo-origine'));
});

test('new operator-installed nodes reuse the same first-level Library choices',()=>{
 const draft=newNodeDraft('create-node','storia-locale');
 draft.name='Storia della città';
 draft.topic='Storia locale e archivi della città';
 draft.description='Una biblioteca locale con voci pubbliche e fonti dichiarate.';
 draft.blocks=[{id:crypto.randomUUID(),kind:'timeline',title:'Un evento storico della città',
  body:'Un racconto introduttivo da approfondire con fonti documentarie.',url:'https://example.org/source'}];
 const seed=createPublicSpaceSeed(draft);
 const html=renderToStaticMarkup(createElement(PublicSpaceLibrary,{seed}));
 assert.match(html,/Libri e percorsi/);
 assert.match(html,/Timeline e Atlante/);
 assert.match(html,/Dati e grafici/);
 assert.doesNotMatch(html,/Scegli come esplorare Timeline e Atlante/);
 assert.equal(thematicLibraryLocationFromUrl('/n/storia-locale?view=biblioteca&sezione=timeline&modalita=indice','storia-locale').display,'indice');
 assert.equal(thematicLibraryHref('storia-locale','timeline','indice',draft.blocks[0].id).startsWith('/n/storia-locale?view=biblioteca'),true);
});
