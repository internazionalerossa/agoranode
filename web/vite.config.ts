import {defineConfig,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {mkdir,copyFile} from 'node:fs/promises';

/**
 * Render's static preview must serve real deep links even when the CDN does
 * not apply the _redirects fallback. These are HTML entrypoints only: all
 * scripts/chunks remain shared and resolved from /assets/.
 */
function staticPreviewEntrypoints():Plugin {
 let output='';
 return {
  name:'agoranode-static-preview-entrypoints',
  apply:'build',
  configResolved(config){output=config.build.outDir;},
  async closeBundle(){
   if(process.env.VITE_PUBLIC_PREVIEW!=='true')return;
   if(!output)throw Error('Missing preview output directory');
   const root=resolve(output);
   for(const slug of ['agora','polisrossa','account','read']){
    const folder=join(root,slug);
    await mkdir(folder,{recursive:true});
    await copyFile(join(root,'index.html'),join(folder,'index.html'));
   }
   for(const sub of ['read','account']){
    const folder=join(root,'polisrossa',sub);
    await mkdir(folder,{recursive:true});
    await copyFile(join(root,'index.html'),join(folder,'index.html'));
   }
  },
 };
}
export default defineConfig({
 root:fileURLToPath(new URL('.',import.meta.url)),
 publicDir:fileURLToPath(new URL('../public',import.meta.url)),
 plugins:[react(),staticPreviewEntrypoints()],
 resolve:{alias:{'@':fileURLToPath(new URL('..',import.meta.url))}},
 server:{proxy:{'/api':'http://127.0.0.1:8000'}},
});