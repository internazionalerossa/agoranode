export const PUBLIC_DEVICE_KEYS=['rassegna-rossa.feed-cache','rassegna-rossa.pulse-cache','rassegna-rossa.video-cache','rassegna-rossa.translations'] as const;
/** Never delete saved readings, unsynced changes, credentials or other apps' caches. */
export async function clearPublicDeviceCache(storage:Pick<Storage,'removeItem'>,cacheStorage?:Pick<CacheStorage,'keys'|'delete'>){
 for(const key of PUBLIC_DEVICE_KEYS)storage.removeItem(key);
 if(cacheStorage)await Promise.all((await cacheStorage.keys()).filter(key=>key.startsWith('polisrossa-public-')).map(key=>cacheStorage.delete(key)));
}
