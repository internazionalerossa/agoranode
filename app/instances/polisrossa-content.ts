import HISTORY from '../data/history-index.json' with {type:'json'};
import {THEORY_LIBRARY} from '../data/library';
import {historyLink} from '../lib/history-navigation';
import type {NodeContentItem} from '../lib/node-content-search';

/**
 * Read-only bootstrap search catalog for PolisRossa. It indexes metadata that
 * already exists in the repository; it neither invents locally hosted book
 * files nor treats external editions as legally redistributable.
 */
export const POLISROSSA_CONTENT: readonly NodeContentItem[] = [
  ...HISTORY.map(event=>({
    spaceId:'polisrossa',
    kind:'timeline' as const,
    id:event.id,
    title:event.title,
    summary:event.deck,
    href:historyLink(event.id),
    tags:[event.country,event.period],
  })),
  ...THEORY_LIBRARY.map(book=>({
    spaceId:'polisrossa',
    kind:'book' as const,
    id:book.id,
    title:book.title,
    summary:book.summary,
    // Existing library supports an indexed list; deep book detail pages
    // and media download require a later dedicated implementation.
    href:'/polisrossa?view=teoria&percorso=libri',
    tags:[book.author,book.lane,...book.tags],
  })),
];
