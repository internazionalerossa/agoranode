import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('../', import.meta.url));
const KEY_DOCS=['README.md','README.en.md','docs/ALPHA-BASELINE.md'];

/** Regression check for onboarding documents, not an external URL crawler. */
test('developer landing pages only link to existing local documentation',()=>{
  let checked=0;
  for(const path of KEY_DOCS){
    const filename=resolve(ROOT,path);
    const markdown=readFileSync(filename,'utf8');
    for(const match of markdown.matchAll(/\[[^\]\n]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)){
      const link=match[1];
      if(!link || link.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(link))continue;
      const decoded=decodeURIComponent(link.split('#')[0].split('?')[0]);
      const target=resolve(dirname(filename),decoded);
      const location=relative(ROOT,target);
      assert.ok(location!==''&&!location.startsWith('..')&&!isAbsolute(location),
        path+': documentation link escapes the repository: '+link);
      assert.equal(existsSync(target),true,path+': broken local link: '+link);
      checked++;
    }
  }
  assert.ok(checked>=15,'developer-facing docs should contain useful verified local links');
});
