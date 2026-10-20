import test from 'node:test';
import assert from 'node:assert/strict';
import LANGUAGES from '../app/data/languages.json' with {type:'json'};
import {BRAND_RED,brandName,brandColour,localizeBrand,translateAroundBrand} from '../app/lib/brand.ts';
import {brandManifestResponse} from '../app/lib/brand-manifest.ts';

test('every supported reading language has a local wordmark and Polis remains invariant',()=>{
 for(const code of Object.keys(LANGUAGES)){
  assert.ok(BRAND_RED[code],code);
  assert.equal(brandName(code),'Polis'+BRAND_RED[code]);
 }
 assert.equal(brandName('it-IT'),'PolisRossa');assert.equal(brandName('en-US'),'PolisRed');
 assert.equal(brandName('fr'),'PolisRouge');assert.equal(brandName('es'),'PolisRoja');
 assert.equal(brandColour('zh-Hant-TW'),'紅色');assert.equal(brandName('unknown'),'PolisRed');
 assert.equal(localizeBrand('La comunità di PolisRossa. PolisRossa informa.','de'),'La comunità di PolisRot. PolisRot informa.');
});
test('installed-app metadata follows the reading language and keeps a stable app identity',async()=>{
 const manifests=await Promise.all(['it','en','zh-Hant'].map(async language=>{
  const response=brandManifestResponse(new Request('https://example.test/api/manifest?language='+language));
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/manifest+json');
  return response.json();
 }));
 assert.deepEqual(manifests.map(item=>item.name),['PolisRossa','PolisRed','Polis紅色']);
 for(const item of manifests){assert.equal(item.id,'/');assert.equal(item.start_url,'/');assert.equal(item.scope,'/');}
 for(const query of ['language=it&language=en','language=it&url=https://example.com','language=%3Cscript%3E'])assert.equal(brandManifestResponse(new Request('https://example.test/api/manifest?'+query)).status,400);
 assert.equal(brandManifestResponse(new Request('https://example.test/api/manifest',{method:'POST'})).status,405);
});
test('automatic translation never receives the brand and a failed phrase cannot silently disappear',async()=>{
 const seen=[];
 const translated=await translateAroundBrand('Prima PolisRossa dopo PolisRossa.',async part=>{seen.push(part);return '['+part+']';});
 assert.deepEqual(seen,['Prima ',' dopo ','.']);
 assert.equal(translated,'[Prima ]PolisRossa[ dopo ]PolisRossa[.]');
 assert.equal(await translateAroundBrand('PolisRossa',async()=>{throw Error('no provider needed');}),'PolisRossa');
 assert.equal(await translateAroundBrand('PolisRossa testo',async()=>null),null);
});
