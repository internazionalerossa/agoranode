/**
 * A dedicated shareable library record, independent of file availability.
 * Never turn an external edition URL into a local download claim.
 */
const BOOK=/^[a-z0-9][a-z0-9-]{0,95}$/;
export function bookDetailUrl(bookId:string,spaceId='polisrossa'):string{
 if(spaceId!=='polisrossa'||!BOOK.test(bookId))throw Error('Unsupported library identity');
 return '/polisrossa?'+new URLSearchParams({view:'teoria',percorso:'libri',libro:bookId});
}
export function bookFromUrl(raw:string):string|null{
 const url=new URL(raw,'https://site.invalid');
 if(url.pathname!=='/polisrossa'||url.searchParams.get('view')!=='teoria'||
    url.searchParams.get('percorso')!=='libri'||url.searchParams.getAll('libro').length!==1)return null;
 const id=url.searchParams.get('libro');
 return id&&BOOK.test(id)?id:null;
}
