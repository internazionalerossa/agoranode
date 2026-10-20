export const VIEWS=['notizie','fonti','teoria','salvati','metodo','partecipa','crediti','privacy'] as const;
export type View=(typeof VIEWS)[number];
export function viewFromUrl(raw:string):View{
 const url=new URL(raw,'https://site.invalid');const requested=url.searchParams.get('view');
 if(requested==='osservatorio'||url.hash==='#osservatorio-sei-ore')return 'notizie';
 if(VIEWS.includes(requested as View))return requested as View;
 if(url.searchParams.has('storia'))return 'teoria';
 if(url.searchParams.has('stanza'))return 'partecipa';
 if(url.searchParams.has('proposal'))return 'partecipa';
 return 'notizie';
}
export function viewUrl(raw:string,next:View):string{
 const url=new URL(raw,'https://site.invalid');url.hash='';
 if(next==='notizie')url.searchParams.delete('view');else url.searchParams.set('view',next);
 url.searchParams.delete('periodo');
 if(next!=='partecipa')for(const key of ['proposal','stanza'])url.searchParams.delete(key);
 if(next!=='teoria')for(const key of ['storia','percorso','indicatore'])url.searchParams.delete(key);
 return url.pathname+url.search+url.hash;
}

export function newsDaysFromUrl(raw:string):string {
 const url=new URL(raw,'https://site.invalid');
 if(url.searchParams.get('view')==='osservatorio'||url.hash==='#osservatorio-sei-ore')return '0.25';
 const value=url.searchParams.get('periodo');
 if(value==='6h')return '0.25';
 if(value==='0.5')return '1';
 if(value&&['3','7','30'].includes(value))return 'Infinity';
 return value&&['0.25','1','Infinity'].includes(value)?value:'1';
}
