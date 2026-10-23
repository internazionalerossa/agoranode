import {defineConfig,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {copyFile,mkdir,readFile} from 'node:fs/promises';

/**
 * Static Render deployments do not rewrite arbitrary routes to index.html.
 * Build actual index documents at the known paths, so a direct visit, refresh,
 * or a copied link never relies on a dashboard-only redirect rule.
 *
 * The preview is public and has no authentication or writable backend.
 */
function staticPreviewPages():Plugin {
 return {
  name:'agoranode-static-preview-pages',
  apply:'build',
  async writeBundle(options) {
   if(process.env.VITE_PUBLIC_PREVIEW!=='true')return;
   const outDir=options.dir;
   if(!outDir)throw Error('Static preview output directory is required');
   const index=join(outDir,'index.html');
   await readFile(index,'utf8'); // fail build rather than publishing broken links
   const known=['agora','polisrossa','polisrossa/read','polisrossa/account','account','read'];
   for(const route of known){
    const directory=join(outDir,...route.split('/'));
    await mkdir(directory,{recursive:true});
    await copyFile(index,join(directory,'index.html'));
   }
  },
 };
}
export default defineConfig({
 root:fileURLToPath(new URL('.',import.meta.url)),
 publicDir:fileURLToPath(new URL('../public',import.meta.url)),
 plugins:[react(),staticPreviewPages()],
 resolve:{alias:{'@':fileURLToPath(new URL('..',import.meta.url))}},
 server:{proxy:{'/api':'http://127.0.0.1:8000'}},
});
