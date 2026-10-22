import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseTarget,openSpaceDatabaseRegistry,validateSpaceDatabaseInputs} from '../server/space-databases';

test('two communities must have separate PostgreSQL database targets, not just different credentials', async () => {
  const config=[
    {spaceId:'agora',connectionString:'postgres://user:secret@db.local:5432/agora'},
    {spaceId:'polisrossa',connectionString:'postgresql://another:other@db.local/polisrossa'},
  ];
  validateSpaceDatabaseInputs(config);
  assert.equal(databaseTarget(config[0].connectionString),'db.local:5432/agora');
  assert.equal(databaseTarget(config[1].connectionString),'db.local:5432/polisrossa');
  const ended:string[]=[];
  const registry=openSpaceDatabaseRegistry(config,uri=>({uri,async end(){ended.push(uri);}}));
  assert.deepEqual(registry.ids(),['agora','polisrossa']);
  assert.notEqual(registry.get('agora'),registry.get('polisrossa'));
  assert.equal(registry.get('polisrossa').uri,config[1].connectionString);
  assert.throws(()=>registry.get('unknown'),/Unknown community/);
  await registry.close();
  assert.equal(ended.length,2);
});

test('fail closed for shared database, duplicate space ID, invalid names and unsupported targets', () => {
  const common={spaceId:'agora',connectionString:'postgres://user@db.local/agora'};
  for(const value of [
    [{...common},{spaceId:'polisrossa',connectionString:'postgresql://other:secret@DB.LOCAL:5432/agora'}],
    [common,{...common,connectionString:'postgres://user@other.local/different'}],
  ]) assert.throws(()=>validateSpaceDatabaseInputs(value));
  for(const url of [
    'sqlite:///local.db','postgres://db.local','postgres://db.local/',
    'postgres://db.local/a%2Fb','not-a-url',
  ]) assert.throws(()=>databaseTarget(url));
  assert.throws(()=>validateSpaceDatabaseInputs([]));
  assert.throws(()=>validateSpaceDatabaseInputs([{spaceId:'../agora',connectionString:common.connectionString}]));
});
