import test from 'node:test';
import assert from 'node:assert/strict';
import LANGUAGES from '../app/data/languages.json' with {type:'json'};
import {BRAND_RED,brandName,brandColour,localizeBrand,translateAroundBrand} from '../app/lib/brand.ts';
import {brandManifestResponse} from '../app/lib/brand-manifest.ts';

test('every supported reading language has a local wordmark and Polis remains invariant',()=>{
 for(const code of Object.keys(LANGUAGES)){
  assert.ok(BRAND_RED[code],code);
  assert.equal(brandName(code),'Polis-'+BRAND_RED[code]);
 }
 assert.equal(brandName('it-IT'),'Polis-Rossa');assert.equal(brandName('en-US'),'Polis-Red');
 assert.equal(brandName('fr'),'Polis-Rouge');assert.equal(brandName('es'),'Polis-Roja');
 assert.equal(brandColour('zh-Hant-TW'),'紅色');assert.equal(brandName('unknown'),'Polis-Red');
 assert.equal(localizeBrand('La comunità di Polis-Rossa. Polis-Rossa informa.','de'),'La comunità di Polis-Rot. Polis-Rot informa.');
});
test('installed-app metadata follows the reading language and keeps a stable app identity',async()=>{
 const manifests=await Promise.all(['it','en','zh-Hant'].map(async language=>{
  const response=brandManifestResponse(new Request('https://example.test/api/manifest?language='+language));
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/manifest+json');
  return response.json();
 }));
 assert.deepEqual(manifests.map(item=>item.name),['Polis-Rossa','Polis-Red','Polis-紅色']);
 for(const item of manifests){assert.equal(item.id,'/');assert.equal(item.start_url,'/');assert.equal(item.scope,'/');}
 for(const query of ['language=it&language=en','language=it&url=https://example.com','language=%3Cscript%3E'])assert.equal(brandManifestResponse(new Request('https://example.test/api/manifest?'+query)).status,400);
 assert.equal(brandManifestResponse(new Request('https://example.test/api/manifest',{method:'POST'})).status,405);
});
test('automatic translation never receives the brand and a failed phrase cannot silently disappear',async()=>{
 const seen=[];
 const translated=await translateAroundBrand('Prima Polis-Rossa dopo Polis-Rossa.',async part=>{seen.push(part);return '['+part+']';});
 assert.deepEqual(seen,['Prima ',' dopo ','.']);
 assert.equal(translated,'[Prima ]Polis-Rossa[ dopo ]Polis-Rossa[.]');
 assert.equal(await translateAroundBrand('Polis-Rossa',async()=>{throw Error('no provider needed');}),'Polis-Rossa');
 assert.equal(await translateAroundBrand('Polis-Rossa testo',async()=>null),null);
});
