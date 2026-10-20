'use client';
import {useEffect,useState} from 'react';
export default function MirrorNotice(){
 const [mirror,setMirror]=useState(false);
 useEffect(()=>{const controller=new AbortController();void fetch('/api/service-info',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(!controller.signal.aborted)setMirror(data?.mirror===true);}).catch(()=>{});return()=>controller.abort();},[]);
 return mirror?<aside role="note" style={{maxWidth:'1080px',margin:'0 auto',padding:'0.75rem',fontSize:'0.875rem'}}>Copia pubblica indipendente di PolisRossa. Questo server non gestisce account, raccolte private o partecipazione al forum.</aside>:null;
}
