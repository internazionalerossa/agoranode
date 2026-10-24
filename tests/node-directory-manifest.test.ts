import assert from 'node:assert/strict';
import {test} from 'node:test';
import {LOCAL_SPACES,publicLocalSpaces,validateLocalSpaces} from '../app/instances/registry';

test('directory entries remain derived from neutral node manifests',()=>{
 assert.equal(validateLocalSpaces(),true);
 const projected=publicLocalSpaces();
 assert.equal(projected.length,LOCAL_SPACES.length);
 for(const item of projected){
  const source=LOCAL_SPACES.find(space=>space.manifest.instance.id===item.id);
  assert.ok(source);
  assert.equal(item.href,source.href);
  assert.equal(item.name,source.manifest.instance.name);
  assert.equal(item.topic,source.manifest.instance.topic);
  assert.deepEqual(item.modules,Object.values(source.manifest.capabilities).filter(capability=>capability.status==='implemented').map(capability=>capability.label));
  assert.deepEqual(item.plannedModules,Object.values(source.manifest.capabilities).filter(capability=>capability.status!=='implemented').map(capability=>capability.label));
 }
 assert.equal(projected.find(node=>node.id==='agora')?.availability,'preview');
 assert.equal(projected.find(node=>node.id==='polisrossa')?.availability,'local-runtime');
});
