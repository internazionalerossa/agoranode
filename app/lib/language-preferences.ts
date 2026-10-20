import {normalizeLanguage} from './translation.ts';
export type LanguageChoices={interface:string;content:string};
export const LANGUAGE_PREFERENCES_KEY='internazionalerossa.language-preferences';
export function validLanguageChoice(value:unknown,content=false):value is string{return typeof value==='string'&&(value==='auto'||content&&value==='original'||/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(value));}
export function resolveLanguagePreferences(saved:unknown,browser='it',legacy:string|null=null){const data=saved&&typeof saved==='object'?saved as Partial<LanguageChoices>:{};const fallback=validLanguageChoice(legacy)?legacy:'auto';const choices={interface:validLanguageChoice(data.interface)?data.interface:fallback,content:validLanguageChoice(data.content,true)?data.content:fallback};const auto=normalizeLanguage(browser)||'it';return {...choices,interfaceLanguage:choices.interface==='auto'?auto:normalizeLanguage(choices.interface),contentLanguage:choices.content==='auto'||choices.content==='original'?auto:normalizeLanguage(choices.content),original:choices.content==='original'};}

/** Apply a reading mode without replacing the reader's chosen interface language. */
export function readingModePreferences(current:LanguageChoices,mode:'original'|'translated'):LanguageChoices {
 return {interface:current.interface,content:mode==='original'?'original':current.interface};
}
