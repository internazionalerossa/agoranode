import test from 'node:test';
import assert from 'node:assert/strict';
import {attachReaderNavigation} from '../app/lib/reader-navigation.ts';
function fixture(){
 const host=new EventTarget(),dialog=new EventTarget(),entries=[{route:'news'}];let index=0,dismissals=0;
 host.document={body:{style:{overflow:'auto'}}};
 host.history={get state(){return entries[index];},pushState(state){entries.splice(index+1);entries.push(state);index++;},replaceState(state){entries[index]=state;},back(){index=Math.max(0,index-1);host.dispatchEvent(new Event('popstate'));}};
 dialog.open=false;dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new Event('close'));};
 return {host,dialog,entries,attach:()=>attachReaderNavigation(dialog,()=>dismissals++,host),dismissals:()=>dismissals};
}
test('phone Back closes the reader, restores scrolling and retains the news route',()=>{
 const f=fixture();const cleanup=f.attach();assert.equal(f.dialog.open,true);assert.equal(f.host.document.body.style.overflow,'hidden');assert.equal(f.entries.length,2);
 f.host.history.back();assert.equal(f.dialog.open,false);assert.equal(f.dismissals(),1);assert.deepEqual(f.host.history.state,{route:'news'});assert.equal(f.host.document.body.style.overflow,'auto');cleanup();assert.equal(f.dismissals(),1);
});
test('close button or Escape removes the reader history entry once and restores focusable page',()=>{
 const f=fixture();f.attach();f.dialog.close();assert.equal(f.dismissals(),1);assert.deepEqual(f.host.history.state,{route:'news'});assert.equal(f.host.document.body.style.overflow,'auto');
});
test('unmount releases modal and scroll lock without dismissing another route',()=>{
 const f=fixture();const cleanup=f.attach();f.host.history.pushState({route:'library'},'');cleanup();assert.equal(f.dialog.open,false);assert.deepEqual(f.host.history.state,{route:'library'});assert.equal(f.dismissals(),0);assert.equal(f.host.document.body.style.overflow,'auto');
});
