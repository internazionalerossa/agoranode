import type {TheoryCard} from '../data/library';
import {libraryStorageRight} from '../data/library-rights';

export type LibraryReadingDestination={
 edition:NonNullable<TheoryCard['editions']>[number];
 href:string;
 internal:boolean;
};

export function libraryReadingDestination(book:TheoryCard,preferredLanguage:string):LibraryReadingDestination|null{
 const edition=book.editions?.find(item=>item.language===preferredLanguage)
  ??book.editions?.find(item=>item.language==='en')
  ??book.editions?.[0];
 if(!edition)return null;
 const right=libraryStorageRight(book.id,edition.language);
 const internal=Boolean(right?.allowPublicReading&&right.catalogUrl===edition.url);
 return {
  edition,
  internal,
  href:internal?`/read?${new URLSearchParams({book:book.id,edition:edition.language})}`:edition.url,
 };
}
