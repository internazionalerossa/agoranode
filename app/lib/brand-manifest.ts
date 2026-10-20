import {brandName} from './brand.ts';
export function brandManifestResponse(request:Request){
 const url=new URL(request.url),language=url.searchParams.get('language')??'it';
 if(request.method!=='GET')return new Response(null,{status:405,headers:{allow:'GET'}});
 if([...url.searchParams.keys()].some(key=>key!=='language')||url.searchParams.getAll('language').length>1||language.length>20||!/^[a-z]{2,3}(?:-[a-zA-Z]{2,4}){0,2}$/.test(language))return Response.json({error:'Invalid language'},{status:400});
 return Response.json({id:'/',name:brandName(language),short_name:brandName(language),lang:language,start_url:'/',scope:'/',display:'standalone',background_color:'#f6f3ec',theme_color:'#f6f3ec',icons:[{src:'/favicon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]},{headers:{'content-type':'application/manifest+json','cache-control':'public, max-age=3600'}});
}
