import type {SourceDefinition} from '../data/catalog';

/** Auditable, fixed allowlist of upstream sources for the Agorà technology node.
 * Feeds and outbound video destinations belong to their original publishers;
 * their content is not automatically licensed for AgoraNode redistribution.
 */
export const AGORA_SOURCES: readonly SourceDefinition[] = [
 {id:'agora-github',name:'GitHub Blog',homepage:'https://github.blog/',
  feedUrls:['https://github.blog/feed/'],region:'Mondo',country:'Stati Uniti',
  language:'en',kind:'rivista',ideologies:[],tags:['software','open-source'],priority:90},
 {id:'agora-cncf',name:'Cloud Native Computing Foundation',homepage:'https://www.cncf.io/',
  feedUrls:['https://www.cncf.io/feed/'],region:'Mondo',country:'Stati Uniti',
  language:'en',kind:'istituzione',ideologies:[],tags:['infrastruttura','open-source'],priority:90},
 {id:'agora-mozilla',name:'Mozilla Hacks',homepage:'https://hacks.mozilla.org/',
  feedUrls:['https://hacks.mozilla.org/feed/'],region:'Mondo',country:'Stati Uniti',
  language:'en',kind:'rivista',ideologies:[],tags:['web','open-source'],priority:85},
 {id:'agora-kubernetes',name:'Kubernetes Blog',homepage:'https://kubernetes.io/blog/',
  feedUrls:['https://kubernetes.io/feed.xml'],region:'Mondo',country:'Mondo',
  language:'en',kind:'rivista',ideologies:[],tags:['distributed-systems','cloud-native'],priority:75},
 {id:'agora-linux-video',name:'Linux Foundation — video',homepage:'https://www.youtube.com/@Linuxfoundation',
  feedUrls:['https://www.youtube.com/feeds/videos.xml?channel_id=UCfX55Sx5hEFjoC3cNs6mCUQ'],
  region:'Mondo',country:'Stati Uniti',language:'en',kind:'video',
  ideologies:[],tags:['conferenze','open-source','video'],priority:75},
] as const;
export const AGORA_SOURCE_IDS=new Set(AGORA_SOURCES.map(source=>source.id));
export const AGORA_VIDEO_ARCHIVE=Object.freeze({
  name:'FOSDEM 2026 · registrazioni',
  url:'https://video.fosdem.org/2026/',
  description:'Conferenze e lezioni tecniche registrate. Si aprono sull’archivio originale.',
});
export const AGORA_LIVE_DESTINATION=Object.freeze({
  name:'Linux Foundation · dirette e prossimi eventi',
  url:'https://www.youtube.com/@Linuxfoundation/streams',
  description:'Consulta il canale originale per verificare se una trasmissione è realmente in diretta.',
});
