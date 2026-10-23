/** Account and visitor preferences are PRIVATE and scoped to a thematic node.
 * Unknown source IDs are dropped; the catalogue defines what may be followed.
 * Selecting favourites never changes the source collection of other members.
 */
export type SourceChoice = {id:string; name:string};
export type FeedMode='all'|'favourites';
const SPACE=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validSpaceId(id:string):boolean{return SPACE.test(id)&&id.length<=64;}
export function normaliseSourceChoices(raw:unknown,allowed:ReadonlySet<string>):string[] {
  if(!Array.isArray(raw)||raw.length>250)return [];
  const selected:string[]=[];
  for(const id of raw){
    if(typeof id!=='string'||!allowed.has(id)||selected.includes(id))continue;
    selected.push(id);
  }
  return selected;
}
export function feedPreferenceStorageKey(spaceId:string):string {
  if(!validSpaceId(spaceId))throw Error('Invalid node identity');
  return 'agoranode.feed-favourites.v1:'+spaceId;
}
export function feedModeStorageKey(spaceId:string):string {
  if(!validSpaceId(spaceId))throw Error('Invalid node identity');
  return 'agoranode.feed-mode.v1:'+spaceId;
}
export function normaliseFeedMode(value:unknown):FeedMode {
  return value==='favourites'?'favourites':'all';
}
export function matchingPreferredSource<T extends {sourceId:string;feedSourceId?:string}>(
  article:T,favourites:ReadonlySet<string>,
):boolean{return favourites.has(article.sourceId)||Boolean(article.feedSourceId&&favourites.has(article.feedSourceId));}
export function selectPreferredArticles<T extends {sourceId:string;feedSourceId?:string}>(
  articles:readonly T[],mode:FeedMode,favourites:ReadonlySet<string>,
):T[]{return mode==='favourites'?articles.filter(item=>matchingPreferredSource(item,favourites)):[...articles];}
