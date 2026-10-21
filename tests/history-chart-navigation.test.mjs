import test from 'node:test';
import assert from 'node:assert/strict';
import {
 copyHistoryChartUrl,
 historyChartImageSvg,
 historyChartStateFromUrl,
 historyChartUrl,
 shareHistoryChart,
} from '../app/lib/history-chart-navigation.ts';

const navigation={
 indicators:[
  {id:'life',period:[1960,2024],defaultCountries:['CUB','USA']},
  {id:'wages',period:[1995,2022],defaultCountries:['ITA','FRA']},
 ],
 countryIds:new Set(['CUB','USA','ITA','FRA','VNM']),
 defaultIndicator:'life',
 fallbackCountries:['CUB','USA'],
 firstYear:1960,
 lastYear:2024,
};

test('chart links round-trip indicator, countries, period and scale without losing unrelated context',()=>{
 const state={indicator:'wages',countries:['ITA','FRA','VNM'],start:2001,end:2020,scale:'indice'};
 const relative=historyChartUrl('https://example.test/?ref=shared&scala=valore&paesi=CUB',state);
 const url=new URL(relative,'https://example.test');
 assert.equal(url.searchParams.get('ref'),'shared');
 assert.equal(url.searchParams.get('view'),'teoria');
 assert.equal(url.searchParams.get('percorso'),'dati');
 assert.equal(url.hash,'#world-history-title');
 assert.deepEqual(historyChartStateFromUrl(relative,navigation),state);
});

test('invalid and empty chart parameters fall back to bounded, usable state',()=>{
 assert.deepEqual(historyChartStateFromUrl('/?indicatore=unknown&paesi=&dal=no&al=9999&scala=other',navigation),{
  indicator:'life',countries:['CUB','USA'],start:1960,end:2024,scale:'valore',
 });
 assert.deepEqual(historyChartStateFromUrl('/?indicatore=wages&paesi=ITA,NOPE,ITA,FRA,VNM,CUB&dal=2022&al=1995&scala=indice',navigation),{
  indicator:'wages',countries:['ITA','FRA','VNM','CUB'],start:1995,end:2022,scale:'indice',
 });
 assert.deepEqual(historyChartStateFromUrl('/',navigation),{
  indicator:'life',countries:['CUB','USA'],start:1960,end:2024,scale:'valore',
 });
});

test('sharing prefers Web Share, copies as fallback and treats cancellation separately',async()=>{
 const payload={title:'Confronto',text:'Unità · periodo · fonte',url:'https://example.test/?grafico=1'};
 let shared=null,copied='';
 assert.equal(await shareHistoryChart({share:async value=>{shared=value;}},payload),'shared');
 assert.deepEqual(shared,payload);
 assert.equal(await shareHistoryChart({share:async()=>{throw new Error('unsupported');},clipboard:{writeText:async value=>{copied=value;}}},payload),'copied');
 assert.equal(copied,payload.url);
 assert.equal(await copyHistoryChartUrl({clipboard:{writeText:async value=>{copied=value;}}},payload.url),'copied');
 const cancelled=new Error('cancelled');cancelled.name='AbortError';
 assert.equal(await shareHistoryChart({share:async()=>{throw cancelled;},clipboard:{writeText:async()=>assert.fail('cancelled shares must not copy')}},payload),'cancelled');
 assert.equal(await shareHistoryChart({},payload),'unavailable');
});

test('the generated chart image keeps graph, attribution, unit, period and permanent URL together',()=>{
 const pageUrl='https://example.test/?view=teoria&paesi=CUB%2CUSA&dal=2000&al=2002';
 const sourceUrl='https://data.example.test/series?a=1&b=2';
 const svg=historyChartImageSvg({
  title:'Aspettativa <di vita>',unit:'anni & stima',provider:'Fonte pubblica',sourceUrl,pageUrl,start:2000,end:2002,
  series:[{label:'Cuba',color:'#a62626',points:[[2000,75],[2001,76],[2002,77]]},{label:'Stati Uniti',color:'#216453',points:[[2000,77],[2002,78]]}],
 });
 assert.match(svg,/width="1600" height="1000"/);
 assert.match(svg,/Aspettativa &lt;di vita&gt;/);
 assert.match(svg,/Unità: anni &amp; stima · Periodo: 2000–2002/);
 assert.ok(svg.includes(sourceUrl.replaceAll('&','&amp;')));
 assert.ok(svg.includes(pageUrl.replaceAll('&','&amp;')));
 assert.match(svg,/M120\.00,[0-9.]+ L815\.00,[0-9.]+ L1510\.00,/);
 assert.match(svg,/M120\.00,[0-9.]+ M1510\.00,/);
 assert.doesNotMatch(svg,/<script/i);
});
