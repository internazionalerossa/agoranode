import {filterArticles,comparePublication,type ReadingArticle} from './reading.ts';

/** Alternate countries and publishers across each rolling day of the selected publication period.
 * Every item remains accessible; this is a declared reading order, not a popularity score.
 */
export function internationalEdition(articles:ReadingArticle[],now=Date.now()):ReadingArticle[]{
 const bands=new Map<number,ReadingArticle[]>();
 for(const article of [...articles].sort(comparePublication)){
  const date=Date.parse(article.publishedAt??'');
  const band=Number.isFinite(date)?Math.max(0,Math.floor((now-date)/86_400_000)):Infinity;
  const list=bands.get(band)??[];list.push(article);bands.set(band,list);
 }
 const result:ReadingArticle[]=[];
 for(const [,items] of [...bands].sort(([a],[b])=>a-b)){
  const countries=new Map<string,Map<string,ReadingArticle[]>>();
  const publisherCountries=new Map<string,string>();
  for(const article of items){
   let publisher=article.sourceId;try{publisher=new URL(article.sourceHomepage).hostname.replace(/^www\./,'');}catch{/* Retain the known source identifier. */}
   const country=publisherCountries.get(publisher)??article.country??'unknown';
   publisherCountries.set(publisher,country);
   const publishers=countries.get(country)??new Map<string,ReadingArticle[]>();
   const list=publishers.get(publisher)??[];list.push(article);publishers.set(publisher,list);countries.set(country,publishers);
  }
  const countriesInOrder=[...countries.values()].map(publishers=>[...publishers.values()]);
  const publishersInOrder:ReadingArticle[][]=[];
  for(let index=0;countriesInOrder.some(country=>index<country.length);index++)for(const country of countriesInOrder){
   if(country[index])publishersInOrder.push(country[index]);
  }
  // Give each publisher one opening before returning to another story from that publisher.
  // Cursors avoid repeatedly shifting long queues when one feed supplies many items.
  let queues=publishersInOrder,index=0;
  while(queues.length){
   const next:ReadingArticle[][]=[];
   for(const publisher of queues){result.push(publisher[index]);if(publisher.length>index+1)next.push(publisher);}
   queues=next;index++;
  }
 }
 return result;
}

export const NEWS_PERIODS = [
  ["0.25", "Ultime 6 ore"],
  ["1", "Ultime 24 ore"],
  ["Infinity", "Tutta la raccolta disponibile"],
] as const;
export const NEWS_ORDERS = [
  ["balanced", "Alterna le fonti e i paesi"],
  ["fresh", "Più recenti prima"],
  ["source", "Fonte · dalla A alla Z"],
] as const;
/** The UI and tests use the same complete selection, including its reading order. */
export function selectNews(articles: ReadingArticle[], filters: Parameters<typeof filterArticles>[1], now = Date.now()): ReadingArticle[] {
  const matched = filterArticles(articles, filters, now);
  return filters.sort === "balanced" ? internationalEdition(matched, now) : matched;
}
