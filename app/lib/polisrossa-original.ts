/** The independently deployed, original PolisRossa runtime is the reference.
 * The AgoraNode Render STATIC preview never represents its live feed as working.
 */
export const ORIGINAL_POLISROSSA_URL='https://polisrossa.tail37128d.ts.net/' as const;

export function originalPolisRossaHref(path:string,search='',hash=''):string {
 const target=new URL(ORIGINAL_POLISROSSA_URL);
 // The source site predates the /polisrossa SPA prefix; the legacy root
 // view/query contract is retained at its original origin.
 if(path==='/polisrossa/read'||path==='/read')target.pathname='/read';
 else if(path==='/polisrossa/account'||path==='/account')target.pathname='/account';
 else target.pathname='/';
 target.search=search;
 target.hash=hash;
 return target.href;
}
