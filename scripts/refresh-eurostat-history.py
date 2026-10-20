"""Download exactly filtered Eurostat JSON-stat series and retain observation flags.
Energy annual points are unweighted means of both published semesters; incomplete years are absent.
"""
import concurrent.futures,datetime,itertools,json,math,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
TODAY=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
INDEX=json.loads((ROOT/'app/data/history-world-index.json').read_text());GEO={c['iso2']:c['id'] for c in INDEX['countries']};GEO.update(EL='GRC',UK='GBR',XK='XKX')
SPECS=[
 ('ESTAT.ELECTRIC.EUR','nrg_pc_204',dict(siec='E7000',nrg_cons='KWH2500-4999',unit='KWH',tax='I_TAX',currency='EUR'),'Elettricità domestica: prezzo medio dei due semestri','Energia','Euro per kWh','Fascia DC: 2.500–4.999 kWh annui, imposte e oneri inclusi. Media aritmetica dei due prezzi semestrali: non è ponderata per i consumi. Non equivale alla spesa di una famiglia.','semesters'),
 ('ESTAT.ELECTRIC.PPS','nrg_pc_204',dict(siec='E7000',nrg_cons='KWH2500-4999',unit='KWH',tax='I_TAX',currency='PPS'),'Elettricità domestica: prezzo a potere d’acquisto comparabile','Energia','PPS per kWh','Fascia DC: 2.500–4.999 kWh annui, imposte incluse; media aritmetica dei due semestri completi. PPS è lo standard di potere d’acquisto Eurostat, non una valuta da pagare né il salario disponibile.','semesters'),
 ('ESTAT.GAS.EUR','nrg_pc_202',dict(siec='G3000',nrg_cons='GJ20-199',unit='KWH',tax='I_TAX',currency='EUR'),'Gas domestico: prezzo medio dei due semestri','Energia','Euro per kWh','Fascia D2: consumo annuo da 20 a meno di 200 GJ, prezzo per kWh, imposte incluse. Media aritmetica dei due semestri completi; non è ponderata per i consumi.','semesters'),
 ('ESTAT.GAS.PPS','nrg_pc_202',dict(siec='G3000',nrg_cons='GJ20-199',unit='KWH',tax='I_TAX',currency='PPS'),'Gas domestico: prezzo a potere d’acquisto comparabile','Energia','PPS per kWh','Fascia D2, da 20 a meno di 200 GJ annui, imposte incluse. Media aritmetica dei due semestri completi. PPS misura differenze generali nel livello dei prezzi, non il reddito di una famiglia.','semesters'),
 ('ESTAT.HOUSING.OVERBURDEN','ilc_lvho07a',dict(unit='PC',rskpovth='TOTAL',age='TOTAL',sex='T'),'Costo della casa superiore al 40% del reddito disponibile','Abitazione','Percentuale delle persone','Persone in famiglie nelle quali il costo totale dell’abitazione, al netto dei sussidi, supera il 40% del reddito disponibile al netto dei sussidi abitativi. Popolazione in famiglie private, tutti i sessi e tutte le età.','annual'),
 ('ESTAT.HOUSING.OVERBURDEN.POOR','ilc_lvho07a',dict(unit='PC',rskpovth='B_60',age='TOTAL',sex='T'),'Costo eccessivo della casa fra le persone a rischio di povertà','Abitazione','Percentuale delle persone a rischio di povertà','Stessa soglia del 40% per i costi abitativi, limitata alle persone con reddito equivalente sotto il 60% della mediana nazionale. La soglia di povertà è relativa al paese.','annual'),
 ('ESTAT.ENERGY.POVERTY','ilc_mdes01',dict(unit='PC',rskpovth='TOTAL',hhcomp='TOTAL'),'Persone che non possono riscaldare adeguatamente la casa','Abitazione','Percentuale delle persone','Incapacità economica dichiarata di mantenere l’abitazione adeguatamente calda, indagine EU-SILC. Non misura un prezzo unitario del gas e non coincide con ogni definizione di povertà energetica.','annual'),
 ('ESTAT.HOUSING.PRICES','prc_hpi_a',dict(unit='I15_A_AVG',purchase='TOTAL'),'Prezzi delle abitazioni: variazione rispetto al 2015','Abitazione','Indice 2015 = 100','Indice dei prezzi delle abitazioni nuove ed esistenti acquistate dalle famiglie. Indice nominale: descrive la variazione entro ciascun paese, non il prezzo in euro di una casa né un confronto diretto dei livelli fra paesi.','annual'),
 ('ESTAT.BOOK.READERS','ilc_scp27',dict(n_book='0',isced11='TOTAL',sex='T',age='Y_GE16',unit='PC'),'Adulti che hanno letto almeno un libro negli ultimi 12 mesi','Cultura e lettura','Percentuale delle persone di almeno 16 anni','Indicatore derivato come 100 meno la quota che non ha letto libri. EU-SILC, persone di almeno 16 anni in famiglie private, tutti i livelli di istruzione. Misura una quota, non il numero assoluto dei lettori; la rilevazione non è annuale.','complement'),
 ('ESTAT.BOOK.TEN','ilc_scp27',dict(n_book='GE10',isced11='TOTAL',sex='T',age='Y_GE16',unit='PC'),'Adulti che hanno letto almeno dieci libri negli ultimi 12 mesi','Cultura e lettura','Percentuale delle persone di almeno 16 anni','EU-SILC, persone di almeno 16 anni in famiglie private, tutti i livelli di istruzione. Lettura autodichiarata; la rilevazione non è annuale.','annual'),
 ('ESTAT.STEM.GRAD.RATE','educ_uoe_grad04',dict(unit='P_THAB',isced11='ED5-8',sex='T'),'Laureati STEM rispetto alla popolazione giovane','Istruzione e ricerca','Laureati ogni 1.000 abitanti di 20–29 anni','Diplomati dell’istruzione terziaria in scienze naturali, matematica e statistica, ICT, ingegneria, manifattura e costruzioni (ISCED-F 05, 06 e 07), rapportati alla popolazione di 20–29 anni. Il denominatore non limita l’età dei diplomati. Flusso annuo, non totale degli ingegneri occupati.','annual'),
 ('ESTAT.ACADEMIC.STAFF','educ_uoe_perp01',dict(unit='NR',isced11='ED5-8',age='TOTAL',sex='T'),'Personale docente e accademico dell’istruzione superiore','Istruzione e ricerca','Persone','Personale docente e accademico dei livelli ISCED 5–8, entrambi i sessi e tutte le età. Conteggio di persone, non equivalenti a tempo pieno; non identifica soltanto i professori ordinari.','annual'),
 ('ESTAT.ENGINEERING.GRAD','educ_uoe_grad02',dict(unit='NR',isced11='ED5-8',iscedf13='F07',sex='T'),'Diplomati in ingegneria, manifattura e costruzioni','Istruzione e ricerca','Diplomati nell’anno','Diplomati dell’istruzione superiore nel campo ISCED-F 07: ingegneria, attività manifatturiere e costruzioni. Campo più ampio della sola ingegneria. Flusso annuo, non numero di ingegneri presenti nel paese.','annual'),
 ('ESTAT.SCIENCE.GRAD','educ_uoe_grad02',dict(unit='NR',isced11='ED5-8',iscedf13='F05',sex='T'),'Diplomati in scienze naturali, matematica e statistica','Istruzione e ricerca','Diplomati nell’anno','Diplomati dell’istruzione superiore nel campo ISCED-F 05. Flusso annuale; una persona può conseguire più qualifiche nel tempo.','annual'),
 ('ESTAT.ICT.GRAD','educ_uoe_grad02',dict(unit='NR',isced11='ED5-8',iscedf13='F06',sex='T'),'Diplomati in tecnologie dell’informazione e comunicazione','Istruzione e ricerca','Diplomati nell’anno','Diplomati dell’istruzione superiore nel campo ISCED-F 06 (ICT). Flusso annuale, non consistenza degli specialisti occupati.','annual'),
 ('ESTAT.SCIENTISTS.ENGINEERS','hrst_st_ncat',dict(unit='THS_PER',category='SE',age='Y15-74',sex='T'),'Specialisti scientifici, sanitari e ICT occupati','Istruzione e ricerca','Migliaia di persone','Persone di 15–74 anni occupate come specialisti nelle scienze e nell’ingegneria e nelle professioni sanitarie e ICT, secondo l’aggregato occupazionale Eurostat SE. Le professioni sanitarie sono incluse: non è il conteggio dei soli ingegneri. Indagine sulle forze di lavoro; leggere le segnalazioni di discontinuità.','annual'),
]

