/** Only the server may produce this PR2 claim after checking the linked Facebook account. */
export type SocialIdentity={provider:'facebook';subject:string;name:string;url:string};
export const SOCIAL_NAMES={discord:'Discord',facebook:'Facebook'} as const;
/** App-scoped account reference; Meta does not guarantee it is a public profile page. */
export function isFacebookAccountReference(value:string){return /^https:\/\/www\.facebook\.com\/app_scoped_user_id\/[0-9]{3,64}$/.test(value);}
export function validSocialIdentity(value:unknown):value is SocialIdentity{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const identity=value as Record<string,unknown>;
 return identity.provider==='facebook'&&typeof identity.subject==='string'&&/^[0-9]{3,64}$/.test(identity.subject)&&typeof identity.name==='string'&&identity.name.trim().length>0&&identity.name.length<=120&&typeof identity.url==='string'&&identity.url==='https://www.facebook.com/app_scoped_user_id/'+identity.subject&&isFacebookAccountReference(identity.url);
}
