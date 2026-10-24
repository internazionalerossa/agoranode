/** Safe portable blueprints. A draft is not a community, authorization, or published wiki revision. */
export const NODE_BLUEPRINT_FORMAT='org.agoranode.node-blueprint-draft.v1' as const;
export const NODE_BLOCK_KINDS=['heading','paragraph','timeline','source','book','video','data','atlas','bibliography'] as const;
export type NodeBlockKind=typeof NODE_BLOCK_KINDS[number];
export type NodeStudioBlock={id:string;kind:NodeBlockKind;title:string;body:string;url:string};
export type NodeStudioSource={id:string;name:string;homepage:string;feedUrl:string};
export type NodeBlueprintDraft={
  format:typeof NODE_BLUEPRINT_FORMAT;
  draftId:string;
  operation:'create-node'|'edit-node';
  spaceId:string;
  name:string;
  topic:string;
  description:string;
  accent:string;
  sources:NodeStudioSource[];
  blocks:NodeStudioBlock[];
  updatedAt:number;
};
const SPACE=/^[a-z][a-z0-9-]{2,47}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX=/^#[0-9a-f]{6}$/i;
const OBJ=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const TEXT=(value:unknown,min:number,max:number)=>typeof value==='string'&&value.trim().length>=min&&value.length<=max&&
 !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
const URL_OK=(value:unknown):boolean=>{
  if(value==='')return true;
  if(typeof value!=='string'||value.length>1200)return false;
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hostname.endsWith('.local');}
  catch{return false;}
};
export function nodeStudioDraft(data:unknown):NodeBlueprintDraft{
  if(!OBJ(data)||Object.keys(data).sort().join(',')!==
     ['format','draftId','operation','spaceId','name','topic','description','accent','sources','blocks','updatedAt'].sort().join(',')||
     data.format!==NODE_BLUEPRINT_FORMAT||typeof data.draftId!=='string'||!UUID.test(data.draftId)||
     (data.operation!=='create-node'&&data.operation!=='edit-node')||
     typeof data.spaceId!=='string'||!SPACE.test(data.spaceId)||
     (data.operation==='create-node'&&['agora','polisrossa'].includes(data.spaceId))||
     !TEXT(data.name,3,90)||!TEXT(data.topic,5,180)||
     !TEXT(data.description,10,1500)||typeof data.accent!=='string'||!HEX.test(data.accent)||
     !Number.isSafeInteger(data.updatedAt)||Number(data.updatedAt)<0||
     !Array.isArray(data.sources)||data.sources.length>30||
     !Array.isArray(data.blocks)||data.blocks.length>80)throw Error('Invalid node blueprint');
  const sourceIds=new Set<string>(),blockIds=new Set<string>();
  for(const source of data.sources){
    if(!OBJ(source)||Object.keys(source).sort().join(',')!=='feedUrl,homepage,id,name'||
      !TEXT(source.id,1,64)||! /^[a-z0-9-]+$/.test(String(source.id))||
      sourceIds.has(String(source.id))||!TEXT(source.name,2,140)||
      !URL_OK(source.homepage)||!URL_OK(source.feedUrl))throw Error('Invalid node source');
    sourceIds.add(String(source.id));
  }
  for(const block of data.blocks){
    if(!OBJ(block)||Object.keys(block).sort().join(',')!=='body,id,kind,title,url'||
      typeof block.id!=='string'||!UUID.test(block.id)||
      blockIds.has(block.id)||!NODE_BLOCK_KINDS.includes(block.kind as NodeBlockKind)||
      !TEXT(block.title,0,160)||!TEXT(block.body,0,4000)||!URL_OK(block.url)){
      throw Error('Invalid node content block');
    }
    if(String(block.title).trim()===''&&String(block.body).trim()==='')throw Error('Empty node block');
    blockIds.add(block.id);
  }
  if(JSON.stringify(data).length>62_000)throw Error('Node draft exceeds storage budget');
  return data as NodeBlueprintDraft;
}
export function newNodeDraft(operation:'create-node'|'edit-node'='create-node',spaceId='nuovo-nodo'):NodeBlueprintDraft{
  return {format:NODE_BLUEPRINT_FORMAT,draftId:crypto.randomUUID(),operation,spaceId,
    name:operation==='edit-node'?'PolisRossa':'Nuovo nodo',topic:'Argomento da approfondire',
    description:'Una comunità per conoscere, verificare e discutere insieme.',
    accent:'#235f86',sources:[],blocks:[],updatedAt:Date.now()};
}
export function blueprintToProposal(draft:NodeBlueprintDraft):{title:string;body:string;references:string}{
 const validated=nodeStudioDraft(draft);
 const description=[
   validated.operation==='create-node'?'Proposta di nuovo nodo tematico':'Proposta di modifica di un nodo',
   'Nodo: '+validated.name+' ('+validated.spaceId+')',
   'Tema: '+validated.topic,
   'Descrizione: '+validated.description,
   'Blocchi proposti: '+validated.blocks.map(block=>block.kind+': '+block.title+' — '+block.body).join('; ').slice(0,1900),
   'Fonti suggerite: '+validated.sources.map(x=>x.name+' '+x.homepage).join('; ').slice(0,900),
   'Questa è una bozza: serve verifica dei diritti, discussione e una decisione PR2 autorizzata.',
 ].join('\n\n');
 return {title:('Proposta Agorà: '+validated.name).slice(0,140),
   body:description.slice(0,3900),references:validated.sources.find(s=>s.homepage)?.homepage??''};
}
