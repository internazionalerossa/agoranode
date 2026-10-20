export const VIEWS=['notizie','fonti','teoria','salvati','metodo','partecipa','osservatorio','crediti','privacy'] as const;
export type View=(typeof VIEWS)[number];
export function viewFromUrl(raw:string):View{
 const url=new URL(raw,'https://site.invalid');const requested=url.searchParams.get('view');
 if(VIEWS.includes(requested as View))return requested as View;
 if(url.searchParams.has('storia'))return 'teoria';
 if(url.searchParams.has('stanza'))return 'partecipa';
 if(url.searchParams.has('proposal'))return 'partecipa';
 if(url.hash==='#osservatorio-sei-ore')return 'osservatorio';
 return 'notizie';
}
export function viewUrl(raw:string,next:View):string{
 const url=new URL(raw,'https://site.invalid');url.hash='';
 if(next==='notizie')url.searchParams.delete('view');else url.searchParams.set('view',next);
 if(next!=='partecipa')for(const key of ['proposal','stanza'])url.searchParams.delete(key);
 if(next!=='teoria')for(const key of ['storia','percorso','indicatore'])url.searchParams.delete(key);
 return url.pathname+url.search+url.hash;
}
