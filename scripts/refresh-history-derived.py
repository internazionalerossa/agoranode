"""Rebuild strictly matched derived series. Never treat a missing component as zero."""
import datetime,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
DATA=ROOT/'public/data/history';INDEX_PATH=ROOT/'app/data/history-world-index.json'
def load(code):return json.loads((DATA/(code+'.json')).read_text())
def sum_complete(components):
 series={}
 for country in set.intersection(*(set(d['series']) for d in components)):
  maps=[dict(d['series'][country]) for d in components]
  years=set.intersection(*(set(m) for m in maps))
  if years:series[country]=[[year,sum(m[year] for m in maps)] for year in sorted(years)]
 return series
if __name__=='__main__':
 index=json.loads(INDEX_PATH.read_text());meta={m['id']:m for m in index['indicators']}
 components=[load('ESTAT.'+field+'.GRAD') for field in ['SCIENCE','ICT','ENGINEERING']]
 code='ESTAT.STEM.GRAD.TOTAL';series=sum_complete(components);status={}
 for country,points in series.items():
  for year,_ in points:
   flags=sorted(set(d.get('status',{}).get(country,{}).get(str(year),'') for d in components)-{''})
   if flags:status.setdefault(country,{})[str(year)]=';'.join(flags)
 m={**meta['ESTAT.ENGINEERING.GRAD'],'id':code,'label':'Diplomati STEM: numero complessivo nell’anno','definition':'Somma dei diplomati dell’istruzione superiore nei campi disgiunti ISCED-F 05 (scienze naturali, matematica e statistica), 06 (ICT) e 07 (ingegneria, manifattura e costruzioni). Sono inclusi soltanto paese e anno con tutte e tre le componenti disponibili. Flusso annuale di diplomati, non totale dei professionisti STEM occupati.','components':[d['indicator'] for d in components],'filters':{'isced11':'ED5-8','sex':'T','unit':'NR','iscedf13':['F05','F06','F07']},'api':'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/educ_uoe_grad02?lang=EN&unit=NR&isced11=ED5-8&sex=T&iscedf13=F05&iscedf13=F06&iscedf13=F07','transformation':'Sum F05 + F06 + F07, only complete country-year observations'}
 data=dict(indicator=code,retrievedAt=datetime.date.today().isoformat(),updatedAt=components[0]['updatedAt'],series=series,status=status,metadata=m)
 m['countries']=len(series);m['observations']=sum(map(len,series.values()));m['period']=[min(v[0][0] for v in series.values()),max(v[-1][0] for v in series.values())]
 (DATA/(code+'.json')).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n');meta[code]=m
 # Private consumption per resident, in the same year, without turning it into a wage measure.
 numerator=load('NE.CON.PRVT.PP.KD');population=load('SP.POP.TOTL');series={}
 for country in set(numerator['series'])&set(population['series']):
  pop=dict(population['series'][country]);points=[[year,value/pop[year]] for year,value in numerator['series'][country] if pop.get(year,0)>0]
  if points:series[country]=points
 code='DERIVED.CONSUMPTION.PCAP.PPP';m={**meta['NE.CON.PRVT.PP.KD'],'id':code,'label':'Consumi privati per abitante a parità di potere d’acquisto','unit':'Dollari internazionali costanti 2021 per abitante','definition':'Consumi finali delle famiglie e delle istituzioni senza scopo di lucro al servizio delle famiglie, in PPP a prezzi costanti 2021, divisi per la popolazione dello stesso paese e anno. Non è salario, reddito disponibile individuale o consumo mediano; non include nello stesso modo i servizi collettivi finanziati direttamente dallo Stato.','definitionLanguage':'it','components':['NE.CON.PRVT.PP.KD','SP.POP.TOTL'],'countries':len(series),'observations':sum(map(len,series.values())),'period':[min(v[0][0] for v in series.values()),max(v[-1][0] for v in series.values())],'transformation':'Private consumption PPP / population, matched country and year, positive denominator'}
 data=dict(indicator=code,retrievedAt=datetime.date.today().isoformat(),updatedAt=numerator['updatedAt'],series=series,metadata=m);(DATA/(code+'.json')).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n');meta[code]=m
 index['indicators']=sorted(meta.values(),key=lambda m:(m['theme'],m['label']));index['observations']=sum(m['observations'] for m in meta.values());INDEX_PATH.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
 print(len(meta),'indicators,',index['observations'],'observations')
