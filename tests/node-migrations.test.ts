import test from 'node:test';
import assert from 'node:assert/strict';
import {migrationDigests} from '../server/migrations';

test('migration identity is stable across LF and CRLF checkouts',()=>{
 const lf='CREATE TABLE example (id integer);\n-- comment\n';
 const crlf=lf.replace(/\n/g,'\r\n');
 const unix=migrationDigests(lf),windows=migrationDigests(crlf);
 assert.equal(unix.canonical,windows.canonical);
 assert.equal(windows.compatible.has(unix.canonical),true);
 for(const legacy of windows.compatible)assert.equal(unix.compatible.has(legacy),true);
});

test('migration identity still rejects SQL content changes',()=>{
 const original=migrationDigests('SELECT 1;\n');
 const changed=migrationDigests('SELECT 2;\n');
 assert.equal(original.compatible.has(changed.canonical),false);
});
