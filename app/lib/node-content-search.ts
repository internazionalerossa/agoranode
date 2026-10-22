/** Topic-scoped public discovery primitives shared by every AgoraNode.
 * This lightweight view-index does not replace the signed knowledge store,
 * full-text DB indexes, moderation decisions or publication rights.
 */
export type NodeContentKind = 'wiki'|'timeline'|'book'|'dataset'|'forum';
export type NodeContentItem = {
  spaceId:string;
  kind:NodeContentKind;
  id:string;
  title:string;
  summary:string;
  href:string;
  tags:readonly string[];
  year?:number;
};
const SPACE=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const URL_PATH=/^\/(?!\/)[^\\\r\n]*$/;
const MAX_DOCUMENTS=50_000;

export function validateNodeContentItem(doc:NodeContentItem):void {
  if(!SPACE.test(doc.spaceId)||!ID.test(doc.id)||!URL_PATH.test(doc.href)||
     !['wiki','timeline','book','dataset','forum'].includes(doc.kind)||
     !doc.title.trim()||doc.title.length>240||doc.summary.length>2_000||
     !Array.isArray(doc.tags)||doc.tags.length>32||
     doc.tags.some(tag=>typeof tag!=='string'||tag.length>80)||
     (doc.year!==undefined&&(!Number.isSafeInteger(doc.year)||doc.year < -10000||doc.year>30000))){
    throw Error('Invalid scoped public document');
  }
}
export function normalizeNodeSearch(value:string):string{
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
export function searchNodeContent(
  documents:readonly NodeContentItem[],spaceId:string,query:string,
  options:{kind?:NodeContentKind;limit?:number}={},
):NodeContentItem[]{
  if(!SPACE.test(spaceId)||documents.length>MAX_DOCUMENTS||query.length>240)throw Error('Invalid discovery request');
  const limit=options.limit??30;
  if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid discovery limit');
  const terms=normalizeNodeSearch(query).split(' ').filter(Boolean);
  if(terms.length===0)return [];
  const matches:Array<{doc:NodeContentItem;score:number}>=[];
  for(const doc of documents){
    validateNodeContentItem(doc);
    if(doc.spaceId!==spaceId||(options.kind&&options.kind!==doc.kind))continue;
    const title=normalizeNodeSearch(doc.title),summary=normalizeNodeSearch(doc.summary),tags=normalizeNodeSearch(doc.tags.join(' '));
    let score=0,matched=true;
    for(const term of terms){
      if(title.includes(term))score+=title===term?8:5;
      else if(tags.includes(term))score+=3;
      else if(summary.includes(term))score+=1;
      else {matched=false;break;}
    }
    if(matched)matches.push({doc,score});
  }
  return matches.sort((a,b)=>b.score-a.score||
    a.doc.title.localeCompare(b.doc.title,'it')||a.doc.id.localeCompare(b.doc.id)).slice(0,limit).map(x=>x.doc);
}
