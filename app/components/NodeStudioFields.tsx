"use client";
import type {NodeBlueprintDraft,NodeBlockKind} from '../lib/node-studio-model';
import {NODE_BLOCK_KINDS} from '../lib/node-studio-model';
const TITLES:Record<NodeBlockKind,string>={
  heading:'Titolo o capitolo',paragraph:'Paragrafo',timeline:'Tappa narrativa',
  source:'Fonte',book:'Opera o edizione',video:'Video',data:'Dati e grafici',
};
export function StudioBlocks({draft,update}:{draft:NodeBlueprintDraft;update:(patch:Partial<NodeBlueprintDraft>)=>void}){
  const add=(kind:NodeBlockKind)=>update({blocks:[...draft.blocks,{
    id:crypto.randomUUID(),kind,title:TITLES[kind],body:'',url:'',
  }]});
  const change=(id:string,patch:Partial<NodeBlueprintDraft['blocks'][number]>)=>
    update({blocks:draft.blocks.map(block=>block.id===id?{...block,...patch}:block)});
  const move=(id:string,direction:-1|1)=>{
    const result=[...draft.blocks],from=result.findIndex(b=>b.id===id),to=from+direction;
    if(from<0||to<0||to>=result.length)return;
    [result[from],result[to]]=[result[to],result[from]];
    update({blocks:result});
  };
  return <fieldset className="node-studio-group">
    <legend>03 · Pagine, wiki, timeline e contenuti</legend>
    <p>Combina blocchi di testo, fonti, libri, video e tappe con brevi racconti introduttivi.</p>
    {draft.blocks.map((block,i)=><div className="node-studio-block" key={block.id}>
      <div className="node-studio-block-actions">
        <strong>{i+1}. {TITLES[block.kind]}</strong>
        <button type="button" aria-label="Sposta sopra" disabled={i===0} onClick={()=>move(block.id,-1)}>↑</button>
        <button type="button" aria-label="Sposta sotto" disabled={i===draft.blocks.length-1} onClick={()=>move(block.id,1)}>↓</button>
        <button type="button" onClick={()=>update({blocks:draft.blocks.filter(b=>b.id!==block.id)})}>Rimuovi</button>
      </div>
      <label>Titolo <input maxLength={160} value={block.title} onChange={e=>change(block.id,{title:e.target.value})}/></label>
      <label>{block.kind==='timeline'?'Introduzione narrativa e periodo':'Testo e contesto'}
        <textarea rows={3} maxLength={4000} value={block.body} onChange={e=>change(block.id,{body:e.target.value})}/>
      </label>
      <label>Link alla fonte originale, HTTPS (facoltativo)
        <input type="url" maxLength={1200} value={block.url} onChange={e=>change(block.id,{url:e.target.value})}/>
      </label>
    </div>)}
    <div className="node-studio-add">{NODE_BLOCK_KINDS.map(kind=>
      <button type="button" key={kind} disabled={draft.blocks.length>=80} onClick={()=>add(kind)}>+ {TITLES[kind]}</button>)}</div>
  </fieldset>;
}
export function StudioSources({draft,update}:{draft:NodeBlueprintDraft;update:(patch:Partial<NodeBlueprintDraft>)=>void}){
 return <fieldset className="node-studio-group"><legend>02 · Fonti da proporre</legend>
   <p>Le fonti non vengono scaricate automaticamente. Un revisore dovrà verificarle prima di attivarle per la comunità.</p>
   {draft.sources.map((source,i)=><div key={source.id} className="node-studio-block">
     <strong>Fonte {i+1}</strong>
     <label>Nome <input value={source.name} maxLength={140} onChange={e=>update({sources:draft.sources.map(x=>x.id===source.id?{...x,name:e.target.value}:x)})}/></label>
     <label>Sito ufficiale HTTPS <input type="url" value={source.homepage} maxLength={1200} onChange={e=>update({sources:draft.sources.map(x=>x.id===source.id?{...x,homepage:e.target.value}:x)})}/></label>
     <label>RSS/Atom HTTPS (facoltativo) <input type="url" value={source.feedUrl} maxLength={1200} onChange={e=>update({sources:draft.sources.map(x=>x.id===source.id?{...x,feedUrl:e.target.value}:x)})}/></label>
     <button type="button" onClick={()=>update({sources:draft.sources.filter(x=>x.id!==source.id)})}>Rimuovi fonte</button>
   </div>)}
   <button type="button" disabled={draft.sources.length>=30} onClick={()=>update({sources:[...draft.sources,{
     id:'fonte-'+crypto.randomUUID().slice(0,8),name:'Nuova fonte',homepage:'',feedUrl:'',
   }]})}>+ Aggiungi una fonte</button>
 </fieldset>;
}
