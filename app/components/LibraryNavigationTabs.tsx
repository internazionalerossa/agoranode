import type {ReactNode} from 'react';
import type {LibraryDestination,TimelineDisplay} from '../lib/thematic-library-navigation';
import {THEMATIC_LIBRARY_DESTINATIONS} from '../lib/thematic-library-navigation';

/**
 * Only the Biblioteca section uses these nested navigators.
 * The site's Rassegna/Video/Agorà navigation remains outside this component.
 */
export function LibraryPrimaryTabs({
 destination,href,
}:{
 destination:LibraryDestination;
 href:(destination:LibraryDestination)=>string;
}){
 return <nav className="library-destinations thematic-library-destinations" aria-label="Sezioni della biblioteca">
  {THEMATIC_LIBRARY_DESTINATIONS.map(item=><a key={item.id} href={href(item.id)}
     aria-current={destination===item.id?'page':undefined}>
   <strong>{item.label}</strong><span>{item.description}</span>
   <span className="thematic-library-direction" aria-hidden="true">↗</span>
  </a>)}
 </nav>;
}
export function LibraryTimelineTabs({
 mode,href,
}:{
 mode:TimelineDisplay;
 href:(mode:TimelineDisplay)=>string;
}){
 return <nav className="library-timeline-options" aria-label="Scegli come esplorare Timeline e Atlante">
  <a href={href('racconto')} aria-current={mode==='racconto'?'page':undefined}>
   <strong>Timeline</strong><span>Leggi il percorso narrativo, tappa dopo tappa</span>
  </a>
  <a href={href('indice')} aria-current={mode==='indice'?'page':undefined}>
   <strong>Atlante · Indice e ricerca</strong><span>Cerca e apri tutte le voci, anche quelle fuori dalla timeline</span>
  </a>
 </nav>;
}
