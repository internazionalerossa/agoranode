"""Import ILOSTAT earnings in PPP and labour productivity, retaining survey provenance.
A single survey is selected per country by coverage, recency and stable source code.
"""
import collections,csv,datetime,io,json,math,sys,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
TODAY=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
RAW=Path(sys.argv[1]) if len(sys.argv)>1 else None
INDEX_PATH=ROOT/'app/data/history-world-index.json'
INDEX=json.loads(INDEX_PATH.read_text());COUNTRIES={c['id'] for c in INDEX['countries']}
BASE='https://rplumber.ilo.org/'

def csv_rows(url,name):
 path=RAW/name if RAW else None
 if path and path.exists():raw=path.read_bytes()
 else:
  raw=urllib.request.urlopen(url,timeout=45).read()
  if path:path.write_bytes(raw)
 return list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))

specs=[('EAR_EHRA_SEX_CUR_NB_A','ILO.WAGE.HOUR.PPP','Salario orario medio a parità di potere d’acquisto','Dollari PPP 2021 per ora'),('EAR_EHRM_SEX_CUR_NB_A','ILO.WAGE.HOUR.MEDIAN.PPP','Salario orario mediano a parità di potere d’acquisto','Dollari PPP 2021 per ora'),('EAR_EMTA_SEX_CUR_NB_A','ILO.WAGE.MONTH.PPP','Salario mensile medio a parità di potere d’acquisto','Dollari PPP 2021 per mese'),('EAR_EMTM_SEX_CUR_NB_A','ILO.WAGE.MONTH.MEDIAN.PPP','Salario mensile mediano a parità di potere d’acquisto','Dollari PPP 2021 per mese'),('GDP_2HRW_NOC_NB_A','ILO.OUTPUT.HOUR.PPP','Produttività per ora lavorata','PIL in dollari internazionali costanti 2021 per ora')]
if __name__=='__main__':
 sources={r['source']:r['source.label'] for r in csv_rows(BASE+'metadata/dic?var=source&lang=en&format=.csv','ilo-sources.csv')}
 currencies=csv_rows(BASE+'metadata/dic?var=classif1&lang=en&format=.csv','ilo-currencies.csv')
 print('PPP label:',[r for r in currencies if r.get('classif1')=='CUR_TYPE_PPP'],flush=True)
 toc={r['id']:r for r in csv_rows(BASE+'metadata/toc/indicator?lang=en&format=.csv','ilo-toc-new.csv')}
 results=[]
 for dataset,code,label,unit in specs:
  api=BASE+'data/indicator/?id='+dataset+'&format=.csv';rows=csv_rows(api,dataset+'.csv');groups=collections.defaultdict(lambda:collections.defaultdict(dict));notes={}
  for row in rows:
   if row['ref_area'] not in COUNTRIES or not row['time'].isdigit() or not 1960<=int(row['time'])<=2025:continue
   if dataset.startswith('EAR_') and (row.get('sex')!='SEX_T' or row.get('classif1')!='CUR_TYPE_PPP'):continue
   try:value=float(row['obs_value'])
   except (TypeError,ValueError):continue
   if not math.isfinite(value):continue
   country,source,year=row['ref_area'],row['source'],int(row['time']);group=groups[country][source]
   if year in group and group[year]!=value:raise ValueError('Conflicting observations '+str((country,source,year)))
   group[year]=value;notes[(country,source,year)]={k:row.get(k,'') for k in ['obs_status','note_classif','note_indicator','note_source'] if row.get(k)}
  series={};country_sources={};status={};point_notes={}
  for country,options in groups.items():
   source,values=sorted(options.items(),key=lambda pair:(-len(pair[1]),-max(pair[1]),pair[0]))[0]
   series[country]=sorted([[year,value] for year,value in values.items()]);country_sources[country]={'code':source,'label':sources.get(source,source)}
   for year in values:
    n=notes.get((country,source,year),{})
    if n.get('obs_status'):status.setdefault(country,{})[str(year)]=n['obs_status']
    if n:point_notes.setdefault(country,{})[str(year)]=n
  if not series:raise ValueError('No valid country series '+dataset)
  period=[min(v[0][0] for v in series.values()),max(v[-1][0] for v in series.values())];observations=sum(map(len,series.values()))
  is_wage=dataset.startswith('EAR_')
  definition=('Retribuzione dei lavoratori dipendenti, totale dei sessi, convertita da ILOSTAT con la classificazione CUR_TYPE_PPP (PPP 2021). La media e la mediana descrivono distribuzioni diverse. Copertura settoriale, lavoratori inclusi e trattamento delle componenti retributive possono variare fra indagini: leggere i metadati originali. Non è reddito netto disponibile e non va interpretata automaticamente come salario reale a prezzi costanti nel tempo. Le serie nazionali selezionate sono riportate sotto il grafico.' if is_wage else 'PIL reale per ora lavorata, stima modellata ILO di novembre 2025, in dollari internazionali costanti 2021. Misura la produttività economica media, non quanto riceve il lavoratore come salario. Sono escluse tutte le osservazioni successive al 2025.')
  updated=toc.get(dataset,{}).get('last.update',TODAY)
  meta=dict(id=code,label=label,theme='Salari e potere d’acquisto' if is_wage else 'Lavoro',unit=unit,definition=definition,definitionLanguage='it',organization='Organizzazione internazionale del lavoro · ILOSTAT',provider='ILOSTAT',source='https://ilostat.ilo.org/data/',api=api,countries=len(series),observations=observations,updatedAt=updated,period=period,defaultCountries=[c for c in ['CHN','VNM','CUB','USA','ITA','FRA'] if c in series][:4],filters={'sex':'SEX_T','classif1':'CUR_TYPE_PPP'} if is_wage else {},selection='Longest country survey coverage, then latest year, then source code ascending')
  data=dict(indicator=code,retrievedAt=TODAY,updatedAt=updated,series=series,status=status,countrySources=country_sources,notes=point_notes,metadata=meta)
  (ROOT/f'public/data/history/{code}.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n');results.append(meta);print(code,len(series),observations,flush=True)
 INDEX=json.loads(INDEX_PATH.read_text());found={m['id']:m for m in INDEX['indicators']}
 for row in results:found[row['id']]=row
 INDEX['indicators']=list(found.values());INDEX['observations']=sum(i['observations'] for i in found.values());INDEX['period']=[1960,2025];INDEX['retrievedAt']=TODAY
 INDEX_PATH.write_text(json.dumps(INDEX,ensure_ascii=False,indent=2)+'\n')
