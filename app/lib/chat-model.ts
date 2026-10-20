export const CHAT_WINDOW_MS=48*3600000;
export const CHAT_INTERVAL_MS=60000;
export const CHAT_MAX_WORDS=200;
export const CHAT_MAX_IMAGE_BYTES=2*1024*1024;
export const CHAT_NOTICE='Chat temporanea, riservata ai membri IR2. Messaggi e immagini restano soltanto nella memoria del server: non vengono scritti nel database né in un archivio della chat. Tutte le stanze si azzerano insieme ogni 48 ore; un riavvio del servizio può svuotarle prima. La traduzione automatica può inviare il testo a Google Translate o MyMemory, con le sue condizioni di trattamento: scegli Lingua originale per evitarlo. Polis-Rossa non archivia le traduzioni della chat. Il forum conserva invece discussioni e commenti. Chi legge può comunque copiare o fotografare ciò che vede.';
/** URLs count as one word; Unicode segmentation handles languages without spaces. */
export function chatWordCount(value:string){const input=value.replace(/https?:\/\/[^\s<>]+/gu,' link ');return [...new Intl.Segmenter(undefined,{granularity:'word'}).segment(input)].filter(part=>part.isWordLike).length;}
export type ChatMessage={id:string;room:string;author:string;body:string;language:string;createdAt:number;expiresAt:number;sequence:number;image?:{url:string;type:string};own:boolean};
export type ChatBoard={rooms:{id:string;name:string;description:string}[];room:string;messages:ChatMessage[];serverNow:number;expiresAt:number;nextSendAt:number;previousBefore:number|null;notice:string;instance:string};
