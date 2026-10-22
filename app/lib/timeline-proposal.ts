/**
 * Light, purely client-side bridge from narrative editing to the existing
 * authenticated forum proposal composer. This does NOT publish a revision,
 * assert PR2 status, or bypass voting. No draft is sent to a third party.
 */
export type TimelineProposalIntent={
  title:string;
  body:string;
  references:string;
};
const MAX_TITLE=140,MAX_BODY=4000,MAX_REFERENCES=1000;
export function timelineProposalLink(intent:TimelineProposalIntent,spaceId='polisrossa'):string{
  if(spaceId!=='polisrossa')throw Error('Timeline proposal composer not deployed for this node');
  if(intent.title.trim().length<3||intent.title.length>MAX_TITLE||
     intent.body.trim().length<20||intent.body.length>MAX_BODY||
     intent.references.length>MAX_REFERENCES)throw Error('Invalid timeline proposal draft');
  const query=new URLSearchParams({
    view:'partecipa',nuova:'proposta',
    timelineDraft:'v1',
    title:intent.title,
    description:intent.body,
    references:intent.references,
  });
  const result='/polisrossa?'+query;
  if(result.length>6500)throw Error('Timeline draft URL exceeds browser budget');
  return result;
}
/**
 * A public URL pre-fills a form but never grants author/edit/vote privileges.
 * Credentials, account identity and actual signed decisions are never encoded.
 */
export function timelineProposalFromUrl(raw:string):TimelineProposalIntent|null{
  const url=new URL(raw,'https://site.invalid');
  if(url.pathname!=='/polisrossa'||url.searchParams.get('view')!=='partecipa'||
     url.searchParams.get('nuova')!=='proposta'||url.searchParams.get('timelineDraft')!=='v1')return null;
  for(const name of ['title','description','references','timelineDraft'])
    if(url.searchParams.getAll(name).length!==1)return null;
  const intent={
    title:url.searchParams.get('title')??'',
    body:url.searchParams.get('description')??'',
    references:url.searchParams.get('references')??'',
  };
  try {timelineProposalLink(intent);return intent;}catch {return null;}
}
