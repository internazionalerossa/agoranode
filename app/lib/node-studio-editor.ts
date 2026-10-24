import type {NodeBlueprintDraft,NodeStudioBlock} from './node-studio-model';

export function editStudioBlock(draft:NodeBlueprintDraft,id:string,patch:Pick<NodeStudioBlock,'title'>|Pick<NodeStudioBlock,'body'>):NodeBlueprintDraft{
 if(!draft.blocks.some(block=>block.id===id))throw Error('Unknown editorial block');
 return {...draft,blocks:draft.blocks.map(block=>block.id===id?{...block,...patch}:block),updatedAt:Date.now()};
}
export function appendAtlasEntry(draft:NodeBlueprintDraft,id:string):NodeBlueprintDraft{
 if(draft.blocks.length>=80)throw Error('Editorial draft block limit reached');
 if(draft.blocks.some(block=>block.id===id))throw Error('Duplicate editorial block');
 return {...draft,blocks:[...draft.blocks,{id,kind:'atlas',title:'Nuova voce dell’Atlante',body:'',url:''}],updatedAt:Date.now()};
}
