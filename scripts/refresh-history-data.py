"""Refresh documented World Bank additions. Missing observations are omitted, never imputed."""
import concurrent.futures,datetime,json,math,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
INDEX_PATH=ROOT/'app/data/history-world-index.json'
INDEX=json.loads(INDEX_PATH.read_text())
COUNTRIES={c['id'] for c in INDEX['countries']}
TODAY=datetime.datetime.now(datetime.timezone.utc).date().isoformat()

def fetch_json(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url,timeout=50) as response:return json.load(response)
        except Exception:
            if attempt==2:raise
            time.sleep(attempt+1)

def acquire(spec):
    code,label,theme,unit=spec
    meta=fetch_json(f'https://api.worldbank.org/v2/indicator/{code}?format=json')[1][0]
    api=f'https://api.worldbank.org/v2/country/all/indicator/{code}?date=1960:2025&format=json&per_page=20000'
    response=fetch_json(api)
    if len(response)<2 or not response[1]:raise ValueError('No observations '+code)
    if response[0]['pages']!=1:raise ValueError('Incomplete paginated response '+code)
    series={}
    for row in response[1]:
        value=row['value'];country=row['countryiso3code'];year=int(row['date'])
        if country in COUNTRIES and value is not None and math.isfinite(value) and 1960<=year<=2025:series.setdefault(country,[]).append([year,value])
    for values in series.values():values.sort()
    if not series:raise ValueError('No usable country series '+code)
    observations=sum(map(len,series.values()))
    data=dict(indicator=code,retrievedAt=TODAY,updatedAt=response[0]['lastupdated'],series=series)
    metadata=dict(id=code,label=label,theme=theme,unit=unit,definition=meta['sourceNote'] or meta['name'],definitionLanguage='en',organization=meta['sourceOrganization'] or 'Banca Mondiale · Education Statistics (EdStats)',provider='Banca Mondiale',source=f'https://data.worldbank.org/indicator/{code}',api=api,countries=len(series),observations=observations,updatedAt=data['updatedAt'],period=[min(v[0][0] for v in series.values()),max(v[-1][0] for v in series.values())])
    (ROOT/f'public/data/history/{code}.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
    print(code,len(series),observations,flush=True)
    return metadata

if __name__=='__main__':
    specs=json.loads((ROOT/'app/data/history-extra-indicators.json').read_text())
    results=[];errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures={executor.submit(acquire,spec):spec[0] for spec in specs}
        for future in concurrent.futures.as_completed(futures):
            try:results.append(future.result())
            except Exception as error:errors.append((futures[future],str(error)))
    INDEX=json.loads(INDEX_PATH.read_text())
    found={row['id']:row for row in INDEX['indicators']}
    for row in results:found[row['id']]=row
    INDEX['indicators']=list(found.values());INDEX['observations']=sum(row['observations'] for row in found.values());INDEX['period']=[1960,2025];INDEX['retrievedAt']=TODAY
    INDEX_PATH.write_text(json.dumps(INDEX,ensure_ascii=False,indent=2)+'\n')
    print('Failed acquisitions:',errors,flush=True)
    if errors:raise SystemExit(1)
