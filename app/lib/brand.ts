/** The first word is invariant; the colour follows the reading language without a network request. */
export const BRAND_RED: Readonly<Record<string,string>> = Object.freeze({
 it:'Rossa',en:'Red',fr:'Rouge',de:'Rot',es:'Roja',pt:'Vermelha',nl:'Rood',pl:'Czerwona',el:'Κόκκινη',ro:'Roșie',cs:'Červená',sk:'Červená',sl:'Rdeča',sv:'Röd',da:'Rød',no:'Rød',nb:'Rød',nn:'Raud',fi:'Punainen',hu:'Vörös',bg:'Червена',ru:'Красная',uk:'Червона',ca:'Roja',eu:'Gorria',lt:'Raudona',sr:'Crvena',hr:'Crvena',mk:'Црвена',ar:'الحمراء',zh:'红色','zh-tw':'紅色',id:'Merah',ko:'붉은',vi:'Đỏ',th:'แดง',ka:'წითელი',bn:'লাল',fa:'سرخ',he:'אדומה',tr:'Kızıl',ur:'سرخ',eo:'Ruĝa',ja:'赤',
});
export function brandColour(language='it'){
 const code=language.trim().replace(/_/g,'-').toLowerCase();
 if(/^zh-(tw|hk|mo|hant)(-|$)/.test(code))return BRAND_RED['zh-tw'];
 return BRAND_RED[code]??BRAND_RED[code.split('-')[0]]??BRAND_RED.en;
}
export function brandName(language='it'){return 'Polis'+brandColour(language);}
export function localizeBrand(text:string,language:string){return text.replaceAll('PolisRossa',brandName(language));}
export async function translateAroundBrand(text:string,translatePart:(part:string)=>Promise<string|null>):Promise<string|null>{
 const parts=await Promise.all(text.split('PolisRossa').map(part=>part.trim()?translatePart(part):Promise.resolve(part)));
 return parts.some(part=>part===null)?null:parts.join('PolisRossa');
}
