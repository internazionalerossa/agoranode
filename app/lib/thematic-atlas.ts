/**
 * A small, theme-neutral encyclopedia / narrative timeline contract.
 *
 * The Atlante is a collection of publicly readable articles. A Percorso is
 * an editorial projection of a subset of those articles, with independent
 * narrative framing; non-selected articles remain searchable. This curated
 * genesis edition is a repository-reviewed seed, NOT a PR2 ballot certificate.
 */
export type AtlasKind = 'milestone'|'concept'|'guide'|'technical-document';
export type AtlasSource = {label:string;url:string;context:string};
export type AtlasSection = {heading:string;paragraphs:readonly string[]};
export type AtlasTimeline = {period:string;place:string;order:number;introduction:string};
export type AtlasEntry = {
  id:string;
  title:string;
  kind:AtlasKind;
  summary:string;
  tags:readonly string[];
  sections:readonly AtlasSection[];
  sources:readonly AtlasSource[];
  related:readonly string[];
  timeline:AtlasTimeline|null;
};
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ENTRIES=200;
const lower=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('it').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function sourceUrl(value:string):boolean{
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&
   !url.hash.includes('\n');}catch{return false;}
}
function text(value:unknown,min:number,max:number):value is string{
 return typeof value==='string'&&value.trim().length>=min&&value.length<=max&&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
}
export function validateAtlas(entries:readonly AtlasEntry[]):void{
 if(!Array.isArray(entries)||entries.length<1||entries.length>MAX_ENTRIES)
  throw Error('Atlas has an invalid size');
 const ids=new Set<string>(),orders=new Set<number>();
 for(const item of entries){
  if(!ID.test(item.id)||item.id.length>80||ids.has(item.id)||
    !['milestone','concept','guide','technical-document'].includes(item.kind)||
    !text(item.title,5,140)||!text(item.summary,40,1300)||
    !Array.isArray(item.sections)||item.sections.length<1||item.sections.length>16||
    !Array.isArray(item.sources)||item.sources.length<1||item.sources.length>12||
    !Array.isArray(item.related)||item.related.length>15||
    !Array.isArray(item.tags)||item.tags.length>15){
   throw Error('Invalid Atlas article');
  }
  for(const section of item.sections){
   if(!text(section.heading,3,120)||!Array.isArray(section.paragraphs)||
     section.paragraphs.length<1||section.paragraphs.length>10||
     section.paragraphs.some(p=>!text(p,40,3500)))throw Error('Invalid Atlas section');
  }
  for(const source of item.sources){
   if(!text(source.label,2,160)||!text(source.context,5,250)||!sourceUrl(source.url))
    throw Error('Invalid Atlas citation');
  }
  for(const id of item.related)if(!ID.test(id)||id.length>80||id===item.id)
   throw Error('Invalid Atlas related page');
  for(const tag of item.tags)if(!text(tag,2,60))throw Error('Invalid Atlas tag');
  if(item.timeline!==null){
   const t=item.timeline;
   if(!Number.isSafeInteger(t.order)||t.order<0||orders.has(t.order)||
     !text(t.period,4,80)||!text(t.place,2,100)||
     !text(t.introduction,120,2000))throw Error('Invalid Atlas timeline narration');
   orders.add(t.order);
  }
  ids.add(item.id);
 }
 for(const entry of entries)for(const id of entry.related)
  if(!ids.has(id))throw Error('Atlas relation has no target');
}
export function atlasArticleUrl(spaceId:string,id:string):string{
 if(!ID.test(spaceId)||spaceId.length>64||!ID.test(id)||id.length>80)
  throw Error('Invalid Atlas link identity');
 const base=spaceId==='agora'?'/agora':'/n/'+spaceId;
 return base+'?'+new URLSearchParams({voce:id});
}
export function atlasSelectionFromUrl(raw:string,spaceId:string):string|null{
 const url=new URL(raw,'https://example.invalid');
 const expected=spaceId==='agora'?'/agora':'/n/'+spaceId;
 const selected=url.searchParams.get('voce');
 if(url.pathname.replace(/\/+$/,'')!==expected||!selected||
   url.searchParams.getAll('voce').length!==1||!ID.test(selected)||selected.length>80)
   return null;
 return selected;
}
export function atlasTimeline(entries:readonly AtlasEntry[]):AtlasEntry[]{
 return entries.filter(entry=>entry.timeline!==null).sort(
  (a,b)=>a.timeline!.order-b.timeline!.order);
}
export function atlasSearch(entries:readonly AtlasEntry[],query:string,limit=25):AtlasEntry[]{
 if(query.length>200||!Number.isSafeInteger(limit)||limit<1||limit>100)
  throw Error('Invalid Atlas search');
 const terms=lower(query).split(' ').filter(Boolean);
 if(!terms.length)return [];
 const ranked=entries.map(entry=>{
  const title=lower(entry.title),tags=lower(entry.tags.join(' '));
  const body=lower(entry.summary+' '+entry.sections.map(s=>s.heading+' '+s.paragraphs.join(' ')).join(' '));
  let score=0;
  for(const term of terms){
   if(title.includes(term))score+=title===term?9:6;
   else if(tags.includes(term))score+=3;
   else if(body.includes(term))score+=1;
   else return null;
  }
  return {entry,score};
 }).filter((item):item is {entry:AtlasEntry;score:number}=>item!==null);
 return ranked.sort((a,b)=>b.score-a.score||a.entry.title.localeCompare(b.entry.title,'it'))
  .slice(0,limit).map(item=>item.entry);
}
export function atlasMarkdown(entry:AtlasEntry):string{
 const parts=['# '+entry.title,'',entry.summary,''];
 for(const section of entry.sections){
  parts.push('## '+section.heading,'',...section.paragraphs.flatMap(p=>[p,'']));
 }
 parts.push('## Fonti e attribuzioni','',...entry.sources.map(x=>'- '+x.label+' — '+x.url+' ('+x.context+')'),'');
 return parts.join('\n');
}
