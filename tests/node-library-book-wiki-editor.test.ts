import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {THEORY_LIBRARY} from '../app/data/library';
import {bookDetailUrl,bookFromUrl} from '../app/lib/book-page';
import {LibraryBookDetail} from '../app/components/LibraryBookDetail';
import WikiProposalEditor from '../app/components/WikiProposalEditor';
import PublicSpaceHome from '../app/components/PublicSpaceHome';
import type {PublicKnowledgeHistory} from '../app/lib/public-knowledge';

test('every library work has a canonical dedicated URL and readers are never promised unknown files',()=>{
 const example=THEORY_LIBRARY.find(book=>book.id==='manifesto');
 assert.ok(example);
 const url=bookDetailUrl(example.id);
 assert.equal(bookFromUrl(url),example.id);
 const html=renderToStaticMarkup(createElement(LibraryBookDetail,{book:example}));
 assert.match(html,/Edizioni e disponibilità/);
 assert.match(html,/Fonte|Archivio|Edizione/i);
 assert.match(html,/La presenza in catalogo non implica/);
 assert.ok(url.includes('libro=manifesto'));
 for(const bad of ['../secret','https://evil.test','']) assert.throws(()=>bookDetailUrl(bad));
 assert.equal(bookFromUrl('/polisrossa?view=teoria&percorso=libri&libro=../admin'),null);
 assert.equal(bookFromUrl('/agora?view=teoria&percorso=libri&libro=manifesto'),null);
 assert.equal(bookFromUrl('/polisrossa?view=teoria&percorso=libri&libro=manifesto&libro=other'),null);
});
test('wiki editor is visibly separated from any direct publication action',()=>{
 const entity={identity:{spaceId:'polisrossa',kind:'event',id:'comune',locale:'it'},
   revisionSha256:'a'.repeat(64),content:{title:'La Comune di Parigi'}};
 const history={current:entity,revisions:[]} as unknown as PublicKnowledgeHistory;
 const html=renderToStaticMarkup(createElement(WikiProposalEditor,{history}));
 assert.match(html,/Migliora questa pagina/);
 assert.match(html,/Proponi una correzione/);
 assert.match(html,/decisione competente/);
 assert.doesNotMatch(html,/Pubblica subito/);
 const generic=renderToStaticMarkup(createElement(PublicSpaceHome,{spaceId:'storia-locale'}));
 assert.match(generic,/Caricamento del nodo/);
 assert.match(generic,/AgoràNode/);
});
