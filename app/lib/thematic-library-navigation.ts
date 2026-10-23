/** Shared navigation contract for the Library view of thematic nodes.
 * News, media and participation remain outside Library.
 */
export type LibraryDestination='libri'|'timeline'|'dati';
export type TimelineDisplay='racconto'|'indice';
export type ThematicLibraryLocation={
 destination:LibraryDestination;
 display:TimelineDisplay;
 articleId:string|null;
};
const ARTICLE=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SPACE=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const THEMATIC_LIBRARY_DESTINATIONS=[
 {id:'libri',label:'Libri e percorsi',description:'Opere, manuali e documenti da leggere'},
 {id:'timeline',label:'Timeline e Atlante',description:'Un racconto, con le voci collegate'},
 {id:'dati',label:'Dati e grafici',description:'Indicatori, metodo e fonti verificabili'},
] as const;

export function thematicLibraryLocationFromUrl(raw:string,spaceId:string):ThematicLibraryLocation {
 if(!SPACE.test(spaceId))throw Error('Invalid thematic space');
 const url=new URL(raw,'https://site.invalid');
 const destination=url.searchParams.get('sezione');
 const validDestination:LibraryDestination=
  destination==='timeline'||destination==='dati'?destination:'libri';
 const article=url.searchParams.get('voce');
 const articleId=article&&url.searchParams.getAll('voce').length===1&&ARTICLE.test(article)&&article.length<=80?article:null;
 return {
  destination:articleId?'timeline':validDestination,
  display:articleId||url.searchParams.get('modalita')==='indice'?'indice':'racconto',
  articleId,
 };
}
export function thematicLibraryHref(
 spaceId:string,
 destination:LibraryDestination='libri',
 display:TimelineDisplay='racconto',
 articleId:string|null=null,
):string{
 if(!SPACE.test(spaceId)||!['libri','timeline','dati'].includes(destination)||
    !['racconto','indice'].includes(display)||articleId!==null&&(!ARTICLE.test(articleId)||articleId.length>80))
  throw Error('Invalid thematic library navigation');
 const path=spaceId==='agora'?'/agora':'/n/'+spaceId;
 const params=new URLSearchParams({view:'biblioteca',sezione:destination});
 if(destination==='timeline'){
  if(display==='indice')params.set('modalita','indice');
  if(articleId)params.set('voce',articleId);
 }else if(articleId)throw Error('Articles belong to timeline and index');
 return path+'?'+params;
}
