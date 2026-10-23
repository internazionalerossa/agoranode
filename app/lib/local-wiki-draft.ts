/** Private-to-device editorial draft, never a published knowledge revision. */
export const LOCAL_WIKI_DRAFT_FORMAT='org.agoranode.local-wiki-draft.v1' as const;
export type LocalWikiDraft={
 format:typeof LOCAL_WIKI_DRAFT_FORMAT;
 spaceId:string;kind:string;id:string;revisionSha256:string;
 reason:string;source:string;blocks:Array<{id:string;text:string}>;
};
const SPACE=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KIND=/^[a-z][a-z0-9-]{0,63}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const SHA=/^[a-f0-9]{64}$/;
function validSource(s:string){
 if(s==='')return true;
 try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}
 catch{return false;}
}
export function localWikiDraftKey(spaceId:string,kind:string,id:string):string{
 if(!SPACE.test(spaceId)||!KIND.test(kind)||!ID.test(id))throw Error('Invalid wiki draft identity');
 return 'agoranode.wiki-draft.v1:'+spaceId+':'+kind+':'+id;
}
export function validateLocalWikiDraft(value:unknown):LocalWikiDraft{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid wiki draft');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!==
   ['format','spaceId','kind','id','revisionSha256','reason','source','blocks'].sort().join(',')||
   v.format!==LOCAL_WIKI_DRAFT_FORMAT||
   typeof v.spaceId!=='string'||!SPACE.test(v.spaceId)||
   typeof v.kind!=='string'||!KIND.test(v.kind)||
   typeof v.id!=='string'||!ID.test(v.id)||
   typeof v.revisionSha256!=='string'||!SHA.test(v.revisionSha256)||
   typeof v.reason!=='string'||v.reason.length>1000||
   typeof v.source!=='string'||v.source.length>1000||!validSource(v.source)||
   !Array.isArray(v.blocks)||v.blocks.length<1||v.blocks.length>10)throw Error('Invalid wiki draft');
 const ids=new Set<string>();
 for(const block of v.blocks){
  if(!block||typeof block!=='object'||Array.isArray(block)||
     Object.keys(block).sort().join(',')!=='id,text'||
     typeof block.id!=='string'||! /^[A-Za-z0-9-]{1,80}$/.test(block.id)||
     ids.has(block.id)||typeof block.text!=='string'||block.text.length>700)
    throw Error('Invalid wiki draft block');
  ids.add(block.id);
 }
 if(JSON.stringify(value).length>11_000)throw Error('Wiki draft exceeds local storage budget');
 return value as LocalWikiDraft;
}
