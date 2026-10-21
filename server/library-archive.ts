import {createHash} from 'node:crypto';
import {bookEdition} from '../app/data/library';
import {readBook,type ReaderDocument} from '../app/lib/book-reader';
import type {ReaderBlock,ReaderChapter} from '../app/lib/book-text';
import type {Connection,Connections,PostgresDatabase} from './database';
import {libraryStorageRight,type LibraryStorageRight} from './library-rights';

const PARSER_VERSION=1;
const MAX_ARCHIVE_BYTES=32*1024*1024;
const idPattern=/^[a-z0-9][a-z0-9-]{0,127}$/;
const languagePattern=/^[a-z][a-z0-9-]{0,15}$/;
type Reader=(bookId:string,language:string,chapter:number)=>Promise<ReaderDocument>;
type RightsLookup=(bookId:string,language:string)=>LibraryStorageRight|null;

type ArchivedChapter={index:number;title:string;url:string;pages:ReaderBlock[][];pagesJson:string;contentSha256:string};
type CollectedEdition={right:LibraryStorageRight;title:string;source:string;chapters:ArchivedChapter[];revisionSha256:string};

function sha256(value:string){return createHash('sha256').update(value).digest('hex');}
function fail(message:string):never{throw new Error(message);}
function validPages(value:unknown):value is ReaderBlock[][]{
 return Array.isArray(value)&&value.length>0&&value.length<=100000&&value.every(page=>Array.isArray(page)&&page.length>0&&page.every(block=>Boolean(block)&&typeof block==='object'&&['p','h2','h3'].includes((block as ReaderBlock).type)&&typeof (block as ReaderBlock).text==='string'&&(block as ReaderBlock).text.length>0));
}
function canonicalChapters(chapters:ReaderChapter[]){return JSON.stringify(chapters.map(chapter=>({title:chapter.title,url:chapter.url})));}

export function validateLibraryImportTarget(bookId:string,language:string){
 if(!idPattern.test(bookId)||!languagePattern.test(language))fail('Book ID or language has an invalid format');
 const edition=bookEdition(bookId,language),right=libraryStorageRight(bookId,language);
 if(!edition||!right||!right.allowPersistentCopy||!right.allowPublicReading)fail('Edition is not approved for persistent storage');
 if(edition.url!==right.catalogUrl)fail('Rights register no longer matches the catalogue URL');
 return {edition,right};
}

export async function collectLibraryEdition(bookId:string,language:string,reader:Reader=readBook):Promise<CollectedEdition>{
 const {edition,right}=validateLibraryImportTarget(bookId,language);
 const first=await reader(bookId,language,0);
 if(first.chapter!==0||first.language!==language||!Array.isArray(first.chapters)||first.chapters.length<1||first.chapters.length>256)fail('Remote edition returned an invalid chapter index');
 const chapterList=canonicalChapters(first.chapters),chapters:ArchivedChapter[]=[];let totalBytes=0;
 for(let index=0;index<first.chapters.length;index++){
  const document=index===0?first:await reader(bookId,language,index);
  if(document.chapter!==index||document.language!==language||canonicalChapters(document.chapters)!==chapterList||!validPages(document.pages))fail('Remote edition returned invalid or inconsistent content');
  const listed=first.chapters[index],url=new URL(document.url);
  if(url.protocol!=='https:'||url.username||url.password||url.href!==new URL(listed.url).href)fail('Remote edition returned an unexpected chapter URL');
  const pagesJson=JSON.stringify(document.pages),bytes=Buffer.byteLength(pagesJson);
  if(bytes<2||bytes>8*1024*1024||(totalBytes+=bytes)>MAX_ARCHIVE_BYTES)fail('Remote edition exceeds the archive size limit');
  chapters.push({index,title:listed.title.slice(0,500),url:url.href,pages:document.pages,pagesJson,contentSha256:sha256(pagesJson)});
 }
 const canonical=JSON.stringify({format:'polisrossa-library-revision',version:1,parserVersion:PARSER_VERSION,bookId,language,title:edition.title,source:edition.source,sourceUrl:right.catalogUrl,licenseSpdx:right.licenseSpdx,licenseUrl:right.licenseUrl,rightsStatementUrl:right.rightsStatementUrl,rightsReviewedAt:right.reviewedAt,attribution:right.attribution,chapters:chapters.map(chapter=>({index:chapter.index,title:chapter.title,url:chapter.url,contentSha256:chapter.contentSha256,pages:chapter.pages}))});
 return {right,title:edition.title,source:edition.source,chapters,revisionSha256:sha256(canonical)};
}

function sameEdition(row:Record<string,unknown>,collected:CollectedEdition){
 return row.title===collected.title&&row.source_name===collected.source&&row.catalog_url===collected.right.catalogUrl;
}

