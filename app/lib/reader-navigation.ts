/** Give a modal one browser-history entry, so Android Back closes it first. */
export function attachReaderNavigation(dialog: HTMLDialogElement, onDismiss: () => void, host: Window = window) {
 const previousState = host.history.state;
 const marker = 'polisrossaReader';
 const token = `${Date.now()}-${Math.random()}`;
 const previousOverflow = host.document.body.style.overflow;
 let disposed = false;
 const cleanup = () => {
  if (disposed) return;
  disposed = true;
  host.removeEventListener('popstate', back);
  dialog.removeEventListener('close', close);
  host.document.body.style.overflow = previousOverflow;
 };
 const dismiss = () => { cleanup(); if (dialog.open) dialog.close(); onDismiss(); };
 const back = () => { if (host.history.state?.[marker] !== token) dismiss(); };
 const close = () => {
  const ownsEntry = host.history.state?.[marker] === token;
  dismiss();
  if (ownsEntry) host.history.back();
 };
 host.history.pushState({...previousState, [marker]: token}, '');
 host.document.body.style.overflow = 'hidden';
 host.addEventListener('popstate', back);
 dialog.addEventListener('close', close);
 dialog.showModal();
 return () => {
  cleanup();
  if (dialog.open) dialog.close();
  if (host.history.state?.[marker] === token) host.history.replaceState(previousState, '');
 };
}
