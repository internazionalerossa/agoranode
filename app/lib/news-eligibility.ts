import exclusions from '../data/news-exclusions.json' with { type: 'json' };
import policy from '../data/source-policy.json' with { type: 'json' };
import { SOURCE_CATALOG } from '../data/catalog.ts';
const rules: Record<string, string[]> = exclusions;
const hostname=(value:string)=>{try{return new URL(value).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}};
const approvedHosts=new Set(SOURCE_CATALOG.filter(source=>source.kind!=='radar').map(source=>hostname(source.homepage)));
const excludedIds=new Set(policy.excludedSourceIds);
const excludedHost=(host:string)=>policy.excludedPublisherDomains.some(domain=>host===domain||host.endsWith('.'+domain));

/** Enforce editorial eligibility on live results AND restored public caches. Personal saves are preserved. */
export function isNewsArticle(article: { sourceId: string; feedSourceId?: string; link: string; sourceHomepage?:string; kind?:string }): boolean {
  const feed=article.feedSourceId??article.sourceId;
  if(excludedIds.has(article.sourceId)||excludedIds.has(feed))return false;
  const publisher=hostname(article.sourceHomepage??article.link),destination=hostname(article.link);
  if(!destination||excludedHost(publisher)||excludedHost(destination))return false;
  const scoped=policy.scopedPublisherSources.find(rule=>publisher===rule.domain||publisher.endsWith('.'+rule.domain));
  if(scoped&&!scoped.sourceIds.includes(feed.replace(/^pulse-direct-/,'')))return false;
  const radar=article.kind==='radar'||article.sourceId.startsWith('radar:')||feed.startsWith('radar-');
  if(radar&&!approvedHosts.has(publisher))return false;
  const prefixes = rules[feed] ?? rules[article.sourceId];
  if (!prefixes) return true;
  try {
    const path = new URL(article.link).pathname.toLowerCase();
    return !prefixes.some(prefix => path === prefix.slice(0, -1) || path.startsWith(prefix));
  } catch { return false; }
}
