/** A return path is a same-origin navigation target, never a host, scheme or API endpoint. */
export function accountReturnPath(value:string|null,origin:string):string|null{
 if(!value||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f\u007f]/u.test(value))return null;
 try{const url=new URL(value,origin);if(url.origin!==origin||url.pathname.startsWith('/auth/')||url.pathname.startsWith('/api/'))return null;return url.pathname+url.search+url.hash;}catch{return null;}
}
