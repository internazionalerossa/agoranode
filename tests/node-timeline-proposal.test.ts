import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {timelineProposalLink,timelineProposalFromUrl} from '../app/lib/timeline-proposal';
import TimelineProposalTool from '../app/components/TimelineProposalTool';

test('selecting one or more narrative timeline passages creates only an editable PR2 forum proposal draft',()=>{
  const url=timelineProposalLink({
    title:'Proposta di revisione timeline',
    body:'Seleziona due passaggi per correggerne la collocazione storica e le fonti originali.',
    references:'https://example.org/study',
  });
  const intent=timelineProposalFromUrl(url);
  assert.ok(intent);
  assert.match(url,/view=partecipa/);
  assert.match(url,/nuova=proposta/);
  assert.equal(intent?.title,'Proposta di revisione timeline');
  assert.equal(intent?.references,'https://example.org/study');
  assert.equal(timelineProposalFromUrl('https://example.test/agora?'+new URLSearchParams({view:'partecipa',nuova:'proposta',timelineDraft:'v1'})),null);
  assert.equal(timelineProposalFromUrl('/polisrossa?view=partecipa&nuova=proposta&timelineDraft=v1&title=untrusted'),null);
  assert.throws(()=>timelineProposalLink({title:'x',body:'short',references:''}),/Invalid/);
  assert.throws(()=>timelineProposalLink({
    title:'Valid draft',body:'Sufficient context for a human reviewed proposal',references:'',
  },'agora'),/not deployed/);
});
test('timeline proposal interface includes multi-event curation, new page drafts and explicit human approval boundary',()=>{
  const html=renderToStaticMarkup(createElement(TimelineProposalTool,{
    events:[{id:'test',title:'Un cambiamento storico',year:'1871',country:'Francia',text:'Fonti archivistiche'}],
    selectedIds:['test'],onSelectionChange:()=>{},
  }));
  assert.match(html,/Proponi una modifica al racconto/);
  assert.match(html,/1 tappe selezionate/);
  assert.match(html,/Proponi una nuova pagina/);
  assert.match(html,/Escludere una tappa dalla timeline/);
  assert.match(html,/Continu(a|are) nel forum|Completa i campi per continuare/);
  assert.match(html,/serve l.ammissione PR2/);
});
