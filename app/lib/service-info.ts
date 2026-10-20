export type PublicOperator={name:string;contact:string};
/** Only explicitly configured public contact fields; never spread process.env or provider objects. */
export function publicOperator(env:Record<string,string|undefined>):PublicOperator|null{
 const name=env.PUBLIC_OPERATOR_NAME?.trim(),contact=env.PUBLIC_PRIVACY_CONTACT?.trim();
 return name&&name.length<=200&&contact&&contact.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contact)?{name,contact}:null;
}
export function serviceInfoResponse(request:Request,operator:PublicOperator|null=null,accountsEnabled=false,communityEnabled=false,mirror=false){
 const headers={'cache-control':'private, no-store'};
 return request.method==='GET'?Response.json({operator,accountsEnabled,communityEnabled,mirror},{headers}):Response.json({error:'Method not allowed'},{status:405,headers});
}