def acquire(spec):
 code,ds,filters,label,theme,unit,definition,transform=spec
 query={'lang':'EN',**filters};api='https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/'+ds+'?'+urllib.parse.urlencode(query)
 with urllib.request.urlopen(api,timeout=70) as response:data=json.load(response)
 dims=data['id'];size=data['size'];categories=[list(sorted(data['dimension'][dim]['category']['index'],key=data['dimension'][dim]['category']['index'].get)) for dim in dims]
 # Every dimension except country and time must have been exactly selected.
 if any(n!=1 for dim,n in zip(dims,size) if dim not in ['geo','time']):raise ValueError('Ambiguous dimensions '+code)
 flags=data.get('status',{});series={};status={};semesters={}
 values=data.get('value',{})
 for flat,value in (enumerate(values) if isinstance(values,list) else values.items()):
  if value is None or not math.isfinite(value):continue
  n=int(flat);positions=[]
  for length in reversed(size):positions.insert(0,n%length);n//=length
  row={dim:categories[i][positions[i]] for i,dim in enumerate(dims)};country=GEO.get(row['geo']);period=row['time'];year=int(period[:4])
  if not country or year>2025 or year<1960:continue
  flag=flags.get(str(flat),'') if isinstance(flags,dict) else flags[int(flat)] or ''
  if transform=='semesters':semesters.setdefault(country,{}).setdefault(year,{})[period[-2:]]=(value,flag);continue
  point=100-value if transform=='complement' else value
  series.setdefault(country,[]).append([year,point]);
  if flag:status.setdefault(country,{})[str(year)]=flag
 for country,years in semesters.items():
  for year,parts in years.items():
   if 'S1' in parts and 'S2' in parts:
    series.setdefault(country,[]).append([year,(parts['S1'][0]+parts['S2'][0])/2]);flag=';'.join(sorted(set(f for _,f in parts.values() if f)))
    if flag:status.setdefault(country,{})[str(year)]=flag
 for points in series.values():points.sort()
 if not series:raise ValueError('No valid observations '+code)
 observations=sum(map(len,series.values()));period=[min(v[0][0] for v in series.values()),max(v[-1][0] for v in series.values())]
 result=dict(indicator=code,retrievedAt=TODAY,updatedAt=data.get('updated',TODAY),series=series,status=status)
 (ROOT/f'public/data/history/{code}.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
 print(code,len(series),observations,flush=True)
 metadata=dict(id=code,label=label,theme=theme,unit=unit,definition=definition,definitionLanguage='it',organization='Eurostat · '+data['label'],provider='Eurostat',source='https://ec.europa.eu/eurostat/databrowser/view/'+ds+'/default/table',api=api,filters=filters,transformation=transform,countries=len(series),observations=observations,updatedAt=result['updatedAt'],period=period,defaultCountries=[c for c in ['ITA','FRA','DEU','ESP'] if c in series])
 result['metadata']=metadata
 (ROOT/f'public/data/history/{code}.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
 return metadata

if __name__=='__main__':
 results=[];errors=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
  futures={ex.submit(acquire,s):s[0] for s in SPECS}
  for f in concurrent.futures.as_completed(futures):
   try:results.append(f.result())
   except Exception as e:errors.append((futures[f],str(e)))
 # Reload after parallel acquisition to avoid overwriting another import's updated index.
 INDEX=json.loads((ROOT/'app/data/history-world-index.json').read_text());found={i['id']:i for i in INDEX['indicators']}
 for row in results:found[row['id']]=row
 INDEX['indicators']=list(found.values());INDEX['observations']=sum(i['observations'] for i in found.values());INDEX['period']=[1960,2025];INDEX['retrievedAt']=TODAY
 (ROOT/'app/data/history-world-index.json').write_text(json.dumps(INDEX,ensure_ascii=False,indent=2)+'\n')
 print('Failed acquisitions:',errors,flush=True)
 if errors:raise SystemExit(1)
