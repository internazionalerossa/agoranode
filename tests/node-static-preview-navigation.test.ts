import test from 'node:test';
import assert from 'node:assert/strict';
import {staticPreviewHref,staticPreviewVirtualUrl} from '../app/lib/static-preview-navigation';
import {siteRouteFromUrl} from '../app/lib/site-routing';

const origin='https://agoranode-alpha-preview.onrender.com';
test('Render static preview routes every real page through its served root, preserving view state',()=>{
 const paths=[
  ['/agora','agora'],
  ['/agora?view=biblioteca&sezione=timeline&modalita=indice','agora'],
  ['/agora?view=partecipa','agora'],
  ['/polisrossa','instance'],
  ['/polisrossa?view=teoria&percorso=timeline&modalita=indice','instance'],
  ['/polisrossa/read?book=manifesto&edition=it','reader'],
  ['/n/storia-locale?view=biblioteca&sezione=timeline','thematic-node'],
 ];
 for(const [path,kind] of paths){
  const preview=staticPreviewHref(path,origin);
  assert.ok(preview?.startsWith('/?previewPath='),path);
  assert.equal(new URL(preview!,origin).pathname,'/');
  const virtual=staticPreviewVirtualUrl(new URL(preview!,origin).href);
  const route=siteRouteFromUrl(virtual);
  assert.equal(route.kind,kind,path);
  assert.equal(new URL(virtual).pathname,new URL(path,origin).pathname);
  assert.equal(new URL(virtual).search,new URL(path,origin).search);
 }
});
test('static preview rejects external/API/unsafe routes, preserving real links',()=>{
 assert.equal(staticPreviewHref('https://example.org/evil',origin),null);
 assert.equal(staticPreviewHref('/api/community/forum',origin),null);
 assert.equal(staticPreviewHref('/assets/index.js',origin),null);
 assert.equal(staticPreviewHref('/not-found',origin),null);
 assert.equal(staticPreviewHref('/#node-directory-content',origin),null);
 assert.equal(staticPreviewVirtualUrl(origin+'/?previewPath=https%3A%2F%2Fevil.test'),origin+'/?previewPath=https%3A%2F%2Fevil.test');
});
test('historic root links and already transformed preview links preserve their destination',()=>{
 const old=staticPreviewHref('/?view=teoria&evento=haymarket-1886',origin);
 assert.ok(old);
 assert.equal(siteRouteFromUrl(staticPreviewVirtualUrl(origin+old)).kind,'instance');
 const direct=staticPreviewHref('/agora?view=biblioteca',origin);
 assert.equal(staticPreviewHref(direct!,origin),direct);
});
