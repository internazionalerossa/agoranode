import {defineConfig,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {copyFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';

const repositoryRoot=fileURLToPath(new URL('..',import.meta.url));
const webRoot=fileURLToPath(new URL('.',import.meta.url));
/**
 * Render's static preview does not honor the /_redirects SPA fallback.
 * Materialize actual entry files for each known public route. This changes
 * only the static preview build; the real Node server still owns API/auth.
 *
 * Both /agora.html and /agora/index.html are written because static hosting
 * implementations vary between clean-URL rewriting and directory redirects.
 */
function staticPreviewEntries():Plugin{
 return {name:'agoranode-static-preview-routes',apply:'build',
  async closeBundle(){
   if(process.env.VITE_PUBLIC_PREVIEW!=='true')return;
   const out=resolve(repositoryRoot,'dist-preview');
   const paths=['agora','polisrossa','polisrossa/read','polisrossa/account','account','read'];
   for(const path of paths){
    const directory=resolve(out,path);
    await mkdir(directory,{recursive:true});
    await copyFile(resolve(out,'index.html'),resolve(directory,'index.html'));
    const cleanFile=resolve(out,path+'.html');
    await mkdir(dirname(cleanFile),{recursive:true});
    await copyFile(resolve(out,'index.html'),cleanFile);
   }
  },
 };
}
export default defineConfig({
 root:webRoot,
 publicDir:fileURLToPath(new URL('../public',import.meta.url)),
 plugins:[react(),staticPreviewEntries()],
 resolve:{alias:{'@':repositoryRoot}},
 server:{proxy:{'/api':'http://127.0.0.1:8000'}},
});
