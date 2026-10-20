import { TOPIC_TAXONOMY } from '../data/catalog.ts';
const fold=(text:string)=>text.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
const stems=['sindac','precar','femmin','antifasc','ecolog','ambient','colonial','imperial','capital','scioper','lavorator'];
const words=(text:string)=>fold(text).match(/[\p{L}\p{N}]+/gu)??[];
const rules=TOPIC_TAXONOMY.map(topic=>{
 const exact=new Set<string>(),prefixes=new Set<string>(),phrases=new Set<string>();
 for(const keyword of topic.keywords){const tokens=words(keyword);if(tokens.length>1)phrases.add(' '+tokens.join(' ')+' ');else if(tokens.length){const stem=stems.find(stem=>tokens[0]!.startsWith(stem));if(stem)prefixes.add(stem);else exact.add(tokens[0]!);}}
 return {id:topic.id,exact:[...exact],prefixes:[...prefixes],phrases:[...phrases]};
});
/** Classify item text, never publisher tags; whole words avoid matching “war” in “software”. */
export function articleTopics(article:{title:string;excerpt?:string;categories?:string[]}){
 const tokens=words([article.title,article.excerpt??'',...(article.categories??[])].join(' '));
 const unique=new Set(tokens),text=' '+tokens.join(' ')+' ';
 return rules.filter(rule=>rule.exact.some(word=>unique.has(word))||rule.prefixes.some(prefix=>tokens.some(word=>word.startsWith(prefix)))||rule.phrases.some(phrase=>text.includes(phrase))).map(rule=>rule.id);
}
