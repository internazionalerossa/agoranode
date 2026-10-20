"use client";
import {Fragment,useEffect,useRef,useState} from 'react';
import {useContentLanguage,LocalizedText as T} from './Localization';
import {translateTransientText} from '@/app/lib/transient-translation';
/** User text remains text, with safe links and a translation held only by the mounted paragraph. */
export default function DiscussionText({text,language='it',expiresAt,inline=false,links=true}:{text:string;language?:string;expiresAt?:number;inline?:boolean;links?:boolean}){
 const Tag=inline?'span':'div';return <Tag className="discussion-rich-text">{text.split(/\n\s*\n/u).filter(Boolean).map((paragraph,index)=><Paragraph key={index} text={paragraph} language={language} expiresAt={expiresAt} inline={inline} links={links}/>)}</Tag>;
}
function Paragraph({text,language,expiresAt,inline,links}:{text:string;language:string;expiresAt?:number;inline:boolean;links:boolean}){
 const preferences=useContentLanguage(),anchor=useRef<HTMLElement|null>(null);const [visible,setVisible]=useState(false),[result,setResult]=useState<{key:string;value:string|null}|null>(null);const key=language+'|'+preferences.language+'|'+text;
 useEffect(()=>{if(!anchor.current||typeof IntersectionObserver==='undefined'){setVisible(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'120px'});observer.observe(anchor.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(preferences.original||!visible||language===preferences.language||expiresAt!==undefined&&expiresAt<=Date.now())return;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),Math.max(1,Math.min(45000,(expiresAt??Infinity)-Date.now())));void translateTransientText(text,language,preferences.language,controller.signal).then(value=>{if(!controller.signal.aborted)setResult({key,value});});return()=>{controller.abort();clearTimeout(timeout);};},[text,language,preferences.language,preferences.original,visible,key,expiresAt]);
 const translated=!preferences.original&&result?.key===key?result.value:null,output=translated??text;
 const pattern=/(https?:\/\/[^\s<>]+|\/(?:\?view=|read\?)[^\s<>]+|#[\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;const parts=[];let position=0;
 for(const match of links?output.matchAll(pattern):[]){const raw=match[0],url=raw.replace(/[.,;!?\])}]+$/u,'');parts.push(<Fragment key={match.index}>{output.slice(position,match.index)}<a href={url} target={url.startsWith('http')?'_blank':undefined} rel="noopener noreferrer ugc nofollow" referrerPolicy="no-referrer">{url}</a>{raw.slice(url.length)}</Fragment>);position=match.index+raw.length;}parts.push(output.slice(position));
 const Tag=inline?'span':'p';return <Tag ref={element=>{anchor.current=element;}} lang={translated?preferences.language:language} dir="auto">{parts}{!preferences.original&&language!==preferences.language&&result?.key===key&&result.value===null&&<small className="discussion-translation-status"><T>Originale · traduzione non disponibile</T></small>}</Tag>;
}
