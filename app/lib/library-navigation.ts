export type LibrarySection = 'libri' | 'timeline' | 'dati';
export const LIBRARY_SECTIONS = [
 {id:'libri',label:'Libri e percorsi',description:'Opere, edizioni e letture guidate'},
 {id:'timeline',label:'Timeline storica',description:'Lotte, conquiste, protagonisti e documenti'},
 {id:'dati',label:'Dati e grafici',description:'Confronti personalizzabili fra paesi e anni'},
] as const;
export function librarySectionFromUrl(raw:string):LibrarySection {
 const url=new URL(raw,'https://site.invalid');
 if(url.searchParams.has('storia')||url.searchParams.has('evento')||url.searchParams.has('persona'))return 'timeline';
 if(url.searchParams.get('percorso')==='dati'||url.searchParams.has('indicatore')||url.hash==='#world-history-title')return 'dati';
 return ['timeline','conquiste'].includes(url.searchParams.get('percorso')??'')?'timeline':'libri';
}
export function librarySectionUrl(raw:string,section:LibrarySection):string {
 const url=new URL(raw,'https://site.invalid');url.searchParams.set('view','teoria');url.hash='';url.searchParams.delete('periodo');
 url.searchParams.delete('storia');url.searchParams.delete('evento');url.searchParams.delete('persona');
 if(section!=='dati')for(const key of ['indicatore','paesi','dal','al','scala'])url.searchParams.delete(key);
 if(section==='libri')url.searchParams.delete('percorso');else url.searchParams.set('percorso',section);
 return url.pathname+url.search;
}
