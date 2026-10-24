import type {View} from './view-navigation';

/** The PolisRossa information architecture, reusable without sharing its content or identity. */
export const NODE_PRIMARY_TABS = [
 {id:'notizie',label:'La rassegna'},
 {id:'teoria',label:'Biblioteca'},
 {id:'partecipa',label:'Agorà'},
] as const satisfies ReadonlyArray<{id:View;label:string}>;

export function thematicNodeTabHref(space:'agora'|'polisrossa',tab:(typeof NODE_PRIMARY_TABS)[number]['id']):string {
 if(space==='agora')return tab==='notizie'?'/agora':tab==='teoria'?'/agora?view=biblioteca':'/agora?view=partecipa';
 return tab==='notizie'?'/polisrossa':`/polisrossa?view=${tab}`;
}
