/** Only the server may produce this claim after checking the linked provider account. */
export type SocialIdentity={provider:'discord'|'facebook';subject:string;name:string;url:string};
export const SOCIAL_NAMES={discord:'Discord',facebook:'Facebook'} as const;
export function validSocialIdentity(value:SocialIdentity|null|undefined):value is SocialIdentity{
 return Boolean(value&&Object.hasOwn(SOCIAL_NAMES,value.provider)&&/^[0-9]{3,64}$/.test(value.subject)&&value.name.trim().length>0&&value.name.length<=120&&value.url===(value.provider==='discord'?'https://discord.com/users/':'https://www.facebook.com/app_scoped_user_id/')+value.subject);
}
