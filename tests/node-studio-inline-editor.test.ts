import test from 'node:test';
import assert from 'node:assert/strict';
import {newNodeDraft,nodeStudioDraft} from '../app/lib/node-studio-model';
import {appendAtlasEntry,editStudioBlock} from '../app/lib/node-studio-editor';

test('Atlas visual editor changes a single paragraph without mutating or copying other entries',()=>{
 const base=newNodeDraft('edit-node','astronomia');
 const firstId=crypto.randomUUID(),secondId=crypto.randomUUID();
 const added=appendAtlasEntry(base,firstId);
 const two=appendAtlasEntry(added,secondId);
 assert.equal(base.blocks.length,0);
 assert.equal(two.blocks.length,2);
 const updated=editStudioBlock(two,firstId,{title:'Galileo e il telescopio'});
 const written=editStudioBlock(updated,firstId,{body:'Una voce originale corredata da fonti e revisioni.'});
 assert.equal(written.blocks[0].title,'Galileo e il telescopio');
 assert.equal(written.blocks[0].body,'Una voce originale corredata da fonti e revisioni.');
 assert.equal(written.blocks[1].title,'Nuova voce dell’Atlante');
 assert.equal(two.blocks[0].title,'Nuova voce dell’Atlante');
 assert.equal(nodeStudioDraft(written).blocks.length,2);
 assert.throws(()=>editStudioBlock(base,firstId,{body:'malformed'}),/Unknown editorial block/);
 assert.throws(()=>appendAtlasEntry(added,firstId),/Duplicate editorial block/);
});
test('Atlas editor respects 80-block draft budget',()=>{
 let draft=newNodeDraft('edit-node','astronomia');
 for(let i=0;i<80;i++)draft=appendAtlasEntry(draft,crypto.randomUUID());
 assert.equal(draft.blocks.length,80);
 assert.throws(()=>appendAtlasEntry(draft,crypto.randomUUID()),/block limit/);
});
