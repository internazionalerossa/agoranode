import {brandName} from './brand.ts';
import {INSTANCE_MANIFEST} from './instance.ts';
export function brandManifestResponse(request:Request){
 const url=new URL(request.url),language=url.searchParams.get('language')??'it';
 if(request.method!=='GET')return new Response(null,{status:405,headers:{allow:'GET'}});
 if([...url.searchParams.keys()].some(key=>key!=='language')||url.searchParams.getAll('language').length>1||language.length>20||!/^[a-z]{2,3}(?:-[a-zA-Z]{2,4}){0,2}$/.test(language))return Response.json({error:'Invalid language'},{status:400});
 return Response.json({id:'/',name:brandName(language),short_name:brandName(language),description:INSTANCE_MANIFEST.instance.description,lang:language,start_url:'/',scope:'/',display:'standalone',background_color:INSTANCE_MANIFEST.theme.background,theme_color:INSTANCE_MANIFEST.theme.background,prefer_related_applications:false,categories:['news','education','social'],icons:[{src:'/icons/app-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/app-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/app-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},{headers:{'content-type':'application/manifest+json','cache-control':'public, max-age=3600'}});
}
