import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import INDEX from '../app/data/history-world-index.json' with {type:'json'};
import AUTHORS from '../app/data/author-archives.json' with {type:'json'};
import COLLECTIONS from '../app/data/history-collections.json' with {type:'json'};
import {THEORY_LIBRARY} from '../app/data/library.ts';
test('global historical snapshots are complete against their index, ordered, finite and never replace missing values with zero',async()=>{
 let total=0;const countries=new Set(INDEX.countries.map(c=>c.id));assert.equal(countries.size,INDEX.countries.length);
 for(const metadata of INDEX.indicators){
  const data=JSON.parse(await readFile(new URL('../public/data/history/'+metadata.id+'.json',import.meta.url),'utf8'));let observations=0;
  assert.equal(data.indicator,metadata.id);assert.ok(metadata.definition&&metadata.organization);assert.ok(['data.worldbank.org','ec.europa.eu','ilostat.ilo.org'].includes(new URL(metadata.source).hostname));assert.ok(metadata.provider);assert.ok(metadata.period[0]<=metadata.period[1]);
  assert.equal(Object.keys(data.series).length,metadata.countries);
  for(const [country,values]of Object.entries(data.series)){assert.ok(countries.has(country));let previous=1959;for(const [year,value]of values){assert.ok(Number.isInteger(year)&&year>previous&&year<=INDEX.period[1]);assert.ok(Number.isFinite(value));assert.notEqual(value,null);previous=year;observations++;}}
  assert.equal(observations,metadata.observations);total+=observations;
 }
 assert.equal(total,INDEX.observations);for(const country of ['CUB','VNM','CHN','USA','FRA','DEU','GBR','ZAF','BRA','IND'])assert.ok(countries.has(country));
});
test('archives point to indexed public collections and remain distinct from native book counts',()=>{
 for(const rows of [AUTHORS.authors,COLLECTIONS.collections]){assert.equal(new Set(rows.map(r=>r.url)).size,rows.length);for(const row of rows){const url=new URL(row.url);assert.equal(url.protocol,'https:');assert.equal(url.hostname,'www.marxists.org');assert.equal(url.username,'');}}
 for(const name of ['Tan Malaka','Bhagat Singh','Ricardo Flores Magón','Luis Emilio Recabarren','Sol Plaatje','Olive Schreiner','Claude McKay','José Carlos Mariátegui'])assert.ok(THEORY_LIBRARY.some(book=>book.author===name&&book.editions?.length),name);
 for(const book of THEORY_LIBRARY.filter(book=>book.editions?.length)){assert.ok(book.summary&&book.period);for(const edition of book.editions){assert.equal(new URL(edition.url).protocol,'https:');}}
});

