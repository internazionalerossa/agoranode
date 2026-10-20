/** The browser never falls back to a third-party endpoint after an API failure. */
export async function requestPublicTranslation(text:string,from:string,to:string,fetcher:typeof fetch=fetch):Promise<string>{
 const response=await fetcher('/api/translate',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({text,from,to}),signal:AbortSignal.timeout(14000),
 });
 const data=await response.json();
 if(!response.ok||typeof data.translatedText!=='string'||!data.translatedText.trim())throw Error('Server translation unavailable');
 return data.translatedText;
}