async function persistCollectedEdition(connection:Connection,bookId:string,language:string,collected:CollectedEdition){
 await connection.query('SELECT pg_advisory_xact_lock(194733,3)');
 const edition=(await connection.query('SELECT title,source_name,catalog_url FROM library_editions WHERE book_id=$1 AND language=$2',[bookId,language])).rows[0];
 if(edition&&!sameEdition(edition,collected))fail('Stored edition metadata conflicts with the catalogue');
 if(!edition)await connection.query('INSERT INTO library_editions(book_id,language,title,source_name,catalog_url) VALUES($1,$2,$3,$4,$5)',[bookId,language,collected.title,collected.source,collected.right.catalogUrl]);
 const existing=(await connection.query('SELECT revision_sha256 FROM library_revisions WHERE revision_sha256=$1',[collected.revisionSha256])).rows.length>0;
 if(!existing){
  await connection.query('INSERT INTO library_revisions(revision_sha256,book_id,language,source_url,parser_version,license_spdx,license_url,rights_statement_url,rights_reviewed_at,attribution) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[collected.revisionSha256,bookId,language,collected.right.catalogUrl,PARSER_VERSION,collected.right.licenseSpdx,collected.right.licenseUrl,collected.right.rightsStatementUrl,collected.right.reviewedAt,collected.right.attribution]);
  for(const chapter of collected.chapters)await connection.query('INSERT INTO library_chapters(revision_sha256,chapter_index,title,source_url,content_sha256,pages_json) VALUES($1,$2,$3,$4,$5,$6)',[collected.revisionSha256,chapter.index,chapter.title,chapter.url,chapter.contentSha256,chapter.pagesJson]);
 }
 await connection.query('INSERT INTO library_current_revisions(book_id,language,revision_sha256) VALUES($1,$2,$3) ON CONFLICT(book_id,language) DO UPDATE SET revision_sha256=excluded.revision_sha256,selected_at=now()',[bookId,language,collected.revisionSha256]);
 return {bookId,language,revisionSha256:collected.revisionSha256,chapters:collected.chapters.length,created:!existing,license:collected.right.licenseSpdx};
}

export async function importLibraryEdition(pool:Connections,bookId:string,language:string,reader:Reader=readBook){
 const collected=await collectLibraryEdition(bookId,language,reader),connection=await pool.connect();
 try{await connection.query('BEGIN');const result=await persistCollectedEdition(connection,bookId,language,collected);await connection.query('COMMIT');return result;}
 catch(error){await connection.query('ROLLBACK');throw error;}finally{connection.release?.();}
}

export async function readArchivedBook(connection:Pick<Connection,'query'>,bookId:string,language:string,chapter:number,rights:RightsLookup=libraryStorageRight):Promise<ReaderDocument|null>{
 if(!idPattern.test(bookId)||!languagePattern.test(language)||!Number.isSafeInteger(chapter)||chapter<0||chapter>255)return null;
 const revision=(await connection.query('SELECT r.revision_sha256,r.source_url,r.license_spdx,r.license_url,r.rights_statement_url,r.rights_reviewed_at,r.attribution FROM library_current_revisions c JOIN library_revisions r ON r.revision_sha256=c.revision_sha256 WHERE c.book_id=$1 AND c.language=$2',[bookId,language])).rows[0];
 if(!revision)return null;
 // Publication is deny-by-default at read time too. Removing or changing the
 // source-controlled permission immediately stops serving an old stored copy.
 const right=rights(bookId,language),reviewed=revision.rights_reviewed_at instanceof Date?revision.rights_reviewed_at.toISOString().slice(0,10):String(revision.rights_reviewed_at??'').slice(0,10);
 if(!right||!right.allowPersistentCopy||!right.allowPublicReading||right.catalogUrl!==revision.source_url||right.licenseSpdx!==revision.license_spdx||right.licenseUrl!==revision.license_url||right.rightsStatementUrl!==revision.rights_statement_url||right.reviewedAt!==reviewed||right.attribution!==revision.attribution)return null;
 const rows=(await connection.query('SELECT chapter_index,title,source_url,content_sha256 FROM library_chapters WHERE revision_sha256=$1 ORDER BY chapter_index',[revision.revision_sha256])).rows;
 if(chapter>=rows.length||rows.some((row,index)=>row.chapter_index!==index||typeof row.title!=='string'||typeof row.source_url!=='string'||typeof row.content_sha256!=='string'))throw new Error('Stored library revision is incomplete');
 const stored=(await connection.query('SELECT pages_json FROM library_chapters WHERE revision_sha256=$1 AND chapter_index=$2',[revision.revision_sha256,chapter])).rows[0];
 if(typeof stored?.pages_json!=='string')throw new Error('Stored library revision is incomplete');
 let pages:unknown;try{pages=JSON.parse(stored.pages_json);}catch{fail('Stored library chapter is invalid');}
 if(!validPages(pages)||sha256(stored.pages_json)!==rows[chapter].content_sha256)fail('Stored library chapter failed its integrity check');
 return {chapters:rows.map(row=>({title:row.title as string,url:row.source_url as string})),chapter,pages,revision:rows[chapter].content_sha256 as string,source:bookEdition(bookId,language)?.source??'Archivio persistente PolisRossa',url:rows[chapter].source_url as string,language,archive:{persistent:true,revisionSha256:revision.revision_sha256 as string,license:revision.license_spdx as string,licenseUrl:revision.license_url as string,rightsStatementUrl:revision.rights_statement_url as string,attribution:revision.attribution as string}};
}

export async function readBookDatabaseFirst(db:PostgresDatabase,bookId:string,language:string,chapter:number){
 // Public reading is intentionally database-only. A missing, revoked or
 // changed right must never fall back to fetching and republishing the remote
 // work during a visitor request.
 validateLibraryImportTarget(bookId,language);
 const archived=await readArchivedBook(db.pool,bookId,language,chapter);
 if(!archived)fail('Approved edition is not available in the persistent archive');
 return archived;
}