test('the expanded archive distinguishes earnings, costs, infrastructure, STEM, teaching and reading with documented coverage',()=>{
 const ids=new Set(INDEX.indicators.map(item=>item.id));assert.equal(ids.size,INDEX.indicators.length);assert.ok(ids.size>=85);
 for(const id of ['ILO.WAGE.HOUR.PPP','ILO.WAGE.HOUR.MEDIAN.PPP','ILO.WAGE.MONTH.PPP','ILO.OUTPUT.HOUR.PPP','ESTAT.ELECTRIC.EUR','ESTAT.ELECTRIC.PPS','ESTAT.GAS.EUR','ESTAT.HOUSING.OVERBURDEN','ESTAT.BOOK.READERS','ESTAT.STEM.GRAD.TOTAL','ESTAT.ACADEMIC.STAFF','ESTAT.SCIENTISTS.ENGINEERS','IS.RRS.TOTL.KM','IT.NET.BBND.P2'])assert.ok(ids.has(id),id);
 const hourly=INDEX.indicators.find(i=>i.id==='ILO.WAGE.HOUR.PPP');assert.match(hourly.unit,/PPP 2021/);assert.match(hourly.definition,/non.*salario reale/i);
 const energy=INDEX.indicators.find(i=>i.id==='ESTAT.ELECTRIC.EUR');assert.equal(energy.transformation,'semesters');assert.match(energy.definition,/non.*ponderata/i);
 const readers=INDEX.indicators.find(i=>i.id==='ESTAT.BOOK.READERS');assert.match(readers.unit,/Percentuale/);assert.match(readers.definition,/non.*numero assoluto/);
});
test('STEM totals and private consumption per person use complete, same-country same-year components',async()=>{
 const load=async id=>JSON.parse(await readFile(new URL('../public/data/history/'+id+'.json',import.meta.url),'utf8'));
 const stem=await load('ESTAT.STEM.GRAD.TOTAL'),components=await Promise.all(['SCIENCE','ICT','ENGINEERING'].map(id=>load('ESTAT.'+id+'.GRAD')));
 for(const [country,points]of Object.entries(stem.series))for(const [year,value]of points){const parts=components.map(d=>new Map(d.series[country]).get(year));assert.ok(parts.every(x=>x!==undefined));assert.equal(value,parts.reduce((a,b)=>a+b,0));}
 const consumption=await load('DERIVED.CONSUMPTION.PCAP.PPP'),total=await load('NE.CON.PRVT.PP.KD'),population=await load('SP.POP.TOTL');
 for(const [country,points]of Object.entries(consumption.series))for(const [year,value]of points)assert.equal(value,new Map(total.series[country]).get(year)/new Map(population.series[country]).get(year));
});
test('ILO earnings preserve a single survey source and original observation notes, without future projections',async()=>{
 for(const id of ['ILO.WAGE.HOUR.PPP','ILO.WAGE.HOUR.MEDIAN.PPP','ILO.WAGE.MONTH.PPP','ILO.OUTPUT.HOUR.PPP']){
  const d=JSON.parse(await readFile(new URL('../public/data/history/'+id+'.json',import.meta.url),'utf8'));
  for(const country of Object.keys(d.series)){assert.ok(d.countrySources[country].code);assert.ok(d.countrySources[country].label);assert.ok(d.series[country].every(([year])=>year<=2025));}
  assert.match(d.metadata.selection,/coverage/);
 }
});
test('thematic achievement readings resolve real books, data indicators and attributable external resources',async()=>{
 const paths=JSON.parse(await readFile(new URL('../app/data/history-study-paths.json',import.meta.url),'utf8'));
 assert.ok(paths.length>=8);const ids=new Set(INDEX.indicators.map(i=>i.id));
 for(const path of paths){assert.ok(path.intro.length>100);assert.ok(ids.has(path.indicator));assert.ok(path.books.length>=4);for(const reading of path.books){const book=THEORY_LIBRARY.find(b=>b.id===reading.id);assert.ok(book?.editions?.length,reading.id);assert.ok(!book.aliasOf);assert.ok(reading.why.length>30);}for(const [,url]of path.resources)assert.equal(new URL(url).protocol,'https:');}
});

test('the production comparison uses the latest common observed year and discloses nominal units',async()=>{
 const cases=JSON.parse(await readFile(new URL('../app/data/production-highlights.json',import.meta.url),'utf8'));
 const item=cases.find(row=>row.id==='manufacturing'),data=JSON.parse(await readFile(new URL('../public/data/history/NV.IND.MANF.CD.json',import.meta.url),'utf8'));
 const china=new Map(data.series.CHN),usa=new Map(data.series.USA),year=Math.max(...[...china.keys()].filter(year=>usa.has(year)));
 assert.equal(item.calculation.year,year);assert.equal(item.calculation.ratio,china.get(year)/usa.get(year));assert.match(item.text,/dollari correnti/);
 assert.match(cases.find(row=>row.id==='huawei').text,/privata/);assert.match(cases.find(row=>row.id==='huawei').text,/per quota posseduta/);
 assert.match(cases.find(row=>row.id==='equinor').text,/non significa/);
});
