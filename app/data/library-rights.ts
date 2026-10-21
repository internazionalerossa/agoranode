export type LibraryStorageRight={
 bookId:string;
 language:string;
 catalogUrl:string;
 licenseSpdx:string;
 licenseUrl:string;
 rightsStatementUrl:string;
 attribution:string;
 reviewedAt:string;
 allowPersistentCopy:true;
 allowPublicReading:true;
};

// Public, source-controlled allow-list shared by the catalogue UI and the
// server. It contains no credentials. An edition absent from this list stays
// on its original archive and is never copied or served by PolisRossa.
export const LIBRARY_STORAGE_RIGHTS:readonly LibraryStorageRight[]=[{
 bookId:'commons-viventi',
 language:'en',
 catalogUrl:'https://freefairandalive.org/read-it/',
 licenseSpdx:'CC-BY-SA-4.0',
 licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
 rightsStatementUrl:'https://www.boell.de/en/2019/09/06/free-fair-and-alive-insurgent-power-commons',
 attribution:'Free, Fair and Alive: The Insurgent Power of the Commons — David Bollier e Silke Helfrich, 2019, CC BY-SA 4.0. Testo estratto e reimpaginato automaticamente da PolisRossa; fonte originale collegata in ogni capitolo.',
 reviewedAt:'2026-10-21',
 allowPersistentCopy:true,
 allowPublicReading:true,
}];

export function libraryStorageRight(bookId:string,language:string){
 return LIBRARY_STORAGE_RIGHTS.find(right=>right.bookId===bookId&&right.language===language)??null;
}
