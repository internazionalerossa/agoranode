import {createRoot} from 'react-dom/client';
import {lazy,Suspense} from 'react';
import {AggregatorApp} from '../app/components/AggregatorApp';
import '../app/globals.css';
import MirrorNotice from '../app/components/MirrorNotice';
const BookReader=lazy(()=>import('../app/components/BookReader').then(m=>({default:m.BookReader})));
const Account=lazy(()=>import('../app/components/AccountView'));
const path=location.pathname;
createRoot(document.getElementById('root')!).render(<><MirrorNotice/><Suspense fallback={<main role="status">Caricamento…</main>}>{path==='/read'?<BookReader/>:path==='/account'?<Account/>:<AggregatorApp/>}</Suspense></>);
