const MAX_REFERENCE_LENGTH=500;
const reservedSuffixes=['.localhost','.local','.internal','.test','.invalid'];

/**
 * Validate and canonicalize the public link declared by a PR2 applicant.
 * The server stores this value but never fetches, previews or proxies it.
 */
export function normalizeApplicantReferenceUrl(value:unknown):string|null{
 if(typeof value!=='string'||value!==value.trim()||!value||value.length>MAX_REFERENCE_LENGTH)return null;
 let url:URL;try{url=new URL(value);}catch{return null;}
 const hostname=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.href.length>MAX_REFERENCE_LENGTH)return null;
 if(!hostname.includes('.')||hostname.includes(':')||/^\d+(?:\.\d+){3}$/.test(hostname)||reservedSuffixes.some(suffix=>hostname===suffix.slice(1)||hostname.endsWith(suffix)))return null;
 const labels=hostname.split('.');
 if(labels.some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))return null;
 return url.href;
}

export function isApplicantReferenceUrl(value:unknown):value is string{return normalizeApplicantReferenceUrl(value)!==null;}
