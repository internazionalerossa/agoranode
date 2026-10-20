/** Country only: no coordinates, IP retention or third-party geolocation service. */
const countries:Record<string,string>={IT:'Italia',FR:'Francia',DE:'Germania',ES:'Spagna',GB:'Regno Unito',PT:'Portogallo',GR:'Grecia',US:'Stati Uniti',CA:'Canada',MX:'Messico',AR:'Argentina',BR:'Brasile',CU:'Cuba',CN:'Cina',IN:'India',VN:'Vietnam',KR:'Corea del Sud',JP:'Giappone',PH:'Filippine',AU:'Australia',GH:'Ghana',KE:'Kenya',LB:'Libano',ZA:'Sudafrica',TR:'Turchia'};
export function videoCountry(code:unknown):string|null{return typeof code==='string'?countries[code.toUpperCase()]??null:null;}
export function browserVideoCountry(languages:readonly string[]):string|null{
 for(const language of languages)try{const country=videoCountry(new Intl.Locale(language).region);if(country)return country;}catch{/* Ignore malformed browser preferences. */}
 return null;
}
export function visitorCountryResponse(request:Request,code:unknown=null):Response{
 const headers={'cache-control':'private, no-store',vary:'cookie'};
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers});
 return Response.json({country:videoCountry(code)}, {headers});
}
