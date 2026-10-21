import { bookEdition } from "../data/library";
import { publicPhotoUrl, fetchPublicPhotoResource, readLimited } from "./article-photo";
import { readerChapters, parseReaderPage, paginateBook, sectionReaderBook, decodeBookHtml, type ReaderBlock, type ReaderChapter } from "./book-text";
export type ReaderDocument = { chapters: ReaderChapter[]; chapter: number; pages: ReaderBlock[][]; revision: string; source: string; url: string; language: string; archive?: {persistent:true;revisionSha256:string;license:string;licenseUrl:string;rightsStatementUrl:string;attribution:string} };
let cacheBytes = 0;
const cache = new Map<string, { size: number; until: number; value: { html: string; chapters: ReaderChapter[]; sections?: ReaderBlock[][] } }>();
async function load(url:string, language:string) {
 const old=cache.get(url);if(old&&old.until>Date.now())return old.value;
 const parsed=publicPhotoUrl(url);if(!parsed)throw Error("Invalid catalogue URL");
 const response=await fetchPublicPhotoResource(parsed,AbortSignal.timeout(16000),{accept:"text/html","user-agent":"PolisRossa/1.0 (attributed open book reader)"},fetch,parsed.hostname.replace(/^www\./,""));
 if(!response.ok||!response.headers.get("content-type")?.includes("text/html")){await response.body?.cancel();throw Error("Edizione non raggiungibile");}
 const bytes=await readLimited(response,3_500_000);
 const html=decodeBookHtml(bytes,response.headers.get("content-type")??"",language);
 const chapters=readerChapters(html,url);
 const sections=chapters.length===1&&chapters[0].url===url?sectionReaderBook(parseReaderPage(html)):undefined;
 const value={html,chapters:sections&&sections.length>1?sections.map((section,i)=>({title:section.find(block=>block.type==="h2")?.text.slice(0,220)??`Introduzione ${i+1}`,url})):chapters,sections};
 const size=html.length*2+JSON.stringify(value.chapters).length*2+(sections?JSON.stringify(sections).length*2:0);
 while(cache.size&&(cacheBytes+size>8000000||cache.size>=16)){const oldest=cache.keys().next().value!;cacheBytes-=cache.get(oldest)!.size;cache.delete(oldest);}
 const previous=cache.get(url);if(previous)cacheBytes-=previous.size;
 if(size<=8000000){cache.set(url,{size,until:Date.now()+3600000,value});cacheBytes+=size;}return value;
}
export async function readBook(bookId:string,language:string,chapter:number):Promise<ReaderDocument>{
 const edition=bookEdition(bookId,language);if(!edition)throw Error("Unknown edition");
 const root=await load(edition.url,language);
 const chapters=edition.chapters??root.chapters;
 if(chapters.some(item=>{try{const target=new URL(item.url),base=new URL(edition.url);return target.origin!==base.origin||target.search||target.hash;}catch{return true;}}))throw Error("Invalid catalogue chapters");
 if(!Number.isSafeInteger(chapter)||chapter<0||chapter>=chapters.length)throw RangeError("Unknown chapter");
 const target=chapters[chapter];const value=target.url===edition.url?root:await load(target.url,language);
 const pages=paginateBook((edition.chapters?undefined:root.sections?.[chapter])??parseReaderPage(value.html));
 if(!pages.length)throw Error("Testo non disponibile");
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(pages)));
 const revision=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,"0")).join("");
 return {chapters,chapter,pages,revision,source:edition.source,url:target.url,language};
}
