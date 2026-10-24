import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve('dist-preview');
const version=JSON.parse(await readFile(resolve(root,'version.json'),'utf8'));
assert.equal(version.format,'org.agoranode.static-preview-version.v1');
assert.equal(version.preview,true);
const expected=process.env.RENDER_GIT_COMMIT??process.env.GITHUB_SHA;
if(expected)assert.equal(version.commit,expected.toLowerCase());
for(const route of ['','agora','polisrossa','polisrossa/read','polisrossa/account','account','read']){
  const file=resolve(root,route,'index.html');
  assert.ok((await stat(file)).isFile(),file);
  const html=await readFile(file,'utf8');
  assert.match(html,/<div id="root"><\/div>/);
  assert.match(html,/assets\/index-/);
}
// A static preview must never turn arbitrary API paths into index.html.
const redirects=await readFile(resolve(root,'_redirects'),'utf8');
assert.doesNotMatch(redirects,/^\s*\/\*\s+\/index\.html\s+200/m);
console.log('Static preview artifacts verified: version, 7 routes, no global API fallback');
